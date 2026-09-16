/**
 * food.js
 * ---------------------------------------------------------------------------
 * Three food types:
 *   normal  — always exactly one on the board, plain points
 *   bonus   — gold, limited lifetime, big points (+3s in Timed mode)
 *   special — violet, limited lifetime, grants slow motion or double points
 *
 * Spawning builds the list of genuinely free cells first, so food can never
 * land inside the snake, inside an obstacle, or on another food item.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;
  var TYPES = NS.FOOD_TYPE;

  function FoodManager() {
    this.items = [];
    this.time = 0;
  }

  FoodManager.prototype.clear = function () {
    this.items.length = 0;
  };

  FoodManager.prototype.at = function (x, y) {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].x === x && this.items[i].y === y) return this.items[i];
    }
    return null;
  };

  FoodManager.prototype.has = function (type) {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].type === type) return true;
    }
    return false;
  };

  FoodManager.prototype.remove = function (item) {
    var index = this.items.indexOf(item);
    if (index >= 0) this.items.splice(index, 1);
  };

  /**
   * @param {function} isBlocked (x, y) => boolean — supplied by Game, covers
   *        snake body and obstacles. Existing food is excluded here.
   */
  FoodManager.prototype.freeCells = function (cols, rows, isBlocked) {
    var cells = [];
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        if (isBlocked(x, y)) continue;
        if (this.at(x, y)) continue;
        cells.push({ x: x, y: y });
      }
    }
    return cells;
  };

  /** Returns the new item, or null when the board is completely full. */
  FoodManager.prototype.spawn = function (type, cols, rows, isBlocked, options) {
    options = options || {};
    var cells = this.freeCells(cols, rows, isBlocked);
    if (!cells.length) return null;

    var cell = cells[Math.floor(Math.random() * cells.length)];
    var lifetime = options.lifetime || 0;

    var item = {
      type: type,
      x: cell.x,
      y: cell.y,
      life: lifetime,
      maxLife: lifetime,
      effect: options.effect || null,
      bornAt: this.time,
      phase: Math.random() * Math.PI * 2
    };
    this.items.push(item);
    return item;
  };

  /** Ages timed items. Returns the list of items that just expired. */
  FoodManager.prototype.update = function (dt) {
    this.time += dt;
    var expired = [];
    for (var i = this.items.length - 1; i >= 0; i--) {
      var item = this.items[i];
      if (item.maxLife <= 0) continue;        // normal food never expires
      item.life -= dt;
      if (item.life <= 0) {
        expired.push(item);
        this.items.splice(i, 1);
      }
    }
    return expired;
  };

  /** Points before difficulty and multiplier are applied. */
  FoodManager.baseScore = function (type) {
    var scoring = NS.CONFIG.scoring;
    if (type === TYPES.BONUS) return scoring.bonus;
    if (type === TYPES.SPECIAL) return scoring.special;
    return scoring.normal;
  };

  /** How many segments this food adds. */
  FoodManager.growth = function (type) {
    if (type === TYPES.BONUS) return 2;
    return 1;
  };

  NS.FoodManager = FoodManager;

})(window);
