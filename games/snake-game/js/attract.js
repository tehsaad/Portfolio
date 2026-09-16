/**
 * attract.js
 * ---------------------------------------------------------------------------
 * The snake that plays itself behind the main menu. It uses a deliberately
 * simple rule: of the moves that are legal and not immediately fatal, take the
 * one that gets closest to the food. It is not meant to be a perfect player —
 * when it traps itself it just starts again.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;
  var NAMES = ['up', 'down', 'left', 'right'];

  function Attract(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.snake = new NS.Snake();
    this.foods = new NS.FoodManager();
    this.speed = 7;
    this.accumulator = 0;
    this.alpha = 0;
    this.reset();
  }

  Attract.prototype.reset = function () {
    var spawn = NS.Levels.spawnPoint(this.cols, this.rows);
    this.snake.reset(spawn.x, spawn.y, 4, 'right');
    this.foods.clear();
    this.spawnFood();
    this.accumulator = 0;
  };

  Attract.prototype.spawnFood = function () {
    var self = this;
    this.foods.spawn(NS.FOOD_TYPE.NORMAL, this.cols, this.rows, function (x, y) {
      return self.snake.occupies(x, y, false);
    }, {});
  };

  Attract.prototype.update = function (dt) {
    var interval = 1000 / this.speed;
    this.accumulator += dt * 1000;
    var guard = 0;
    while (this.accumulator >= interval && guard < 4) {
      this.accumulator -= interval;
      this.step();
      guard++;
    }
    this.alpha = Math.min(1, this.accumulator / interval);
  };

  Attract.prototype.isFatal = function (x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return true;
    // The tail moves out of the way on the same step, so ignore the last cell.
    for (var i = 0; i < this.snake.segments.length - 1; i++) {
      var s = this.snake.segments[i];
      if (s.x === x && s.y === y) return true;
    }
    return false;
  };

  Attract.prototype.chooseDirection = function () {
    var head = this.snake.head;
    var target = this.foods.items[0];
    var current = this.snake.direction;
    var options = [];

    for (var i = 0; i < NAMES.length; i++) {
      var dir = NS.DIR[NAMES[i]];
      if (dir.x === -current.x && dir.y === -current.y) continue;
      var nx = head.x + dir.x;
      var ny = head.y + dir.y;
      if (this.isFatal(nx, ny)) continue;
      var distance = target ? Math.abs(target.x - nx) + Math.abs(target.y - ny) : Math.random() * 10;
      options.push({ name: NAMES[i], distance: distance });
    }

    if (!options.length) return null;
    options.sort(function (a, b) { return a.distance - b.distance; });
    return options[0].name;
  };

  Attract.prototype.step = function () {
    var choice = this.chooseDirection();
    if (!choice) { this.reset(); return; }

    this.snake.turn(choice);
    var head = this.snake.step();

    if (head.x < 0 || head.y < 0 || head.x >= this.cols || head.y >= this.rows || this.snake.hitsSelf()) {
      this.reset();
      return;
    }

    var item = this.foods.at(head.x, head.y);
    if (item) {
      this.foods.remove(item);
      this.snake.grow(1);
      if (this.snake.length > 26) { this.reset(); return; }
      this.spawnFood();
    }
  };

  NS.Attract = Attract;

})(window);
