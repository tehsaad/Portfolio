/**
 * storage.js
 * ---------------------------------------------------------------------------
 * Wraps localStorage. If storage is unavailable (private mode, blocked
 * cookies, sandboxed iframe) everything falls back to an in-memory object so
 * the game keeps working — scores simply do not survive a refresh.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;
  var PREFIX = 'snakeGame.v1.';
  var KEY_SCORES = PREFIX + 'highscores';
  var KEY_SETTINGS = PREFIX + 'settings';

  function probe() {
    try {
      var k = PREFIX + 'probe';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (err) {
      return false;
    }
  }

  function StorageManager() {
    this.available = probe();
    this.memory = {};
  }

  StorageManager.prototype.readRaw = function (key) {
    if (!this.available) return this.memory[key] || null;
    try {
      return global.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  };

  StorageManager.prototype.writeRaw = function (key, value) {
    this.memory[key] = value;
    if (!this.available) return false;
    try {
      global.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      // Quota or permission problem — keep the in-memory copy and move on.
      this.available = false;
      return false;
    }
  };

  StorageManager.prototype.readJSON = function (key, fallback) {
    var raw = this.readRaw(key);
    if (!raw) return fallback;
    try {
      var parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : fallback;
    } catch (err) {
      return fallback;
    }
  };

  StorageManager.prototype.writeJSON = function (key, value) {
    try {
      return this.writeRaw(key, JSON.stringify(value));
    } catch (err) {
      return false;
    }
  };

  /* ----------------------------- high scores ----------------------------- */

  StorageManager.prototype.scoreKey = function (mode, difficulty) {
    return mode + ':' + difficulty;
  };

  StorageManager.prototype.getAllScores = function () {
    return this.readJSON(KEY_SCORES, {});
  };

  StorageManager.prototype.getHighScore = function (mode, difficulty) {
    var all = this.getAllScores();
    var value = all[this.scoreKey(mode, difficulty)];
    return typeof value === 'number' && isFinite(value) ? value : 0;
  };

  /** Returns true when the score beat the stored record. */
  StorageManager.prototype.submitScore = function (mode, difficulty, score) {
    var all = this.getAllScores();
    var key = this.scoreKey(mode, difficulty);
    var best = typeof all[key] === 'number' ? all[key] : 0;
    if (score <= best) return false;
    all[key] = score;
    this.writeJSON(KEY_SCORES, all);
    return true;
  };

  StorageManager.prototype.clearScores = function () {
    this.writeJSON(KEY_SCORES, {});
  };

  /* ------------------------------ settings ------------------------------- */

  StorageManager.prototype.loadSettings = function () {
    var stored = this.readJSON(KEY_SETTINGS, {});
    var out = {};
    var defaults = NS.DEFAULT_SETTINGS;
    for (var key in defaults) {
      if (!Object.prototype.hasOwnProperty.call(defaults, key)) continue;
      out[key] = Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : defaults[key];
      // Guard against corrupted values of the wrong type.
      if (typeof out[key] !== typeof defaults[key]) out[key] = defaults[key];
    }
    out.volume = Math.min(1, Math.max(0, Number(out.volume) || 0));
    return out;
  };

  StorageManager.prototype.saveSettings = function (settings) {
    return this.writeJSON(KEY_SETTINGS, settings);
  };

  /** Last chosen mode / difficulty, so the menu remembers the player. */
  StorageManager.prototype.loadSelection = function () {
    var sel = this.readJSON(PREFIX + 'selection', {});
    return {
      mode: NS.MODES[sel.mode] ? sel.mode : 'classic',
      difficulty: NS.DIFFICULTIES[sel.difficulty] ? sel.difficulty : 'normal'
    };
  };

  StorageManager.prototype.saveSelection = function (mode, difficulty) {
    return this.writeJSON(PREFIX + 'selection', { mode: mode, difficulty: difficulty });
  };

  NS.StorageManager = StorageManager;

})(window);
