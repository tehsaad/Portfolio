/**
 * game.js
 * ---------------------------------------------------------------------------
 * The orchestrator: owns the state machine, the loop, collisions, scoring,
 * modes and levels. Everything else (snake, food, input, audio, UI, storage)
 * is a service it calls.
 *
 * The loop is TIME-BASED. requestAnimationFrame drives rendering, but the
 * snake only advances when enough milliseconds have accumulated.
 */

const SNAKE_API_URL =
  'https://tehsaad-portfolio-api.srizwan-bscs26seecs.workers.dev';


(function (global) {
  'use strict';

  var NS = global.SnakeGame;
  var STATE = NS.STATE;
  var CONFIG = NS.CONFIG;
  var TYPES = NS.FOOD_TYPE;
  var THEME = NS.THEME;


  /* ========================================================================
     API HELPERS
     ======================================================================== */

  async function registerSnakePlayer(name, email) {
    try {
      const response = await fetch(
        SNAKE_API_URL + '/api/snake/player',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: name,
            email: email
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Unable to register player.'
        );
      }

      return result.player;

    } catch (error) {
      console.error(
        'Snake player API error:',
        error
      );

      throw error;
    }
  }


  /* ========================================================================
     GAME
     ======================================================================== */

  function Game(root, options) {
    this.root = root;
    this.options = options || {};

    this.cols = CONFIG.grid.cols;
    this.rows = CONFIG.grid.rows;

    this.player = null;

    this.storage = new NS.StorageManager();
    this.settings = this.storage.loadSettings();

    var selection = this.storage.loadSelection();
    this.mode = selection.mode;
    this.difficulty = selection.difficulty;

    this.snake = new NS.Snake();
    this.foods = new NS.FoodManager();
    this.effects = new NS.Effects();
    this.attract = null;

    this.obstacles = [];
    this.obstacleSet = {};

    this.state = STATE.MENU;
    this.previousScreen = 'menu';
    this.pendingResize = true;
    this.running = false;

    /*
     * Backend game/session state.
     *
     * A play is counted by the backend when /api/snake/game/start
     * succeeds, not when a score is submitted.
     */
    this.gameStartedOnServer = false;
    this.serverGameId = null;

    this.resetRunState();
  }


  Game.prototype.resetRunState = function () {
    this.score = 0;
    this.level = 1;
    this.levelTarget = 0;
    this.levelName = '';
    this.foodEaten = 0;
    this.foodInLevel = 0;

    this.speed = 9;
    this.timeLeft = 0;

    this.accumulator = 0;
    this.alpha = 0;

    this.countdown = 0;
    this.countdownLabel = '';

    this.deathTimer = 0;
    this.deathReason = '';

    this.hudTimer = 0;

    this.active = {
      slow: 0,
      double: 0
    };

    this.gameStartedOnServer = false;
    this.serverGameId = null;
  };


  /* ========================================================================
     PLAYER RESTORE
     ======================================================================== */

  Game.prototype.restorePlayer = function () {
    try {
      var saved = localStorage.getItem('snakePlayer');

      if (!saved) {
        return false;
      }

      var player = JSON.parse(saved);

      if (
        !player ||
        !player.id ||
        !player.name ||
        !player.email
      ) {
        localStorage.removeItem('snakePlayer');
        return false;
      }

      this.player = {
        id: player.id,
        name: player.name,
        email: player.email,
        best_score: Number(player.best_score) || 0,
        plays_count: Number(player.plays_count) || 0
      };

      return true;

    } catch (error) {
      console.error(
        'Unable to restore Snake player:',
        error
      );

      localStorage.removeItem('snakePlayer');
      return false;
    }
  };


  /* ========================================================================
     SETUP
     ======================================================================== */

  Game.prototype.init = function () {
    var self = this;

    this.ui = new NS.UIManager(this.root);
    var refs = this.ui.build();

    this.renderer = new NS.Renderer(
      refs.canvas,
      this.cols,
      this.rows
    );

    this.audio = new NS.AudioManager({
      basePath: this.options.basePath || ''
    });

    this.attract = new NS.Attract(
      this.cols,
      this.rows
    );

    this.input = new NS.InputManager(
      this.root,
      {
        onDirection: function (name) {
          self.handleDirection(name);
        },

        onAction: function (name) {
          self.handleShortcut(name);
        },

        isActive: function () {
          return (
            self.state === STATE.PLAYING ||
            self.state === STATE.COUNTDOWN ||
            self.state === STATE.PAUSED
          );
        },

        canSwipe: function () {
          return (
            self.state === STATE.PLAYING ||
            self.state === STATE.COUNTDOWN
          );
        }
      }
    );

    this.input.attach(
      refs.stage
    );

    this.ui.onAction = function (action, data) {
      self.handleAction(action, data);
    };

    this.ui.onSettingChange = function (key, value) {
      self.changeSetting(key, value);
    };


    // First run: respect operating-system reduced-motion preference.
    if (global.matchMedia) {
      var query = global.matchMedia(
        '(prefers-reduced-motion: reduce)'
      );

      if (
        query.matches &&
        !this.storage.readRaw('snakeGame.v1.settings')
      ) {
        this.settings.reducedMotion = true;
      }
    }


    // Unlock Web Audio on the first real user gesture (browsers/iOS require it).
    var unlockEvents = ['pointerdown', 'touchstart', 'keydown'];
    var unlockAudio = function () {
      self.audio.unlock();

      if (
        self.settings.music &&
        (
          self.state === STATE.PLAYING ||
          self.state === STATE.COUNTDOWN
        )
      ) {
        self.audio.startMusic();
      }

      unlockEvents.forEach(function (name) {
        global.removeEventListener(name, unlockAudio, true);
      });
    };

    unlockEvents.forEach(function (name) {
      global.addEventListener(name, unlockAudio, true);
    });


    this.observeResize(refs.stage);

    global.addEventListener(
      'orientationchange',
      function () {
        self.pendingResize = true;
      }
    );


    document.addEventListener(
      'visibilitychange',
      function () {
        if (
          document.hidden &&
          (
            self.state === STATE.PLAYING ||
            self.state === STATE.COUNTDOWN
          )
        ) {
          self.pause();
        }
      }
    );


    this.applySettings();

    this.ui.syncSettings(
      this.settings
    );

    this.ui.markSelected(
      'mode',
      this.mode
    );

    this.ui.markSelected(
      'difficulty',
      this.difficulty
    );

    this.refreshMenu();

    this.ui.setState(this.state);
    this.ui.showScreen('menu');

    this.renderer.resize(true);

    this.start();

    return this;
  };


  Game.prototype.observeResize = function (stage) {
    var self = this;

    if (global.ResizeObserver) {
      this.resizeObserver =
        new global.ResizeObserver(
          function () {
            self.pendingResize = true;
          }
        );

      this.resizeObserver.observe(stage);

    } else {
      this.onWindowResize = function () {
        self.pendingResize = true;
      };

      global.addEventListener(
        'resize',
        this.onWindowResize
      );
    }
  };


  Game.prototype.start = function () {
    if (this.running) return;

    var self = this;

    this.running = true;
    this.lastFrame = 0;

    this.frame = function (timestamp) {
      if (!self.running) return;

      self.rafId =
        global.requestAnimationFrame(
          self.frame
        );

      self.tick(timestamp);
    };

    this.rafId =
      global.requestAnimationFrame(
        this.frame
      );
  };


  /** Stops the loop and removes listeners. */
  Game.prototype.destroy = function () {
    this.running = false;

    if (this.rafId) {
      global.cancelAnimationFrame(
        this.rafId
      );
    }

    if (this.input) {
      this.input.detach();
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.onWindowResize) {
      global.removeEventListener(
        'resize',
        this.onWindowResize
      );
    }

    if (this.audio) {
      this.audio.stopMusic();
    }

    this.root.innerHTML = '';
  };


  /* ========================================================================
     LOOP
     ======================================================================== */

  Game.prototype.tick = function (timestamp) {
    if (!this.lastFrame) {
      this.lastFrame = timestamp;
    }

    var dt =
      (timestamp - this.lastFrame) / 1000;

    this.lastFrame = timestamp;

    if (!isFinite(dt) || dt < 0) {
      dt = 0;
    }

    if (
      dt >
      CONFIG.loop.maxFrameSeconds
    ) {
      dt = CONFIG.loop.maxFrameSeconds;
    }

    this.update(dt);
    this.render();
  };


  Game.prototype.update = function (dt) {
    this.effects.update(dt);

    switch (this.state) {

      case STATE.MENU:
        this.attract.update(dt);
        break;


      case STATE.COUNTDOWN:
        this.countdown -= dt;

        if (this.countdown <= 0) {
          this.countdown = 0;
          this.state = STATE.PLAYING;
          this.accumulator = 0;
          this.ui.setState(this.state);
        }

        break;


      case STATE.PLAYING:
        this.updatePlaying(dt);
        break;


      case STATE.DYING:
        this.deathTimer -= dt;

        if (this.deathTimer <= 0) {
          this.finishGameOver();
        }

        break;


      default:
        // PAUSED and GAME_OVER freeze everything.
        break;
    }
  };


  Game.prototype.updatePlaying = function (dt) {
    var mode = NS.MODES[this.mode];

    if (mode.timer) {
      this.timeLeft -= dt;

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.die('time');
        return;
      }
    }

    if (this.active.slow > 0) {
      this.active.slow =
        Math.max(
          0,
          this.active.slow - dt
        );
    }

    if (this.active.double > 0) {
      this.active.double =
        Math.max(
          0,
          this.active.double - dt
        );
    }

    this.foods.update(dt);

    this.accumulator += dt * 1000;

    var steps = 0;

    while (
      this.state === STATE.PLAYING &&
      steps < CONFIG.loop.maxStepsPerFrame
    ) {
      var interval =
        1000 / this.effectiveSpeed();

      if (this.accumulator < interval) {
        break;
      }

      this.accumulator -= interval;

      this.step();

      steps++;
    }

    this.alpha =
      Math.min(
        1,
        this.accumulator /
        (1000 / this.effectiveSpeed())
      );

    this.hudTimer += dt;

    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      this.updateHud();
    }
  };


  Game.prototype.effectiveSpeed = function () {
    var speed = this.speed;

    if (this.active.slow > 0) {
      speed *= CONFIG.powerups.slowFactor;
    }

    return Math.max(1, speed);
  };


  Game.prototype.render = function () {
    if (this.pendingResize) {
      this.renderer.resize(true);
      this.pendingResize = false;
    }

    if (this.state === STATE.MENU) {
      this.renderer.render({
        snake: this.attract.snake,
        foods: this.attract.foods,
        obstacles: [],
        effects: this.effects,
        alpha: this.attract.alpha,
        dim: true
      });

      return;
    }

    this.renderer.render({
      snake: this.snake,
      foods: this.foods,
      obstacles: this.obstacles,
      effects: this.effects,

      alpha:
        this.state === STATE.PLAYING
          ? this.alpha
          : (
              this.state === STATE.DYING
                ? 1
                : this.alpha
            ),

      dying:
        this.state === STATE.DYING,

      dim:
        this.state === STATE.PAUSED ||
        this.state === STATE.GAME_OVER,

      countdown:
        this.state === STATE.COUNTDOWN
          ? this.countdown
          : 0,

      countdownLabel:
        this.countdownLabel
    });
  };


  /* ========================================================================
     START RUN
     ======================================================================== */

  Game.prototype.startRun = async function () {
    var diff = NS.DIFFICULTIES[this.difficulty];
    var mode = NS.MODES[this.mode];

    this.resetRunState();

    this.speed = diff.startSpeed;

    this.timeLeft =
      mode.timer
        ? diff.timedSeconds
        : 0;

    this.buildBoard(1);
    this.resetSnake();

    this.foods.clear();
    this.effects.clear();

    this.spawnNormalFood();

    this.state = STATE.COUNTDOWN;

    this.countdown =
      CONFIG.countdown.start;

    this.countdownLabel =
      mode.levels
        ? this.levelName
        : mode.label;

    this.ui.setState(this.state);
    this.ui.setPlaying(true);
    this.ui.showScreen(null);
    this.ui.setPauseLabel('Pause');

    this.ui.setMeta(
      mode.label +
      ' · ' +
      diff.label
    );

    this.updateHud();

    this.audio.unlock();

    if (this.settings.music) {
      this.audio.startMusic();
    }

    this.ui.announce(
      mode.label +
      ' on ' +
      diff.label +
      '. Good luck.'
    );


    /*
     * Tell the backend that a real game has started.
     *
     * This is intentionally called here instead of finishGameOver().
     * Therefore:
     *
     * Page opened        = 0 plays
     * Settings viewed    = 0 plays
     * Player registered  = 0 plays
     * Actual game starts  = +1 play
     */
    await this.startSnakeGame();
  };


  /* ========================================================================
     BACKEND GAME START
     ======================================================================== */

  Game.prototype.startSnakeGame = async function () {
    if (!this.player) {
      return false;
    }

    try {
      var response = await fetch(
        SNAKE_API_URL +
        '/api/snake/game/start',
        {
          method: 'POST',

          /*
           * Required because the backend identifies the player
           * through the HttpOnly snake_session cookie.
           */
          credentials: 'include',

          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },

          body: JSON.stringify({
            mode: this.mode,
            difficulty: this.difficulty
          })
        }
      );

      var result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        console.error(
          'Snake game start failed:',
          result.error ||
          'Unknown error'
        );

        this.gameStartedOnServer = false;
        return false;
      }


      this.gameStartedOnServer = true;

      /*
       * If backend returns a game/run ID, keep it.
       * This allows the score endpoint to associate
       * the score with the actual game session.
       */
      this.serverGameId =
        result.game_id ||
        result.gameId ||
        result.game?.id ||
        null;


      if (result.player) {
        this.player.best_score =
          Number(
            result.player.best_score
          ) || 0;

        this.player.plays_count =
          Number(
            result.player.plays_count
          ) || 0;

        localStorage.setItem(
          'snakePlayer',
          JSON.stringify(this.player)
        );
      }

      console.log(
        'Snake game started:',
        result
      );

      return true;

    } catch (error) {
      console.error(
        'Snake game start API error:',
        error
      );

      this.gameStartedOnServer = false;

      return false;
    }
  };


  Game.prototype.resetSnake = function () {
    var spawn =
      NS.Levels.spawnPoint(
        this.cols,
        this.rows
      );

    this.snake.reset(
      spawn.x,
      spawn.y,
      CONFIG.snake.startLength,
      CONFIG.snake.startDirection
    );
  };


  Game.prototype.buildBoard = function (level) {
    var mode = NS.MODES[this.mode];
    var diff = NS.DIFFICULTIES[this.difficulty];

    if (mode.levels) {
      var info =
        NS.Levels.getLevel(level);

      var built =
        NS.Levels.build(
          info.layout,
          this.cols,
          this.rows,
          info.seed,
          diff.obstacleScale *
          info.scale
        );

      this.obstacles = built.cells;
      this.obstacleSet = built.set;

      this.levelTarget = info.target;

      this.levelName =
        'Level ' +
        info.number +
        ' — ' +
        info.name;

    } else {
      this.obstacles = [];
      this.obstacleSet = {};
      this.levelTarget = 0;
      this.levelName = '';
    }
  };


  Game.prototype.isBlocked = function (x, y) {
    if (
      this.obstacleSet[
        NS.Levels.key(x, y)
      ]
    ) {
      return true;
    }

    return this.snake.occupies(
      x,
      y,
      false
    );
  };


  Game.prototype.spawnNormalFood = function () {
    var self = this;

    var item =
      this.foods.spawn(
        TYPES.NORMAL,
        this.cols,
        this.rows,

        function (x, y) {
          return self.isBlocked(x, y);
        },

        {}
      );

    if (!item) {
      this.die('cleared');
    }

    return item;
  };


  Game.prototype.maybeSpawnExtras = function () {
    var self = this;

    var cfg = CONFIG.food;

    var blocked = function (x, y) {
      return self.isBlocked(x, y);
    };


    if (
      !this.foods.has(TYPES.BONUS) &&
      this.score >= cfg.bonusMinScore &&
      Math.random() < cfg.bonusChance
    ) {
      this.foods.spawn(
        TYPES.BONUS,
        this.cols,
        this.rows,
        blocked,
        {
          lifetime: cfg.bonusLifetime
        }
      );
    }


    if (
      !this.foods.has(TYPES.SPECIAL) &&
      this.score >= cfg.specialMinScore &&
      Math.random() < cfg.specialChance
    ) {
      var effect =
        Math.random() < 0.5
          ? NS.EFFECT.SLOW
          : NS.EFFECT.DOUBLE;

      this.foods.spawn(
        TYPES.SPECIAL,
        this.cols,
        this.rows,
        blocked,
        {
          lifetime:
            cfg.specialLifetime,

          effect: effect
        }
      );
    }
  };


  /* ========================================================================
     STEPPING
     ======================================================================== */

  Game.prototype.step = function () {
    var head = this.snake.step();

    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= this.cols ||
      head.y >= this.rows
    ) {
      this.die('wall');
      return;
    }

    if (
      this.obstacleSet[
        NS.Levels.key(head.x, head.y)
      ]
    ) {
      this.die('obstacle');
      return;
    }

    if (this.snake.hitsSelf()) {
      this.die('self');
      return;
    }

    var item =
      this.foods.at(
        head.x,
        head.y
      );

    if (item) {
      this.eat(item, head);
    }
  };


  Game.prototype.eat = function (item, head) {
    var mode = NS.MODES[this.mode];
    var diff = NS.DIFFICULTIES[this.difficulty];

    this.foods.remove(item);

    var multiplier =
      diff.scoreMultiplier *
      (
        this.active.double > 0
          ? 2
          : 1
      );

    var gained =
      Math.round(
        NS.FoodManager.baseScore(
          item.type
        ) * multiplier
      );

    this.score += gained;

    this.foodEaten++;

    this.snake.grow(
      NS.FoodManager.growth(
        item.type
      )
    );


    var color =
      item.type === TYPES.BONUS
        ? THEME.bonus
        : item.type === TYPES.SPECIAL
          ? THEME.special
          : THEME.foodNormal;


    this.effects.burst(
      head.x,
      head.y,
      color,
      CONFIG.particles.perFood
    );

    this.effects.floatText(
      head.x,
      head.y - 0.7,
      '+' + gained,
      color
    );

    this.effects.addShake(
      CONFIG.shake.food
    );

    this.audio.play(
      item.type === TYPES.NORMAL
        ? 'eat'
        : 'bonus'
    );


    if (
      item.type === TYPES.SPECIAL &&
      item.effect
    ) {
      this.applyEffect(
        item.effect,
        head
      );
    }


    if (
      item.type === TYPES.BONUS &&
      mode.timer
    ) {
      this.timeLeft +=
        CONFIG.timed.bonusFoodSeconds;

      this.effects.floatText(
        head.x,
        head.y - 1.5,
        '+' +
        CONFIG.timed.bonusFoodSeconds +
        's',
        THEME.bonus
      );
    }


    if (mode.speedRamp) {
      var ceiling =
        mode.growObstacles
          ? diff.maxSpeed + 6
          : diff.maxSpeed;

      this.speed =
        Math.min(
          ceiling,
          this.speed +
          diff.speedPerFood
        );
    }


    if (
      mode.growObstacles &&
      this.foodEaten %
        CONFIG.endless.obstacleEveryFood ===
        0
    ) {
      this.addRandomObstacle();
    }


    if (item.type === TYPES.NORMAL) {
      this.spawnNormalFood();
    }

    this.maybeSpawnExtras();


    if (mode.levels) {
      this.foodInLevel++;

      if (
        this.foodInLevel >=
        this.levelTarget
      ) {
        this.levelUp();
      }
    }

    this.updateHud();
  };


  Game.prototype.applyEffect = function (effect, head) {
    if (effect === NS.EFFECT.SLOW) {
      this.active.slow =
        CONFIG.powerups.slowDuration;

      this.effects.floatText(
        head.x,
        head.y - 2.2,
        'slow motion',
        THEME.special
      );

      this.ui.announce(
        'Slow motion'
      );

    } else {
      this.active.double =
        CONFIG.powerups.doubleDuration;

      this.effects.floatText(
        head.x,
        head.y - 2.2,
        'double points',
        THEME.special
      );

      this.ui.announce(
        'Double points'
      );
    }
  };


  /* ========================================================================
     OBSTACLES
     ======================================================================== */

  Game.prototype.addRandomObstacle = function () {
    if (
      this.obstacles.length >=
      CONFIG.endless.maxObstacles
    ) {
      return;
    }

    var head = this.snake.head;
    var candidates = [];


    for (
      var y = 1;
      y < this.rows - 1;
      y++
    ) {
      for (
        var x = 1;
        x < this.cols - 1;
        x++
      ) {
        if (this.isBlocked(x, y)) {
          continue;
        }

        if (this.foods.at(x, y)) {
          continue;
        }

        var distance =
          Math.abs(x - head.x) +
          Math.abs(y - head.y);

        if (
          distance <
          CONFIG.endless.minDistanceFromHead
        ) {
          continue;
        }

        candidates.push({
          x: x,
          y: y
        });
      }
    }


    if (!candidates.length) {
      return;
    }


    var cell =
      candidates[
        Math.floor(
          Math.random() *
          candidates.length
        )
      ];


    var k =
      NS.Levels.key(
        cell.x,
        cell.y
      );

    this.obstacleSet[k] = true;


    if (
      !NS.Levels.isPlayable(
        this.cols,
        this.rows,
        this.obstacleSet,
        head,
        0.8
      )
    ) {
      delete this.obstacleSet[k];
      return;
    }


    this.obstacles.push(cell);

    this.effects.burst(
      cell.x,
      cell.y,
      THEME.obstacleEdge,
      8,
      3
    );
  };


  /* ========================================================================
     LEVEL UP
     ======================================================================== */

  Game.prototype.levelUp = function () {
    var diff =
      NS.DIFFICULTIES[
        this.difficulty
      ];

    this.level++;

    this.foodInLevel = 0;

    this.score +=
      CONFIG.scoring.levelClear;

    this.speed =
      Math.min(
        diff.maxSpeed + 6,
        diff.startSpeed +
        (this.level - 1) *
        diff.levelSpeedStep
      );


    this.buildBoard(
      this.level
    );

    this.resetSnake();

    this.foods.clear();

    this.spawnNormalFood();


    this.effects.addShake(
      CONFIG.shake.levelUp
    );

    this.effects.showBanner(
      'LEVEL UP',
      this.levelName,
      CONFIG.countdown.levelUp
    );

    this.audio.play(
      'levelup'
    );

    this.ui.announce(
      'Level ' +
      this.level
    );


    this.state =
      STATE.COUNTDOWN;

    this.countdown =
      CONFIG.countdown.levelUp;

    this.countdownLabel =
      this.levelName;

    this.accumulator = 0;

    this.ui.setState(
      this.state
    );
  };


  /* ========================================================================
     GAME OVER
     ======================================================================== */

  var REASONS = {
    wall: 'You hit the wall.',
    self: 'You ran into yourself.',
    obstacle: 'You hit an obstacle.',
    time: 'Time is up.',
    cleared: 'You filled the entire board.'
  };


  Game.prototype.die = function (reason) {
    if (
      this.state === STATE.DYING ||
      this.state === STATE.GAME_OVER
    ) {
      return;
    }

    this.deathReason = reason;

    this.state = STATE.DYING;

    this.deathTimer =
      CONFIG.death.animationSeconds;

    this.snake.dead = true;

    this.ui.setState(
      this.state
    );


    var segments =
      this.snake.segments;

    for (
      var i = 0;
      i < segments.length;
      i += 2
    ) {
      this.effects.burst(
        segments[i].x,
        segments[i].y,
        THEME.snakeDead,
        4,
        4
      );
    }


    this.effects.addShake(
      CONFIG.shake.death
    );

    this.audio.play(
      'gameover'
    );

    this.audio.stopMusic();
  };


  Game.prototype.finishGameOver = function () {
    this.state = STATE.GAME_OVER;

    this.ui.setState(
      this.state
    );


    var isNewHigh = false;


    if (this.score > 0) {
      isNewHigh =
        this.storage.submitScore(
          this.mode,
          this.difficulty,
          this.score
        );
    }


    if (isNewHigh) {
      this.audio.play(
        'highscore'
      );

      this.effects.showBanner(
        'NEW HIGH SCORE',
        String(this.score),
        2.2
      );
    }


    /*
     * Score is submitted only after a real game finishes.
     *
     * The backend identifies the player through
     * the HttpOnly snake_session cookie.
     */
    if (
      this.player &&
      this.gameStartedOnServer
    ) {
      this.submitPlayerScore(
        this.score
      );
    }


    this.ui.showGameOver({
      score: this.score,

      high:
        this.storage.getHighScore(
          this.mode,
          this.difficulty
        ),

      level: this.level,

      length:
        this.snake.length,

      isNewHigh: isNewHigh,

      reason:
        REASONS[
          this.deathReason
        ] || ''
    });


    this.updateHud();

    this.refreshMenu();


    this.ui.announce(
      'Game over. Score ' +
      this.score +
      '.'
    );
  };


  /* ========================================================================
     SCORE SUBMISSION
     ======================================================================== */

  Game.prototype.submitPlayerScore =
    async function (score) {

      if (!this.player) {
        return;
      }

      try {
        var response =
          await fetch(
            SNAKE_API_URL +
            '/api/snake/score',
            {
              method: 'POST',

              /*
               * Required for the HttpOnly
               * snake_session cookie.
               */
              credentials: 'include',

              headers: {
                'Content-Type':
                  'application/json',

                'Accept':
                  'application/json'
              },

              /*
               * Do NOT send email here.
               *
               * The Worker should identify
               * the player from snake_session.
               */
              body: JSON.stringify({
                score: Number(score) || 0,

                /*
                 * Send game ID only if the backend
                 * supports it.
                 */
                game_id:
                  this.serverGameId
              })
            }
          );


        var result =
          await response.json();


        if (
          !response.ok ||
          !result.success
        ) {
          console.error(
            'Snake score submission failed:',
            result.error ||
            'Unknown error'
          );

          return;
        }


        if (result.player) {
          this.player.best_score =
            Number(
              result.player.best_score
            ) || 0;

          this.player.plays_count =
            Number(
              result.player.plays_count
            ) || 0;

          localStorage.setItem(
            'snakePlayer',
            JSON.stringify(
              this.player
            )
          );
        }


        console.log(
          'Snake score saved:',
          result
        );

      } catch (error) {
        console.error(
          'Snake score API error:',
          error
        );
      }
    };


  /* ========================================================================
     CONTROLS
     ======================================================================== */

  Game.prototype.handleDirection =
    function (name) {
      if (
        this.state !== STATE.PLAYING &&
        this.state !== STATE.COUNTDOWN
      ) {
        return;
      }

      var accepted =
        this.snake.turn(name);

      /*
       * FAST RESPONSE.
       *
       * A turn normally waits for the next fixed game step, which can be a
       * whole step away. If the current step is already well under way, take
       * that step right now so the snake reacts to the finger immediately.
       * (Set CONFIG.input.earlyStepFraction to 0 to switch this off.)
       */
      var fraction =
        CONFIG.input.earlyStepFraction;

      if (
        accepted &&
        fraction > 0 &&
        this.state === STATE.PLAYING &&
        this.snake.queue.length === 1 &&
        this.accumulator >=
          (1000 / this.effectiveSpeed()) * fraction
      ) {
        this.accumulator = 0;
        this.step();
      }
    };


  Game.prototype.handleShortcut =
    function (name) {

      if (name === 'pause') {

        if (
          this.state === STATE.PLAYING ||
          this.state === STATE.COUNTDOWN
        ) {
          this.pause();

        } else if (
          this.state === STATE.PAUSED
        ) {
          this.resume();
        }

        return;
      }


      if (name === 'back') {

        if (
          this.state === STATE.PLAYING ||
          this.state === STATE.COUNTDOWN
        ) {
          this.pause();
          return;
        }


        if (
          this.state === STATE.PAUSED &&
          this.ui.currentScreen !== 'pause'
        ) {
          this.ui.showScreen('pause');
          return;
        }


        if (
          this.state === STATE.MENU &&
          this.ui.currentScreen !== 'menu'
        ) {
          this.ui.showScreen('menu');
        }
      }
    };


  /* ========================================================================
     PLAYER SCREEN
     ======================================================================== */

  Game.prototype.openPlayerScreen =
    function () {
      this.previousScreen =
        this.ui.currentScreen;

      this.ui.clearPlayerError();

      this.ui.showScreen(
        'player'
      );
    };


  Game.prototype.handleAction =
    function (action, data) {

      this.audio.unlock();

      if (action !== 'pause') {
        this.audio.play('click');
      }


      switch (action) {

        case 'play':
          this.openPlayerScreen();
          break;


        case 'play-mode':
          this.setMode(data.mode);
          this.openPlayerScreen();
          break;


        case 'select-mode':
          this.setMode(data.mode);
          this.ui.showScreen('menu');
          break;


        case 'player-continue':
          this.continueWithPlayer();
          break;


        case 'player-load':
          this.loadPlayer();
          break;


        case 'select-difficulty':
          this.setDifficulty(
            data.difficulty
          );

          this.ui.showScreen(
            'menu'
          );

          break;


        case 'open-modes':
          this.previousScreen =
            this.ui.currentScreen;

          this.ui.showScreen(
            'modes'
          );

          break;


        case 'open-difficulty':
          this.previousScreen =
            this.ui.currentScreen;

          this.ui.showScreen(
            'difficulty'
          );

          break;


        case 'open-leaderboard':
          this.previousScreen =
            this.ui.currentScreen;

          this.loadLeaderboard();
          break;


        case 'open-settings':
          this.previousScreen =
            this.ui.currentScreen;

          if (
            this.state === STATE.PLAYING ||
            this.state === STATE.COUNTDOWN
          ) {
            this.pause();
            this.previousScreen = 'pause';
          }

          this.ui.syncSettings(
            this.settings
          );

          this.ui.showScreen(
            'settings'
          );

          break;


        case 'open-howto':
          this.previousScreen =
            this.ui.currentScreen;

          this.ui.showScreen(
            'howto'
          );

          break;


        case 'back':
          this.ui.showScreen(
            this.previousScreen === 'pause'
              ? 'pause'
              : 'menu'
          );

          break;


        case 'reset-scores':
          this.storage.clearScores();
          this.refreshMenu();
          this.updateHud();
          this.ui.announce(
            'High scores cleared.'
          );
          break;


        case 'pause':
          if (
            this.state === STATE.PAUSED
          ) {
            this.resume();
          } else {
            this.pause();
          }
          break;


        case 'resume':
          this.resume();
          break;


        case 'restart':
          this.startRun();
          break;


        case 'quit':
          this.quit();
          break;


        default:
          break;
      }
    };


  /* ========================================================================
     PLAYER REGISTRATION
     ======================================================================== */

  Game.prototype.continueWithPlayer =
    async function () {

      var playerData =
        this.ui.getPlayerData();


      if (!playerData.name) {
        this.ui.setPlayerError(
          'Please enter your name.'
        );

        return;
      }


      if (!playerData.email) {
        this.ui.setPlayerError(
          'Please enter your email.'
        );

        return;
      }


      this.ui.clearPlayerError();


      try {

        var result =
          await registerSnakePlayer(
            playerData.name,
            playerData.email
          );


        this.player = {
          id: result.id,
          name: result.name,

          /*
           * Keep email locally for player
           * identification/UI flow.
           *
           * It is NOT sent with score requests.
           */
          email: playerData.email,

          best_score:
            Number(
              result.best_score
            ) || 0,

          plays_count:
            Number(
              result.plays_count
            ) || 0
        };


        localStorage.setItem(
          'snakePlayer',
          JSON.stringify(
            this.player
          )
        );


        /*
         * This starts an actual play and
         * increments plays_count on the server.
         */
        await this.startRun();

      } catch (error) {

        console.error(
          'Player API error:',
          error
        );

        this.ui.setPlayerError(
          'Unable to connect to the server. Please try again.'
        );
      }
    };


  /* ========================================================================
     LOAD EXISTING PLAYER
     ======================================================================== */

  Game.prototype.loadPlayer =
    async function () {

      var playerData =
        this.ui.getPlayerData();


      if (!playerData.email) {
        this.ui.setPlayerError(
          'Enter your email to load your data.'
        );

        return;
      }


      this.ui.clearPlayerError();


      try {

        var response =
          await fetch(
            SNAKE_API_URL +
            '/api/snake/player/lookup',
            {
              method: 'POST',

              /*
               * Backend creates a new
               * snake_session cookie.
               */
              credentials: 'include',

              headers: {
                'Content-Type':
                  'application/json',

                'Accept':
                  'application/json'
              },

              body: JSON.stringify({
                email: playerData.email
              })
            }
          );


        var result =
          await response.json();


        if (
          !response.ok ||
          !result.success
        ) {
          this.ui.setPlayerError(
            result.error ||
            'Player not found.'
          );

          return;
        }


        this.player = {
          id: result.player.id,
          name: result.player.name,
          email: playerData.email,

          best_score:
            Number(
              result.player.best_score
            ) || 0,

          plays_count:
            Number(
              result.player.plays_count
            ) || 0
        };


        localStorage.setItem(
          'snakePlayer',
          JSON.stringify(
            this.player
          )
        );


        this.ui.setPlayerData(
          result.player
        );


        /*
         * Starts a real game and increments
         * plays_count through the backend.
         */
        await this.startRun();

      } catch (error) {

        console.error(
          'Player lookup API error:',
          error
        );

        this.ui.setPlayerError(
          'Unable to connect to the server. Please try again.'
        );
      }
    };


  /* ========================================================================
     LEADERBOARD
     ======================================================================== */

  Game.prototype.loadLeaderboard =
    async function () {

      this.ui.clearLeaderboard();

      this.ui.setLeaderboardLoading(
        true
      );

      this.ui.showScreen(
        'leaderboard'
      );


      try {

        var response =
          await fetch(
            SNAKE_API_URL +
            '/api/snake/leaderboard',
            {
              method: 'GET',

              /*
               * Leaderboard is public, so it
               * does not depend on the cookie.
               */
              headers: {
                'Accept':
                  'application/json'
              }
            }
          );


        var result =
          await response.json();


        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
            'Unable to load leaderboard.'
          );
        }


        this.ui.setLeaderboard(
          result.leaderboard || []
        );


      } catch (error) {

        console.error(
          'Snake leaderboard API error:',
          error
        );


        this.ui.setLeaderboardLoading(
          false
        );


        this.ui.setLeaderboardError(
          'Unable to load leaderboard. Please try again.'
        );
      }
    };


  /* ========================================================================
     MODE / DIFFICULTY
     ======================================================================== */

  Game.prototype.setMode =
    function (id) {

      if (!NS.MODES[id]) {
        return;
      }

      this.mode = id;

      this.storage.saveSelection(
        this.mode,
        this.difficulty
      );

      this.ui.markSelected(
        'mode',
        id
      );

      this.refreshMenu();
    };


  Game.prototype.setDifficulty =
    function (id) {

      if (!NS.DIFFICULTIES[id]) {
        return;
      }

      this.difficulty = id;

      this.storage.saveSelection(
        this.mode,
        this.difficulty
      );

      this.ui.markSelected(
        'difficulty',
        id
      );

      this.refreshMenu();
    };


  /* ========================================================================
     PAUSE / RESUME / QUIT
     ======================================================================== */

  Game.prototype.pause = function () {

    if (
      this.state !== STATE.PLAYING &&
      this.state !== STATE.COUNTDOWN
    ) {
      return;
    }

    this.state = STATE.PAUSED;

    this.ui.setState(
      this.state
    );

    this.ui.setPauseLabel(
      'Resume'
    );

    this.ui.setPauseNote(
      NS.MODES[this.mode].label +
      ' · ' +
      NS.DIFFICULTIES[this.difficulty].label +
      ' · score ' +
      this.score
    );

    this.ui.showScreen(
      'pause'
    );

    this.audio.play(
      'pause'
    );

    this.audio.stopMusic();
  };


  Game.prototype.resume = function () {

    if (
      this.state !== STATE.PAUSED
    ) {
      return;
    }

    this.state = STATE.COUNTDOWN;

    this.countdown =
      CONFIG.countdown.resume;

    this.countdownLabel =
      'Resuming';

    this.accumulator = 0;

    this.ui.setState(
      this.state
    );

    this.ui.setPauseLabel(
      'Pause'
    );

    this.ui.showScreen(null);

    this.audio.play(
      'resume'
    );

    if (this.settings.music) {
      this.audio.startMusic();
    }
  };


  Game.prototype.quit = function () {

    this.state = STATE.MENU;

    this.effects.clear();
    this.foods.clear();

    this.audio.stopMusic();

    this.attract.reset();

    this.ui.setState(
      this.state
    );

    this.ui.setPlaying(false);

    this.refreshMenu();

    this.ui.showScreen(
      'menu'
    );
  };


  /* ========================================================================
     SETTINGS / HUD
     ======================================================================== */

  Game.prototype.changeSetting =
    function (key, value) {

      this.settings[key] = value;


      this.storage.saveSettings(
        this.settings
      );

      this.applySettings();


      if (key === 'music') {

        this.audio.unlock();

        if (
          value &&
          (
            this.state === STATE.PLAYING ||
            this.state === STATE.COUNTDOWN
          )
        ) {
          this.audio.startMusic();

        } else if (!value) {
          this.audio.stopMusic();
        }
      }
    };


  Game.prototype.applySettings =
    function () {

      this.effects.applySettings(
        this.settings
      );

      this.renderer.applySettings(
        this.settings
      );

      this.audio.applySettings(
        this.settings
      );

      this.root.setAttribute(
        'data-reduced-motion',
        this.settings.reducedMotion
          ? 'true'
          : 'false'
      );

    };


  Game.prototype.updateHud =
    function () {

      var mode =
        NS.MODES[this.mode];

      this.ui.updateHud({
        score: this.score,

        high:
          this.storage.getHighScore(
            this.mode,
            this.difficulty
          ),

        level: this.level,

        speed:
          this.effectiveSpeed(),

        time:
          this.timeLeft,

        showLevel:
          !!mode.levels,

        showTime:
          !!mode.timer,

        slow:
          this.active.slow,

        double:
          this.active.double
      });
    };


  Game.prototype.refreshMenu =
    function () {

      var mode =
        NS.MODES[this.mode];

      var diff =
        NS.DIFFICULTIES[
          this.difficulty
        ];

      var best =
        this.storage.getHighScore(
          this.mode,
          this.difficulty
        );


      this.ui.setMeta(
        mode.label +
        ' · ' +
        diff.label
      );


      this.ui.setMenuStatus(
        mode.label +
        ' · ' +
        diff.label +
        ' · best ' +
        best +
        (
          this.storage.available
            ? ''
            : ' · scores not saved in this browser'
        )
      );


      var byMode = {};
      var self = this;


      NS.MODE_ORDER.forEach(
        function (id) {

          byMode[id] =
            self.storage.getHighScore(
              id,
              self.difficulty
            );
        }
      );


      this.ui.updateModeScores(
        byMode
      );
    };


  /* ========================================================================
     EXPORT
     ======================================================================== */

  NS.Game = Game;

})(window);