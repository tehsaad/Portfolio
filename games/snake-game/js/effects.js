/**
 * effects.js
 * ---------------------------------------------------------------------------
 * Particles, floating score text, screen shake and the on-canvas banner.
 *
 * Particles live in a fixed-size pool: dead ones are reused instead of being
 * allocated again, which keeps the garbage collector out of the game loop.
 * All coordinates are in GRID units, so effects scale with the board.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;

  function Effects() {
    this.particles = [];
    this.texts = [];
    this.shake = 0;
    this.banner = null;
    this.enableParticles = true;
    this.enableShake = true;

    var max = NS.CONFIG.particles.max;
    for (var i = 0; i < max; i++) {
      this.particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, color: '#fff' });
    }
  }

  Effects.prototype.applySettings = function (settings) {
    this.enableParticles = !!settings.particles && !settings.reducedMotion;
    this.enableShake = !!settings.shake && !settings.reducedMotion;
    if (!this.enableParticles) this.clearParticles();
    if (!this.enableShake) this.shake = 0;
  };

  Effects.prototype.clearParticles = function () {
    for (var i = 0; i < this.particles.length; i++) this.particles[i].active = false;
  };

  Effects.prototype.clear = function () {
    this.clearParticles();
    this.texts.length = 0;
    this.shake = 0;
    this.banner = null;
  };

  /** Radial burst of particles at a grid position. */
  Effects.prototype.burst = function (x, y, color, count, power) {
    if (!this.enableParticles) return;
    var wanted = count || NS.CONFIG.particles.perFood;
    var speed = power || 6;
    var spawned = 0;

    for (var i = 0; i < this.particles.length && spawned < wanted; i++) {
      var p = this.particles[i];
      if (p.active) continue;
      var angle = Math.random() * Math.PI * 2;
      var velocity = speed * (0.35 + Math.random() * 0.65);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * velocity;
      p.vy = Math.sin(angle) * velocity;
      p.maxLife = NS.CONFIG.particles.life * (0.6 + Math.random() * 0.7);
      p.life = p.maxLife;
      p.size = 0.08 + Math.random() * 0.14;
      p.color = color;
      spawned++;
    }
  };

  Effects.prototype.floatText = function (x, y, text, color) {
    if (this.texts.length > 12) this.texts.shift();
    this.texts.push({ x: x, y: y, text: text, color: color, life: 0.9, maxLife: 0.9 });
  };

  Effects.prototype.addShake = function (amount) {
    if (!this.enableShake) return;
    this.shake = Math.min(20, this.shake + amount);
  };

  Effects.prototype.showBanner = function (title, subtitle, seconds) {
    this.banner = { title: title, subtitle: subtitle || '', life: seconds || 1.6, maxLife: seconds || 1.6 };
  };

  Effects.prototype.update = function (dt) {
    var drag = Math.pow(0.02, dt);      // frame-rate independent damping

    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= drag;
      p.vy *= drag;
    }

    for (var t = this.texts.length - 1; t >= 0; t--) {
      var text = this.texts[t];
      text.life -= dt;
      text.y -= dt * 1.4;
      if (text.life <= 0) this.texts.splice(t, 1);
    }

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 26);
    }

    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
  };

  NS.Effects = Effects;

})(window);
