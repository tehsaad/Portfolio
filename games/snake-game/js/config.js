/**
 * config.js
 * ---------------------------------------------------------------------------
 * Every tunable value in the game lives here. Nothing in this file touches the
 * DOM, so it is safe to read from any other module.
 *
 * Namespace: everything attaches to window.SnakeGame so the project needs no
 * bundler and no ES modules (which cannot be loaded from file:// URLs).
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame || (global.SnakeGame = {});

  NS.VERSION = '1.0.0';

  /** High-level game states. Nothing outside this list is allowed. */
  NS.STATE = Object.freeze({
    MENU: 'MENU',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    DYING: 'DYING',
    GAME_OVER: 'GAME_OVER'
  });

  /** Overlay screens (DOM panels drawn on top of the canvas). */
  NS.SCREEN = Object.freeze({
    MENU: 'menu',
    MODES: 'modes',
    DIFFICULTY: 'difficulty',
    SETTINGS: 'settings',
    HOWTO: 'howto',
    PAUSE: 'pause',
    GAME_OVER: 'gameover'
  });

  /** Movement vectors in grid units. */
  NS.DIR = Object.freeze({
    up: Object.freeze({ x: 0, y: -1, name: 'up' }),
    down: Object.freeze({ x: 0, y: 1, name: 'down' }),
    left: Object.freeze({ x: -1, y: 0, name: 'left' }),
    right: Object.freeze({ x: 1, y: 0, name: 'right' })
  });

  NS.FOOD_TYPE = Object.freeze({ NORMAL: 'normal', BONUS: 'bonus', SPECIAL: 'special' });
  NS.EFFECT = Object.freeze({ SLOW: 'slow', DOUBLE: 'double' });

  /**
   * GAME_CONFIG — gameplay tuning.
   * Speeds are in CELLS PER SECOND (not milliseconds), because the loop is
   * time-based: step interval = 1000 / speed.
   */
  NS.CONFIG = {
    grid: { cols: 25, rows: 25 },

    snake: {
      startLength: 4,
      startDirection: 'right'
    },

    scoring: {
      normal: 10,
      bonus: 35,
      special: 20,
      levelClear: 50
    },

    food: {
      bonusChance: 0.18,        // chance to also spawn a bonus item after eating
      bonusLifetime: 7.5,       // seconds before a bonus item disappears
      bonusMinScore: 40,        // bonus food only starts appearing after this score
      specialChance: 0.12,
      specialLifetime: 9,
      specialMinScore: 80
    },

    powerups: {
      slowFactor: 0.62,         // speed multiplier while "slow motion" is active
      slowDuration: 6,          // seconds
      doubleDuration: 9         // seconds of 2x scoring
    },

    timed: {
      bonusFoodSeconds: 3       // seconds added by bonus food in Timed mode
    },

    endless: {
      obstacleEveryFood: 5,     // a new obstacle appears every N foods
      maxObstacles: 45,
      minDistanceFromHead: 6
    },

    loop: {
      maxFrameSeconds: 0.1,     // clamp so tab-switching never fast-forwards
      maxStepsPerFrame: 5
    },

    countdown: {
      start: 3,
      resume: 1.2,
      levelUp: 1.6
    },

    input: {
      maxQueuedTurns: 2,        // queued turns, so fast double-taps still work
      swipeThreshold: 22        // px before a touch counts as a swipe
    },

    death: { animationSeconds: 0.9 },

    particles: { perFood: 16, max: 240, life: 0.55 },

    shake: { food: 2, levelUp: 3, death: 12 }
  };

  /** Difficulty presets. */
  NS.DIFFICULTIES = {
    easy: {
      id: 'easy', label: 'Easy',
      blurb: 'Slow start, gentle ramp, fewer obstacles.',
      startSpeed: 6, maxSpeed: 11, speedPerFood: 0.10,
      scoreMultiplier: 0.8, timedSeconds: 75,
      obstacleScale: 0.6, levelSpeedStep: 0.7
    },
    normal: {
      id: 'normal', label: 'Normal',
      blurb: 'The reference experience. Balanced speed and pressure.',
      startSpeed: 9, maxSpeed: 16, speedPerFood: 0.15,
      scoreMultiplier: 1, timedSeconds: 60,
      obstacleScale: 1, levelSpeedStep: 0.85
    },
    hard: {
      id: 'hard', label: 'Hard',
      blurb: 'Quick off the line, more obstacles, higher payout.',
      startSpeed: 11.5, maxSpeed: 20, speedPerFood: 0.2,
      scoreMultiplier: 1.35, timedSeconds: 50,
      obstacleScale: 1.25, levelSpeedStep: 1
    },
    extreme: {
      id: 'extreme', label: 'Extreme',
      blurb: 'Very fast from the first food. Scores count for nearly double.',
      startSpeed: 14, maxSpeed: 26, speedPerFood: 0.28,
      scoreMultiplier: 1.8, timedSeconds: 45,
      obstacleScale: 1.5, levelSpeedStep: 1.2
    }
  };
  NS.DIFFICULTY_ORDER = ['easy', 'normal', 'hard', 'extreme'];

  /** Game modes. `rules` is shown to the player before the mode starts. */
  NS.MODES = {
    classic: {
      id: 'classic', label: 'Classic',
      blurb: 'The original game, nothing added.',
      rules: [
        'Empty board — no obstacles.',
        'Walls and your own body end the run.',
        'Every food makes you a little faster, up to a ceiling.'
      ],
      timer: false, levels: false, growObstacles: false, speedRamp: true
    },
    timed: {
      id: 'timed', label: 'Timed',
      blurb: 'Score as much as you can before the clock runs out.',
      rules: [
        'You start with a fixed clock; it never stops.',
        'Gold food adds 3 seconds as well as points.',
        'Crashing ends the run early — the clock is not a safety net.'
      ],
      timer: true, levels: false, growObstacles: false, speedRamp: true
    },
    endless: {
      id: 'endless', label: 'Endless',
      blurb: 'Survival. The board fills up around you.',
      rules: [
        'A new block appears every 5 foods, never next to your head.',
        'Speed keeps climbing past the normal ceiling.',
        'No timer, no levels — you play until you crash.'
      ],
      timer: false, levels: false, growObstacles: true, speedRamp: true
    },
    challenge: {
      id: 'challenge', label: 'Challenge',
      blurb: 'Eight hand-built layouts, each faster than the last.',
      rules: [
        'Eat the level target to advance to the next layout.',
        'Each level adds speed and a new obstacle pattern.',
        'Your snake is re-centred on level up, so no unfair spawns.'
      ],
      timer: false, levels: true, growObstacles: false, speedRamp: false
    }
  };
  NS.MODE_ORDER = ['classic', 'timed', 'endless', 'challenge'];

  /** Default settings — overwritten by anything found in localStorage. */
  NS.DEFAULT_SETTINGS = {
    sfx: true,
    music: true,
    volume: 0.6,
    grid: true,
    particles: true,
    shake: true,
    touchControls: 'auto',   // 'auto' | 'on' | 'off'
    reducedMotion: false
  };

  /**
   * Canvas colours. The DOM chrome uses the matching CSS custom properties in
   * css/style.css — change both if you re-theme the game.
   */
  NS.THEME = {
    backdropTop: '#111b28',
    backdropBottom: '#0b121c',
    gridMinor: 'rgba(233, 226, 208, 0.045)',
    gridMajor: 'rgba(233, 226, 208, 0.085)',
    border: 'rgba(200, 155, 60, 0.35)',
    obstacle: '#26344a',
    obstacleEdge: 'rgba(233, 226, 208, 0.16)',
    snakeBody: '#3f9d78',
    snakeSpine: '#63c79b',
    snakeHead: '#7fd8a8',
    snakeDead: '#a33a3a',
    eye: '#0b121c',
    foodNormal: '#e9e2d0',
    foodNormalCore: '#f6f1e4',
    bonus: '#c89b3c',
    special: '#9a7bd1',
    text: '#e9e2d0',
    textDim: 'rgba(233, 226, 208, 0.62)',
    scrim: 'rgba(8, 13, 20, 0.72)'
  };

})(window);
