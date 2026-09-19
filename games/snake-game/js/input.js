/**
 * input.js
 * ---------------------------------------------------------------------------
 * Translates keyboard and swipe events into two callbacks:
 *   onDirection('up' | 'down' | 'left' | 'right')
 *   onAction('pause' | 'back')
 *
 * Embedding note: arrow keys are only swallowed while a game is actually
 * running (or while focus is inside the game), so the host page keeps normal
 * scrolling everywhere else.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;

  var KEY_DIRECTIONS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', a: 'left', s: 'down', d: 'right',
    W: 'up', A: 'left', S: 'down', D: 'right',
    // Older/edge browsers that still report the legacy names.
    Up: 'up', Down: 'down', Left: 'left', Right: 'right'
  };

  var SCROLL_KEYS = {
    ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, ' ': 1, Spacebar: 1,
    Up: 1, Down: 1, Left: 1, Right: 1
  };

  function InputManager(root, handlers) {
    this.root = root;
    this.onDirection = handlers.onDirection || function () {};
    this.onAction = handlers.onAction || function () {};
    this.isActive = handlers.isActive || function () { return false; };
    // Swiping is only allowed while the board is actually being played, so an
    // open menu panel can still be scrolled with a finger.
    this.canSwipe = handlers.canSwipe || function () { return false; };

    this.touchStart = null;
    this.bound = {};
    this.hasTouch = ('ontouchstart' in global) ||
      (global.navigator && global.navigator.maxTouchPoints > 0);
  }

  InputManager.prototype.attach = function (stage) {
    var self = this;

    this.bound.keydown = function (event) { self.handleKey(event); };
    global.addEventListener('keydown', this.bound.keydown, false);

    if (stage) {
      this.bound.touchstart = function (e) { self.handleTouchStart(e); };
      this.bound.touchmove = function (e) { self.handleTouchMove(e); };
      this.bound.touchend = function (e) { self.handleTouchEnd(e); };
      this.bound.touchcancel = function () { self.handleTouchCancel(); };
      stage.addEventListener('touchstart', this.bound.touchstart, { passive: true });
      stage.addEventListener('touchmove', this.bound.touchmove, { passive: false });
      stage.addEventListener('touchend', this.bound.touchend, { passive: true });
      stage.addEventListener('touchcancel', this.bound.touchcancel, { passive: true });
      this.stage = stage;
    }

  };

  InputManager.prototype.detach = function () {
    if (this.bound.keydown) global.removeEventListener('keydown', this.bound.keydown, false);
    if (this.stage && this.bound.touchstart) {
      this.stage.removeEventListener('touchstart', this.bound.touchstart);
      this.stage.removeEventListener('touchmove', this.bound.touchmove);
      this.stage.removeEventListener('touchend', this.bound.touchend);
      this.stage.removeEventListener('touchcancel', this.bound.touchcancel);
    }
    this.bound = {};
  };

  InputManager.prototype.isTypingTarget = function (target) {
    if (!target || !target.tagName) return false;
    var tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  };

  InputManager.prototype.handleKey = function (event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (this.isTypingTarget(event.target)) return;

    var focusInside = this.root.contains(document.activeElement);
    var active = this.isActive();
    if (!active && !focusInside) return;

    var key = event.key;
    var direction = KEY_DIRECTIONS[key];

    if (direction) {
      if (active && SCROLL_KEYS[key]) event.preventDefault();
      this.onDirection(direction);
      return;
    }

    if (key === 'p' || key === 'P') {
      event.preventDefault();
      this.onAction('pause');
      return;
    }

    if (key === 'Escape' || key === 'Esc') {
      this.onAction('back');
      return;
    }

    if ((key === ' ' || key === 'Spacebar') && active) {
      // Space must keep activating a focused button.
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag !== 'BUTTON' && tag !== 'A') {
        event.preventDefault();
        this.onAction('pause');
      }
    }
  };

  /* ------------------------------- touch --------------------------------- */
  /*
   * Swipe steering. The turn is fired AS SOON AS the finger has moved far
   * enough (not when it is lifted), so the snake reacts instantly. After a
   * turn fires, the start point is reset to the finger's current position, so
   * one continuous drag can chain several turns (e.g. right, then down).
   */

  InputManager.prototype.findTouch = function (list) {
    if (!list || !this.touchStart) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].identifier === this.touchStart.id) return list[i];
    }
    return null;
  };

  InputManager.prototype.fireSwipe = function (dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.onDirection(dx > 0 ? 'right' : 'left');
    } else {
      this.onDirection(dy > 0 ? 'down' : 'up');
    }
  };

  InputManager.prototype.handleTouchStart = function (event) {
    // Two fingers down together = "tap with two fingers" (pause / resume).
    // Remembered here, confirmed in handleTouchEnd if both fingers lift
    // quickly without sliding.
    if (event.touches && event.touches.length >= 2 && this.isActive()) {
      var points = {};
      for (var i = 0; i < event.touches.length; i++) {
        var t = event.touches[i];
        points[t.identifier] = { x: t.clientX, y: t.clientY };
      }
      this.multi = { time: Date.now(), points: points };
      this.touchStart = null;
      return;
    }

    if (!this.canSwipe()) return;
    // A touch that starts on a menu panel belongs to that panel.
    if (event.target && event.target.closest && event.target.closest('[data-overlay]')) return;
    var touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    this.touchStart = {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      fired: false
    };
  };

  InputManager.prototype.handleTouchMove = function (event) {
    // Sliding fingers cancel a two-finger tap.
    if (this.multi) {
      for (var i = 0; i < event.changedTouches.length; i++) {
        var t = event.changedTouches[i];
        var p = this.multi.points[t.identifier];
        if (p && Math.abs(t.clientX - p.x) + Math.abs(t.clientY - p.y) > 16) {
          this.multi = null;
          break;
        }
      }
    }

    if (!this.touchStart) return;

    // Stop the page from scrolling / rubber-banding while the player swipes.
    if (this.canSwipe() && event.cancelable) event.preventDefault();

    var touch = this.findTouch(event.changedTouches);
    if (!touch) return;

    var dx = touch.clientX - this.touchStart.x;
    var dy = touch.clientY - this.touchStart.y;
    var threshold = NS.CONFIG.input.swipeThreshold;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    this.fireSwipe(dx, dy);

    // Continue from here, so the same drag can steer again.
    this.touchStart.x = touch.clientX;
    this.touchStart.y = touch.clientY;
    this.touchStart.fired = true;
  };

  InputManager.prototype.handleTouchEnd = function (event) {
    if (this.multi) {
      var quick = Date.now() - this.multi.time < 350;
      this.multi = null;
      if (quick) this.onAction('pause');
      return;
    }

    if (!this.touchStart) return;

    var touch = this.findTouch(event.changedTouches);
    if (!touch) return;

    var start = this.touchStart;
    this.touchStart = null;

    // Already turned during the drag — nothing left to do.
    if (start.fired) return;

    var dx = touch.clientX - start.x;
    var dy = touch.clientY - start.y;
    var threshold = NS.CONFIG.input.swipeThreshold;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    this.fireSwipe(dx, dy);
  };

  InputManager.prototype.handleTouchCancel = function () {
    this.touchStart = null;
    this.multi = null;
  };

  NS.InputManager = InputManager;

})(window);
