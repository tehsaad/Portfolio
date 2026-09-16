/**
 * snake.js
 * ---------------------------------------------------------------------------
 * The snake owns its body and its direction. It knows nothing about walls,
 * food or scoring — Game asks it to step and then judges the result.
 *
 * Turns are QUEUED rather than applied instantly. That is what makes a fast
 * "up then left" double tap work instead of being swallowed, and it is also
 * how an illegal reverse is blocked: a new turn is compared against the last
 * turn already queued, not against the direction currently on screen.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;

  function Snake() {
    this.segments = [];      // [0] is the head
    this.queue = [];
    this.direction = NS.DIR.right;
    this.growBy = 0;
    this.lastTail = null;    // cell the tail just left (used for smooth drawing)
    this.grewThisStep = false;
    this.dead = false;
  }

  Snake.prototype.reset = function (headX, headY, length, directionName) {
    var dir = NS.DIR[directionName] || NS.DIR.right;
    this.direction = dir;
    this.segments.length = 0;
    for (var i = 0; i < length; i++) {
      this.segments.push({ x: headX - dir.x * i, y: headY - dir.y * i });
    }
    this.queue.length = 0;
    this.growBy = 0;
    this.lastTail = null;
    this.grewThisStep = false;
    this.dead = false;
  };

  Object.defineProperty(Snake.prototype, 'head', {
    get: function () { return this.segments[0]; }
  });

  Object.defineProperty(Snake.prototype, 'length', {
    get: function () { return this.segments.length; }
  });

  /** The direction the snake will be facing once every queued turn resolves. */
  Snake.prototype.pendingDirection = function () {
    return this.queue.length ? this.queue[this.queue.length - 1] : this.direction;
  };

  /** Returns true when the turn was accepted. */
  Snake.prototype.turn = function (directionName) {
    var dir = NS.DIR[directionName];
    if (!dir || this.dead) return false;

    var last = this.pendingDirection();
    if (dir.x === -last.x && dir.y === -last.y) return false;   // illegal reverse
    if (dir.x === last.x && dir.y === last.y) return false;     // already going there
    if (this.queue.length >= NS.CONFIG.input.maxQueuedTurns) return false;

    this.queue.push(dir);
    return true;
  };

  /** Advances one cell and returns the new head position. */
  Snake.prototype.step = function () {
    if (this.queue.length) this.direction = this.queue.shift();

    var head = this.segments[0];
    var next = { x: head.x + this.direction.x, y: head.y + this.direction.y };
    this.segments.unshift(next);

    if (this.growBy > 0) {
      this.growBy--;
      this.grewThisStep = true;
      this.lastTail = null;
    } else {
      this.grewThisStep = false;
      this.lastTail = this.segments.pop();
    }
    return next;
  };

  Snake.prototype.grow = function (amount) {
    this.growBy += (amount || 1);
  };

  /** True when (x, y) is part of the body. */
  Snake.prototype.occupies = function (x, y, skipHead) {
    for (var i = skipHead ? 1 : 0; i < this.segments.length; i++) {
      if (this.segments[i].x === x && this.segments[i].y === y) return true;
    }
    return false;
  };

  /**
   * Self-collision is checked AFTER stepping, so the cell the tail just
   * vacated is legal — exactly how the original game behaves.
   */
  Snake.prototype.hitsSelf = function () {
    var head = this.segments[0];
    for (var i = 1; i < this.segments.length; i++) {
      if (this.segments[i].x === head.x && this.segments[i].y === head.y) return true;
    }
    return false;
  };

  NS.Snake = Snake;

})(window);
