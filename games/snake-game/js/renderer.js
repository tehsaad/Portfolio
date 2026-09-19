/**
 * renderer.js
 * ---------------------------------------------------------------------------
 * Everything drawn on the canvas.
 *
 * Coordinate system: the game always thinks in a fixed logical grid
 * (cols x rows). The renderer measures the canvas element on screen, works out
 * a cell size in CSS pixels, and multiplies the backing store by
 * devicePixelRatio so the board stays sharp on retina displays. Resizing the
 * window therefore never changes gameplay — only the size of a cell.
 *
 * The background (gradient + grid + frame) is drawn once into an offscreen
 * canvas and blitted each frame, so a resize is the only time that work runs.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;
  var THEME = NS.THEME;
  var TYPES = NS.FOOD_TYPE;

  function Renderer(canvas, cols, rows) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = cols;
    this.rows = rows;

    this.cssWidth = 0;
    this.cssHeight = 0;
    this.dpr = 1;
    this.cell = 20;
    this.offsetX = 0;
    this.offsetY = 0;

    // Phones/tablets (coarse pointer): skip the expensive glow blur and cap
    // the backing-store size. This is what keeps the game smooth on mobile.
    this.lite = !!(
      global.matchMedia &&
      global.matchMedia('(pointer: coarse)').matches
    );

    this.showGrid = true;
    this.glow = !this.lite;

    this.background = document.createElement('canvas');
    this.backgroundDirty = true;
  }

  Renderer.prototype.applySettings = function (settings) {
    var grid = !!settings.grid;
    if (grid !== this.showGrid) {
      this.showGrid = grid;
      this.backgroundDirty = true;
    }
    this.glow = !settings.reducedMotion && !this.lite;
  };

  Renderer.prototype.setGrid = function (cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.backgroundDirty = true;
    this.resize(true);
  };

  /** Returns true when the canvas actually changed size. */
  Renderer.prototype.resize = function (force) {
    var rect = this.canvas.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width));
    var height = Math.max(1, Math.round(rect.height));
    // Cap the ratio: a 3x backing store on a big phone costs more than it shows.
    var dpr = Math.min(global.devicePixelRatio || 1, this.lite ? 2 : 2.5);

    if (!force && width === this.cssWidth && height === this.cssHeight && dpr === this.dpr) {
      return false;
    }

    this.cssWidth = width;
    this.cssHeight = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);

    this.cell = Math.min(width / this.cols, height / this.rows);
    this.offsetX = (width - this.cell * this.cols) / 2;
    this.offsetY = (height - this.cell * this.rows) / 2;
    this.backgroundDirty = true;
    return true;
  };

  /* ------------------------------ helpers -------------------------------- */

  Renderer.prototype.px = function (gridX) { return this.offsetX + gridX * this.cell; };
  Renderer.prototype.py = function (gridY) { return this.offsetY + gridY * this.cell; };
  Renderer.prototype.cx = function (gridX) { return this.offsetX + (gridX + 0.5) * this.cell; };
  Renderer.prototype.cy = function (gridY) { return this.offsetY + (gridY + 0.5) * this.cell; };

  function roundedRect(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /* ---------------------------- background ------------------------------- */

  Renderer.prototype.buildBackground = function () {
    var bg = this.background;
    bg.width = this.canvas.width;
    bg.height = this.canvas.height;
    var ctx = bg.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    var gradient = ctx.createLinearGradient(0, 0, 0, this.cssHeight);
    gradient.addColorStop(0, THEME.backdropTop);
    gradient.addColorStop(1, THEME.backdropBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

    var boardW = this.cell * this.cols;
    var boardH = this.cell * this.rows;

    if (this.showGrid) {
      ctx.lineWidth = 1;
      for (var x = 0; x <= this.cols; x++) {
        ctx.strokeStyle = (x % 5 === 0) ? THEME.gridMajor : THEME.gridMinor;
        var gx = Math.round(this.px(x)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(gx, this.offsetY);
        ctx.lineTo(gx, this.offsetY + boardH);
        ctx.stroke();
      }
      for (var y = 0; y <= this.rows; y++) {
        ctx.strokeStyle = (y % 5 === 0) ? THEME.gridMajor : THEME.gridMinor;
        var gy = Math.round(this.py(y)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(this.offsetX, gy);
        ctx.lineTo(this.offsetX + boardW, gy);
        ctx.stroke();
      }
    }

    // Board edge — the line the player must not cross.
    ctx.strokeStyle = THEME.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.offsetX + 1, this.offsetY + 1, boardW - 2, boardH - 2);

    this.backgroundDirty = false;
  };

  /* ------------------------------- frame --------------------------------- */

  /**
   * @param {Object} scene { snake, foods, obstacles, effects, state,
   *                         countdown, countdownLabel, dim, alpha }
   */
  Renderer.prototype.render = function (scene) {
    // Measuring is driven by Game (ResizeObserver), never per frame — reading
    // layout every frame would force a reflow 60 times a second.
    if (!this.cssWidth) this.resize(true);
    if (this.backgroundDirty) this.buildBackground();

    var ctx = this.ctx;
    var time = global.performance && global.performance.now ? global.performance.now() / 1000 : Date.now() / 1000;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    ctx.drawImage(this.background, 0, 0, this.cssWidth, this.cssHeight);

    ctx.save();

    var shake = scene.effects ? scene.effects.shake : 0;
    if (shake > 0) {
      var scale = this.cell / 22;
      ctx.translate((Math.random() - 0.5) * shake * scale, (Math.random() - 0.5) * shake * scale);
    }

    if (scene.obstacles && scene.obstacles.length) this.drawObstacles(scene.obstacles);
    if (scene.foods) this.drawFoods(scene.foods, time);
    if (scene.snake && scene.snake.segments.length) {
      this.drawSnake(scene.snake, scene.alpha || 0, scene.dying, time);
    }
    if (scene.effects) {
      this.drawParticles(scene.effects);
      this.drawTexts(scene.effects);
    }

    ctx.restore();

    if (scene.dim) {
      ctx.fillStyle = 'rgba(8, 13, 20, 0.55)';
      ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
    }

    if (scene.countdown > 0) this.drawCountdown(scene.countdown, scene.countdownLabel);
    if (scene.effects && scene.effects.banner) this.drawBanner(scene.effects.banner);
  };

  /* ----------------------------- obstacles ------------------------------- */

  Renderer.prototype.drawObstacles = function (cells) {
    var ctx = this.ctx;
    var cell = this.cell;
    var pad = cell * 0.06;
    ctx.fillStyle = THEME.obstacle;
    ctx.strokeStyle = THEME.obstacleEdge;
    ctx.lineWidth = 1;

    for (var i = 0; i < cells.length; i++) {
      var x = this.px(cells[i].x) + pad;
      var y = this.py(cells[i].y) + pad;
      var size = cell - pad * 2;
      roundedRect(ctx, x, y, size, size, cell * 0.16);
      ctx.fill();
      ctx.stroke();
    }
  };

  /* -------------------------------- food --------------------------------- */

  Renderer.prototype.drawFoods = function (foods, time) {
    for (var i = 0; i < foods.items.length; i++) {
      var item = foods.items[i];
      // Blink out the last second and a half of a timed item.
      if (item.maxLife > 0 && item.life < 1.5 && Math.floor(time * 8) % 2 === 0) continue;
      this.drawFood(item, time);
    }
  };

  Renderer.prototype.drawFood = function (item, time) {
    var ctx = this.ctx;
    var cell = this.cell;
    var x = this.cx(item.x);
    var y = this.cy(item.y);
    var pulse = 1 + Math.sin(time * 4 + item.phase) * 0.07;
    var radius = cell * 0.3 * pulse;

    ctx.save();

    if (item.type === TYPES.BONUS) {
      ctx.translate(x, y);
      ctx.rotate(time * 1.2);
      ctx.fillStyle = THEME.bonus;
      if (this.glow) { ctx.shadowColor = THEME.bonus; ctx.shadowBlur = cell * 0.7; }
      ctx.beginPath();
      ctx.moveTo(0, -radius * 1.25);
      ctx.lineTo(radius * 1.25, 0);
      ctx.lineTo(0, radius * 1.25);
      ctx.lineTo(-radius * 1.25, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      this.drawLifeRing(item, x, y, THEME.bonus);
      return;
    }

    if (item.type === TYPES.SPECIAL) {
      ctx.fillStyle = THEME.special;
      if (this.glow) { ctx.shadowColor = THEME.special; ctx.shadowBlur = cell * 0.8; }
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(233, 226, 208, 0.9)';
      for (var i = 0; i < 3; i++) {
        var angle = time * 2.4 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * radius * 1.35, y + Math.sin(angle) * radius * 1.35, cell * 0.055, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      this.drawLifeRing(item, x, y, THEME.special);
      return;
    }

    var gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.15, x, y, radius);
    gradient.addColorStop(0, THEME.foodNormalCore);
    gradient.addColorStop(1, THEME.foodNormal);
    ctx.fillStyle = gradient;
    if (this.glow) { ctx.shadowColor = 'rgba(233, 226, 208, 0.55)'; ctx.shadowBlur = cell * 0.55; }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  /** Thin arc around timed food showing how long it will stay. */
  Renderer.prototype.drawLifeRing = function (item, x, y, color) {
    if (item.maxLife <= 0) return;
    var ctx = this.ctx;
    var portion = Math.max(0, item.life / item.maxLife);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = Math.max(1.2, this.cell * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, this.cell * 0.44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * portion);
    ctx.stroke();
    ctx.restore();
  };

  /* ------------------------------- snake --------------------------------- */

  Renderer.prototype.drawSnake = function (snake, alpha, dying, time) {
    var ctx = this.ctx;
    var cell = this.cell;
    var segments = snake.segments;
    var points = [];
    var self = this;

    function point(cellRef) { return { x: self.cx(cellRef.x), y: self.cy(cellRef.y) }; }
    function lerp(from, to, t) {
      return { x: point(from).x + (point(to).x - point(from).x) * t,
               y: point(from).y + (point(to).y - point(from).y) * t };
    }

    // Head slides out of the neck; the rest of the body sits on the grid.
    if (segments.length > 1) {
      points.push(lerp(segments[1], segments[0], alpha));
    } else {
      points.push(point(segments[0]));
    }
    for (var i = 1; i < segments.length - 1; i++) points.push(point(segments[i]));

    if (segments.length > 1) {
      var tail = segments[segments.length - 1];
      if (!snake.grewThisStep && snake.lastTail) {
        points.push(lerp(snake.lastTail, tail, alpha));
      } else {
        points.push(point(tail));
      }
    }

    var bodyColor = THEME.snakeBody;
    var headColor = THEME.snakeHead;
    if (dying && Math.floor(time * 12) % 2 === 0) {
      bodyColor = THEME.snakeDead;
      headColor = THEME.snakeDead;
    }

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (points.length === 1) {
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, cell * 0.39, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (var p = 1; p < points.length; p++) ctx.lineTo(points[p].x, points[p].y);

      if (this.glow && !dying) {
        ctx.shadowColor = 'rgba(99, 199, 155, 0.5)';
        ctx.shadowBlur = cell * 0.6;
      }
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = cell * 0.78;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = dying ? 'rgba(233, 226, 208, 0.25)' : 'rgba(99, 199, 155, 0.55)';
      ctx.lineWidth = cell * 0.26;
      ctx.stroke();
    }

    // Head + eyes
    var head = points[0];
    var dir = snake.direction;
    ctx.shadowBlur = 0;
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(head.x, head.y, cell * 0.42, 0, Math.PI * 2);
    ctx.fill();

    var forward = cell * 0.13;
    var side = cell * 0.16;
    var eyeRadius = cell * 0.09;
    var ex = head.x + dir.x * forward;
    var ey = head.y + dir.y * forward;
    ctx.fillStyle = THEME.eye;
    ctx.beginPath();
    ctx.arc(ex - dir.y * side, ey - dir.x * side, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + dir.y * side, ey + dir.x * side, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  /* ------------------------------ effects -------------------------------- */

  Renderer.prototype.drawParticles = function (effects) {
    var ctx = this.ctx;
    var cell = this.cell;
    ctx.save();
    for (var i = 0; i < effects.particles.length; i++) {
      var p = effects.particles[i];
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      var size = p.size * cell;
      ctx.fillRect(this.cx(p.x) - size / 2, this.cy(p.y) - size / 2, size, size);
    }
    ctx.restore();
  };

  Renderer.prototype.drawTexts = function (effects) {
    var ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 ' + Math.round(this.cell * 0.78) + 'px ui-monospace, "IBM Plex Mono", Menlo, monospace';
    for (var i = 0; i < effects.texts.length; i++) {
      var text = effects.texts[i];
      ctx.globalAlpha = Math.max(0, text.life / text.maxLife);
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, this.cx(text.x), this.cy(text.y));
    }
    ctx.restore();
  };

  Renderer.prototype.drawCountdown = function (countdown, label) {
    var ctx = this.ctx;
    var value = Math.ceil(countdown);
    var fraction = countdown - Math.floor(countdown);

    ctx.save();
    ctx.fillStyle = 'rgba(8, 13, 20, 0.45)';
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = THEME.text;
    ctx.globalAlpha = 0.45 + fraction * 0.55;
    ctx.font = '700 ' + Math.round(this.cell * 3.4) + 'px ui-monospace, "IBM Plex Mono", Menlo, monospace';
    ctx.fillText(String(value), this.cssWidth / 2, this.cssHeight / 2);

    if (label) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = THEME.textDim;
      ctx.font = '500 ' + Math.round(this.cell * 0.7) + 'px ui-monospace, "IBM Plex Mono", Menlo, monospace';
      ctx.fillText(label, this.cssWidth / 2, this.cssHeight / 2 + this.cell * 2.4);
    }
    ctx.restore();
  };

  Renderer.prototype.drawBanner = function (banner) {
    var ctx = this.ctx;
    var progress = 1 - banner.life / banner.maxLife;
    var fade = Math.min(1, Math.min(progress * 6, (1 - progress) * 6));

    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var y = this.cssHeight * 0.34;
    ctx.fillStyle = 'rgba(8, 13, 20, 0.7)';
    ctx.fillRect(0, y - this.cell * 1.5, this.cssWidth, this.cell * 3);

    ctx.fillStyle = THEME.bonus;
    ctx.font = '700 ' + Math.round(this.cell * 1.15) + 'px ui-monospace, "IBM Plex Mono", Menlo, monospace';
    ctx.fillText(banner.title, this.cssWidth / 2, y - this.cell * 0.35);

    if (banner.subtitle) {
      ctx.fillStyle = THEME.textDim;
      ctx.font = '500 ' + Math.round(this.cell * 0.62) + 'px ui-monospace, "IBM Plex Mono", Menlo, monospace';
      ctx.fillText(banner.subtitle, this.cssWidth / 2, y + this.cell * 0.75);
    }
    ctx.restore();
  };

  NS.Renderer = Renderer;

})(window);
