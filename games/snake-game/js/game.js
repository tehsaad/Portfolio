/**
 * game.js
 * ---------------------------------------------------------------------------
 * The orchestrator: owns the state machine, the loop, collisions, scoring,
 * modes and levels. Everything else (snake, food, input, audio, UI, storage)
 * is a service it calls.
 *
 * The loop is TIME-BASED. requestAnimationFrame drives rendering, but the
 * snake only advances when enough milliseconds have accumulated:
 *
 *      accumulator += dt
 *      while (accumulator >= 1000 / speed) { accumulator -= interval; step() }
 *      alpha = accumulator / interval          // used to draw between cells
 *
 * So the game runs identically at 30, 60, 120 or 144 Hz, and `alpha` is what
 * makes movement look smooth instead of stuttering one cell at a time.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;
  var STATE = NS.STATE;
  var CONFIG = NS.CONFIG;
  var TYPES = NS.FOOD_TYPE;
  var THEME = NS.THEME;

  function Game(root, options) {
    this.root = root;
    this.options = options || {};
    this.cols = CONFIG.grid.cols;
    this.rows = CONFIG.grid.rows;

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
    this.active = { slow: 0, double: 0 };
  };

  /* ------------------------------- setup --------------------------------- */

  Game.prototype.init = function () {
    var self = this;

    this.ui = new NS.UIManager(this.root);
    var refs = this.ui.build();

    this.renderer = new NS.Renderer(refs.canvas, this.cols, this.rows);
    this.audio = new NS.AudioManager({ basePath: this.options.basePath || '' });
    this.attract = new NS.Attract(this.cols, this.rows);

    this.input = new NS.InputManager(this.root, {
      onDirection: function (name) { self.handleDirection(name); },
      onAction: function (name) { self.handleShortcut(name); },
      isActive: function () {
        return self.state === STATE.PLAYING ||
               self.state === STATE.COUNTDOWN ||
               self.state === STATE.PAUSED;
      },
      canSwipe: function () {
        return self.state === STATE.PLAYING || self.state === STATE.COUNTDOWN;
      }
    });
    this.input.attach(refs.stage, refs.pad);

    this.ui.onAction = function (action, data) { self.handleAction(action, data); };
    this.ui.onSettingChange = function (key, value) { self.changeSetting(key, value); };

    // First run: respect the operating system's reduced-motion preference.
    if (global.matchMedia) {
      var query = global.matchMedia('(prefers-reduced-motion: reduce)');
      if (query.matches && !this.storage.readRaw('snakeGame.v1.settings')) {
        this.settings.reducedMotion = true;
      }
    }

    this.observeResize(refs.stage);
    global.addEventListener('orientationchange', function () { self.pendingResize = true; });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && (self.state === STATE.PLAYING || self.state === STATE.COUNTDOWN)) {
        self.pause();
      }
    });

    this.applySettings();
    this.ui.syncSettings(this.settings, this.padWanted());
    this.ui.markSelected('mode', this.mode);
    this.ui.markSelected('difficulty', this.difficulty);
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
      this.resizeObserver = new global.ResizeObserver(function () { self.pendingResize = true; });
      this.resizeObserver.observe(stage);
    } else {
      this.onWindowResize = function () { self.pendingResize = true; };
      global.addEventListener('resize', this.onWindowResize);
    }
  };

  Game.prototype.start = function () {
    if (this.running) return;
    var self = this;
    this.running = true;
    this.lastFrame = 0;
    this.frame = function (timestamp) {
      if (!self.running) return;
      self.rafId = global.requestAnimationFrame(self.frame);
      self.tick(timestamp);
    };
    this.rafId = global.requestAnimationFrame(this.frame);
  };

  /** Stops the loop and removes listeners — used when unmounting the game. */
  Game.prototype.destroy = function () {
    this.running = false;
    if (this.rafId) global.cancelAnimationFrame(this.rafId);
    if (this.input) this.input.detach();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.onWindowResize) global.removeEventListener('resize', this.onWindowResize);
    if (this.audio) this.audio.stopMusic();
    this.root.innerHTML = '';
  };

  /* -------------------------------- loop --------------------------------- */

  Game.prototype.tick = function (timestamp) {
    if (!this.lastFrame) this.lastFrame = timestamp;
    var dt = (timestamp - this.lastFrame) / 1000;
    this.lastFrame = timestamp;

    if (!isFinite(dt) || dt < 0) dt = 0;
    if (dt > CONFIG.loop.maxFrameSeconds) dt = CONFIG.loop.maxFrameSeconds;

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
        if (this.deathTimer <= 0) this.finishGameOver();
        break;

      default:
        break;    // PAUSED and GAME_OVER freeze everything
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

    if (this.active.slow > 0) this.active.slow = Math.max(0, this.active.slow - dt);
    if (this.active.double > 0) this.active.double = Math.max(0, this.active.double - dt);

    this.foods.update(dt);

    this.accumulator += dt * 1000;
    var steps = 0;
    while (this.state === STATE.PLAYING && steps < CONFIG.loop.maxStepsPerFrame) {
      var interval = 1000 / this.effectiveSpeed();
      if (this.accumulator < interval) break;
      this.accumulator -= interval;
      this.step();
      steps++;
    }
    this.alpha = Math.min(1, this.accumulator / (1000 / this.effectiveSpeed()));

    this.hudTimer += dt;
    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      this.updateHud();
    }
  };

  Game.prototype.effectiveSpeed = function () {
    var speed = this.speed;
    if (this.active.slow > 0) speed *= CONFIG.powerups.slowFactor;
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
      alpha: this.state === STATE.PLAYING ? this.alpha : (this.state === STATE.DYING ? 1 : this.alpha),
      dying: this.state === STATE.DYING,
      dim: this.state === STATE.PAUSED || this.state === STATE.GAME_OVER,
      countdown: this.state === STATE.COUNTDOWN ? this.countdown : 0,
      countdownLabel: this.countdownLabel
    });
  };

  /* ------------------------------ the run -------------------------------- */

  Game.prototype.startRun = function () {
    var diff = NS.DIFFICULTIES[this.difficulty];
    var mode = NS.MODES[this.mode];

    this.resetRunState();
    this.speed = diff.startSpeed;
    this.timeLeft = mode.timer ? diff.timedSeconds : 0;

    this.buildBoard(1);
    this.resetSnake();
    this.foods.clear();
    this.effects.clear();
    this.spawnNormalFood();

    this.state = STATE.COUNTDOWN;
    this.countdown = CONFIG.countdown.start;
    this.countdownLabel = mode.levels ? this.levelName : mode.label;

    this.ui.setState(this.state);
    this.ui.setPlaying(true);
    this.ui.showScreen(null);
    this.ui.setPauseLabel('Pause');
    this.ui.setMeta(mode.label + ' · ' + diff.label);
    this.updateHud();
    this.updatePadVisibility();
    this.audio.unlock();
    if (this.settings.music) this.audio.startMusic();
    this.ui.announce(mode.label + ' on ' + diff.label + '. Good luck.');
  };

  Game.prototype.resetSnake = function () {
    var spawn = NS.Levels.spawnPoint(this.cols, this.rows);
    this.snake.reset(spawn.x, spawn.y, CONFIG.snake.startLength, CONFIG.snake.startDirection);
  };

  Game.prototype.buildBoard = function (level) {
    var mode = NS.MODES[this.mode];
    var diff = NS.DIFFICULTIES[this.difficulty];

    if (mode.levels) {
      var info = NS.Levels.getLevel(level);
      var built = NS.Levels.build(info.layout, this.cols, this.rows, info.seed, diff.obstacleScale * info.scale);
      this.obstacles = built.cells;
      this.obstacleSet = built.set;
      this.levelTarget = info.target;
      this.levelName = 'Level ' + info.number + ' — ' + info.name;
    } else {
      this.obstacles = [];
      this.obstacleSet = {};
      this.levelTarget = 0;
      this.levelName = '';
    }
  };

  /** Used by the food spawner: true when a cell cannot hold food. */
  Game.prototype.isBlocked = function (x, y) {
    if (this.obstacleSet[NS.Levels.key(x, y)]) return true;
    return this.snake.occupies(x, y, false);
  };

  Game.prototype.spawnNormalFood = function () {
    var self = this;
    var item = this.foods.spawn(TYPES.NORMAL, this.cols, this.rows, function (x, y) {
      return self.isBlocked(x, y);
    }, {});
    if (!item) this.die('cleared');
    return item;
  };

  Game.prototype.maybeSpawnExtras = function () {
    var self = this;
    var cfg = CONFIG.food;
    var blocked = function (x, y) { return self.isBlocked(x, y); };

    if (!this.foods.has(TYPES.BONUS) && this.score >= cfg.bonusMinScore && Math.random() < cfg.bonusChance) {
      this.foods.spawn(TYPES.BONUS, this.cols, this.rows, blocked, { lifetime: cfg.bonusLifetime });
    }
    if (!this.foods.has(TYPES.SPECIAL) && this.score >= cfg.specialMinScore && Math.random() < cfg.specialChance) {
      var effect = Math.random() < 0.5 ? NS.EFFECT.SLOW : NS.EFFECT.DOUBLE;
      this.foods.spawn(TYPES.SPECIAL, this.cols, this.rows, blocked, {
        lifetime: cfg.specialLifetime, effect: effect
      });
    }
  };

  /* ------------------------------- stepping ------------------------------ */

  Game.prototype.step = function () {
    var head = this.snake.step();

    if (head.x < 0 || head.y < 0 || head.x >= this.cols || head.y >= this.rows) {
      this.die('wall');
      return;
    }
    if (this.obstacleSet[NS.Levels.key(head.x, head.y)]) {
      this.die('obstacle');
      return;
    }
    if (this.snake.hitsSelf()) {
      this.die('self');
      return;
    }

    var item = this.foods.at(head.x, head.y);
    if (item) this.eat(item, head);
  };

  Game.prototype.eat = function (item, head) {
    var mode = NS.MODES[this.mode];
    var diff = NS.DIFFICULTIES[this.difficulty];

    this.foods.remove(item);

    var multiplier = diff.scoreMultiplier * (this.active.double > 0 ? 2 : 1);
    var gained = Math.round(NS.FoodManager.baseScore(item.type) * multiplier);
    this.score += gained;
    this.foodEaten++;
    this.snake.grow(NS.FoodManager.growth(item.type));

    var color = item.type === TYPES.BONUS ? THEME.bonus
      : item.type === TYPES.SPECIAL ? THEME.special : THEME.foodNormal;

    this.effects.burst(head.x, head.y, color, CONFIG.particles.perFood);
    this.effects.floatText(head.x, head.y - 0.7, '+' + gained, color);
    this.effects.addShake(CONFIG.shake.food);
    this.audio.play(item.type === TYPES.NORMAL ? 'eat' : 'bonus');

    if (item.type === TYPES.SPECIAL && item.effect) this.applyEffect(item.effect, head);

    if (item.type === TYPES.BONUS && mode.timer) {
      this.timeLeft += CONFIG.timed.bonusFoodSeconds;
      this.effects.floatText(head.x, head.y - 1.5, '+' + CONFIG.timed.bonusFoodSeconds + 's', THEME.bonus);
    }

    if (mode.speedRamp) {
      var ceiling = mode.growObstacles ? diff.maxSpeed + 6 : diff.maxSpeed;
      this.speed = Math.min(ceiling, this.speed + diff.speedPerFood);
    }

    if (mode.growObstacles && this.foodEaten % CONFIG.endless.obstacleEveryFood === 0) {
      this.addRandomObstacle();
    }

    if (item.type === TYPES.NORMAL) this.spawnNormalFood();
    this.maybeSpawnExtras();

    if (mode.levels) {
      this.foodInLevel++;
      if (this.foodInLevel >= this.levelTarget) this.levelUp();
    }

    this.updateHud();
  };

  Game.prototype.applyEffect = function (effect, head) {
    if (effect === NS.EFFECT.SLOW) {
      this.active.slow = CONFIG.powerups.slowDuration;
      this.effects.floatText(head.x, head.y - 2.2, 'slow motion', THEME.special);
      this.ui.announce('Slow motion');
    } else {
      this.active.double = CONFIG.powerups.doubleDuration;
      this.effects.floatText(head.x, head.y - 2.2, 'double points', THEME.special);
      this.ui.announce('Double points');
    }
  };

  /** Endless mode: drop a block somewhere safe, well away from the head. */
  Game.prototype.addRandomObstacle = function () {
    if (this.obstacles.length >= CONFIG.endless.maxObstacles) return;

    var head = this.snake.head;
    var candidates = [];
    for (var y = 1; y < this.rows - 1; y++) {
      for (var x = 1; x < this.cols - 1; x++) {
        if (this.isBlocked(x, y)) continue;
        if (this.foods.at(x, y)) continue;
        var distance = Math.abs(x - head.x) + Math.abs(y - head.y);
        if (distance < CONFIG.endless.minDistanceFromHead) continue;
        candidates.push({ x: x, y: y });
      }
    }
    if (!candidates.length) return;

    var cell = candidates[Math.floor(Math.random() * candidates.length)];
    var k = NS.Levels.key(cell.x, cell.y);
    this.obstacleSet[k] = true;

    // Never let a new block seal off part of the board.
    if (!NS.Levels.isPlayable(this.cols, this.rows, this.obstacleSet, head, 0.8)) {
      delete this.obstacleSet[k];
      return;
    }

    this.obstacles.push(cell);
    this.effects.burst(cell.x, cell.y, THEME.obstacleEdge, 8, 3);
  };

  Game.prototype.levelUp = function () {
    var diff = NS.DIFFICULTIES[this.difficulty];

    this.level++;
    this.foodInLevel = 0;
    this.score += CONFIG.scoring.levelClear;
    this.speed = Math.min(diff.maxSpeed + 6, diff.startSpeed + (this.level - 1) * diff.levelSpeedStep);

    this.buildBoard(this.level);
    this.resetSnake();          // re-centred, so a new layout can never kill you
    this.foods.clear();
    this.spawnNormalFood();

    this.effects.addShake(CONFIG.shake.levelUp);
    this.effects.showBanner('LEVEL UP', this.levelName, CONFIG.countdown.levelUp);
    this.audio.play('levelup');
    this.ui.announce('Level ' + this.level);

    this.state = STATE.COUNTDOWN;
    this.countdown = CONFIG.countdown.levelUp;
    this.countdownLabel = this.levelName;
    this.accumulator = 0;
    this.ui.setState(this.state);
  };

  /* ------------------------------ game over ------------------------------ */

  var REASONS = {
    wall: 'You hit the wall.',
    self: 'You ran into yourself.',
    obstacle: 'You hit an obstacle.',
    time: 'Time is up.',
    cleared: 'You filled the entire board.'
  };

  Game.prototype.die = function (reason) {
    if (this.state === STATE.DYING || this.state === STATE.GAME_OVER) return;

    this.deathReason = reason;
    this.state = STATE.DYING;
    this.deathTimer = CONFIG.death.animationSeconds;
    this.snake.dead = true;
    this.ui.setState(this.state);

    var segments = this.snake.segments;
    for (var i = 0; i < segments.length; i += 2) {
      this.effects.burst(segments[i].x, segments[i].y, THEME.snakeDead, 4, 4);
    }
    this.effects.addShake(CONFIG.shake.death);
    this.audio.play('gameover');
    this.audio.stopMusic();
  };

  Game.prototype.finishGameOver = function () {
    this.state = STATE.GAME_OVER;
    this.ui.setState(this.state);

    var isNewHigh = false;
    if (this.score > 0) {
      isNewHigh = this.storage.submitScore(this.mode, this.difficulty, this.score);
    }
    if (isNewHigh) {
      this.audio.play('highscore');
      this.effects.showBanner('NEW HIGH SCORE', String(this.score), 2.2);
    }

    this.ui.showGameOver({
      score: this.score,
      high: this.storage.getHighScore(this.mode, this.difficulty),
      level: this.level,
      length: this.snake.length,
      isNewHigh: isNewHigh,
      reason: REASONS[this.deathReason] || ''
    });
    this.updateHud();
    this.refreshMenu();
    this.ui.announce('Game over. Score ' + this.score + '.');
  };

  /* ------------------------------- controls ------------------------------ */

  Game.prototype.handleDirection = function (name) {
    if (this.state !== STATE.PLAYING && this.state !== STATE.COUNTDOWN) return;
    this.snake.turn(name);
  };

  Game.prototype.handleShortcut = function (name) {
    if (name === 'pause') {
      if (this.state === STATE.PLAYING || this.state === STATE.COUNTDOWN) this.pause();
      else if (this.state === STATE.PAUSED) this.resume();
      return;
    }
    if (name === 'back') {
      if (this.state === STATE.PLAYING || this.state === STATE.COUNTDOWN) { this.pause(); return; }
      if (this.state === STATE.PAUSED && this.ui.currentScreen !== 'pause') { this.ui.showScreen('pause'); return; }
      if (this.state === STATE.MENU && this.ui.currentScreen !== 'menu') this.ui.showScreen('menu');
    }
  };

  Game.prototype.handleAction = function (action, data) {
    this.audio.unlock();
    if (action !== 'pause') this.audio.play('click');

    switch (action) {
      case 'play':
        this.startRun();
        break;

      case 'play-mode':
        this.setMode(data.mode);
        this.startRun();
        break;

      case 'select-mode':
        this.setMode(data.mode);
        this.ui.showScreen('menu');
        break;

      case 'select-difficulty':
        this.setDifficulty(data.difficulty);
        this.ui.showScreen('menu');
        break;

      case 'open-modes':
        this.previousScreen = this.ui.currentScreen;
        this.ui.showScreen('modes');
        break;

      case 'open-difficulty':
        this.previousScreen = this.ui.currentScreen;
        this.ui.showScreen('difficulty');
        break;

      case 'open-settings':
        this.previousScreen = this.ui.currentScreen;
        if (this.state === STATE.PLAYING || this.state === STATE.COUNTDOWN) {
          this.pause();
          this.previousScreen = 'pause';
        }
        this.ui.syncSettings(this.settings, this.padWanted());
        this.ui.showScreen('settings');
        break;

      case 'open-howto':
        this.previousScreen = this.ui.currentScreen;
        this.ui.showScreen('howto');
        break;

      case 'back':
        this.ui.showScreen(this.previousScreen === 'pause' ? 'pause' : 'menu');
        break;

      case 'reset-scores':
        this.storage.clearScores();
        this.refreshMenu();
        this.updateHud();
        this.ui.announce('High scores cleared.');
        break;

      case 'pause':
        if (this.state === STATE.PAUSED) this.resume();
        else this.pause();
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

  Game.prototype.setMode = function (id) {
    if (!NS.MODES[id]) return;
    this.mode = id;
    this.storage.saveSelection(this.mode, this.difficulty);
    this.ui.markSelected('mode', id);
    this.refreshMenu();
  };

  Game.prototype.setDifficulty = function (id) {
    if (!NS.DIFFICULTIES[id]) return;
    this.difficulty = id;
    this.storage.saveSelection(this.mode, this.difficulty);
    this.ui.markSelected('difficulty', id);
    this.refreshMenu();
  };

  Game.prototype.pause = function () {
    if (this.state !== STATE.PLAYING && this.state !== STATE.COUNTDOWN) return;
    this.state = STATE.PAUSED;
    this.ui.setState(this.state);
    this.ui.setPauseLabel('Resume');
    this.ui.setPauseNote(NS.MODES[this.mode].label + ' · ' + NS.DIFFICULTIES[this.difficulty].label +
      ' · score ' + this.score);
    this.ui.showScreen('pause');
    this.audio.play('pause');
    this.audio.stopMusic();
  };

  Game.prototype.resume = function () {
    if (this.state !== STATE.PAUSED) return;
    this.state = STATE.COUNTDOWN;
    this.countdown = CONFIG.countdown.resume;
    this.countdownLabel = 'Resuming';
    this.accumulator = 0;
    this.ui.setState(this.state);
    this.ui.setPauseLabel('Pause');
    this.ui.showScreen(null);
    this.audio.play('resume');
    if (this.settings.music) this.audio.startMusic();
  };

  Game.prototype.quit = function () {
    this.state = STATE.MENU;
    this.effects.clear();
    this.foods.clear();
    this.audio.stopMusic();
    this.attract.reset();
    this.ui.setState(this.state);
    this.ui.setPlaying(false);
    this.ui.setPadVisible(false);
    this.refreshMenu();
    this.ui.showScreen('menu');
  };

  /* --------------------------- settings and HUD -------------------------- */

  Game.prototype.changeSetting = function (key, value) {
    if (key === 'touchControls') {
      // Once the player touches this switch it becomes an explicit choice,
      // so the pad can be turned on with a mouse too.
      this.settings.touchControls = value ? 'on' : 'off';
    } else {
      this.settings[key] = value;
    }
    this.storage.saveSettings(this.settings);
    this.applySettings();

    if (key === 'music') {
      this.audio.unlock();
      if (value && (this.state === STATE.PLAYING || this.state === STATE.COUNTDOWN)) this.audio.startMusic();
      else if (!value) this.audio.stopMusic();
    }
  };

  Game.prototype.applySettings = function () {
    this.effects.applySettings(this.settings);
    this.renderer.applySettings(this.settings);
    this.audio.applySettings(this.settings);
    this.root.setAttribute('data-reduced-motion', this.settings.reducedMotion ? 'true' : 'false');
    this.updatePadVisibility();
  };

  /** 'auto' resolves to "show it on touch devices"; 'on'/'off' are explicit. */
  Game.prototype.padWanted = function () {
    var setting = this.settings.touchControls;
    if (setting === 'on') return true;
    if (setting === 'off') return false;
    return !!(this.input && this.input.hasTouch);
  };

  Game.prototype.updatePadVisibility = function () {
    this.ui.setPadVisible(this.state !== STATE.MENU && this.padWanted());
  };

  Game.prototype.updateHud = function () {
    var mode = NS.MODES[this.mode];
    this.ui.updateHud({
      score: this.score,
      high: this.storage.getHighScore(this.mode, this.difficulty),
      level: this.level,
      speed: this.effectiveSpeed(),
      time: this.timeLeft,
      showLevel: !!mode.levels,
      showTime: !!mode.timer,
      slow: this.active.slow,
      double: this.active.double
    });
  };

  Game.prototype.refreshMenu = function () {
    var mode = NS.MODES[this.mode];
    var diff = NS.DIFFICULTIES[this.difficulty];
    var best = this.storage.getHighScore(this.mode, this.difficulty);

    this.ui.setMeta(mode.label + ' · ' + diff.label);
    this.ui.setMenuStatus(mode.label + ' · ' + diff.label + ' · best ' + best +
      (this.storage.available ? '' : ' · scores not saved in this browser'));

    var byMode = {};
    var self = this;
    NS.MODE_ORDER.forEach(function (id) {
      byMode[id] = self.storage.getHighScore(id, self.difficulty);
    });
    this.ui.updateModeScores(byMode);
  };

  NS.Game = Game;

})(window);
