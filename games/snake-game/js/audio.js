/**
 * audio.js
 * ---------------------------------------------------------------------------
 * All sound is SYNTHESISED with the Web Audio API, so the game ships with zero
 * audio files and still has sound. If you drop real samples into
 * assets/audio/ they are loaded on top and used instead — and if a file is
 * missing, the loader fails quietly and the synth version is used.
 *
 * Nothing here is allowed to throw into the game loop: every public method is
 * a no-op when Web Audio is unavailable.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;

  /** Optional samples. Missing files are not an error. */
  var SAMPLES = {
    eat: 'assets/audio/eat.wav',
    bonus: 'assets/audio/bonus.wav',
    click: 'assets/audio/click.wav',
    levelup: 'assets/audio/level-up.wav',
    gameover: 'assets/audio/game-over.wav',
    highscore: 'assets/audio/high-score.wav'
  };

  // Pentatonic scale (A minor) used by both the synth cues and the music loop.
  var SCALE = [
    220.00,
    261.63,
    293.66,
    329.63,
    392.00,
    440.00,
    523.25,
    587.33
  ];

  function AudioManager(options) {
    options = options || {};

    this.basePath = options.basePath || '';

    // Default volume increased from 0.6 to 0.8.
    this.settings = {
      sfx: true,
      music: false,
      volume: 0.8
    };

    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.buffers = {};

    this.supported = !!(
      global.AudioContext ||
      global.webkitAudioContext
    );

    this.unlocked = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.nextNoteAt = 0;
  }

  /* ------------------------------ lifecycle ------------------------------ */

  /**
   * Created lazily: browsers require a user gesture before audio may start.
   */
  AudioManager.prototype.ensureContext = function () {
    if (!this.supported) return null;

    if (this.ctx) return this.ctx;

    try {
      var Ctor =
        global.AudioContext ||
        global.webkitAudioContext;

      this.ctx = new Ctor();

      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings.volume;
      this.master.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.master);

      this.musicGain = this.ctx.createGain();

      // Increased music volume from 0.35 to 0.5.
      this.musicGain.gain.value = 0.5;

      this.musicGain.connect(this.master);

      this.loadSamples();
    } catch (err) {
      this.supported = false;
      this.ctx = null;
    }

    return this.ctx;
  };

  /**
   * Call from any click/keypress so iOS and Chrome allow playback.
   */
  AudioManager.prototype.unlock = function () {
    var ctx = this.ensureContext();

    if (!ctx) return;

    if (ctx.state === 'suspended' && ctx.resume) {
      ctx.resume().catch(function () {
        /* ignored */
      });
    }

    this.unlocked = true;
  };

  AudioManager.prototype.applySettings = function (settings) {
    this.settings.sfx = !!settings.sfx;
    this.settings.music = !!settings.music;

    this.settings.volume = Math.min(
      1,
      Math.max(0, Number(settings.volume) || 0)
    );

    if (this.master) {
      this.master.gain.value = this.settings.volume;
    }

    if (!this.settings.music) {
      this.stopMusic();
    }
  };

  /* --------------------------- optional samples -------------------------- */

  AudioManager.prototype.loadSamples = function () {
    if (!this.ctx || !global.fetch) return;

    var self = this;

    Object.keys(SAMPLES).forEach(function (name) {
      var url = self.basePath + SAMPLES[name];

      global.fetch(url)
        .then(function (res) {
          if (!res.ok) {
            throw new Error('missing');
          }

          return res.arrayBuffer();
        })
        .then(function (data) {
          return new Promise(function (resolve, reject) {
            // Safari still needs the callback form of decodeAudioData.
            var out = self.ctx.decodeAudioData(
              data,
              resolve,
              reject
            );

            if (out && typeof out.then === 'function') {
              out.then(resolve, reject);
            }
          });
        })
        .then(function (buffer) {
          self.buffers[name] = buffer;
        })
        .catch(function () {
          // No sample: the synth voice is used instead.
        });
    });
  };

  /* -------------------------------- SFX ---------------------------------- */

  AudioManager.prototype.play = function (name) {
    if (!this.settings.sfx) return;

    var ctx = this.ensureContext();

    if (!ctx) return;

    if (ctx.state === 'suspended') {
      this.unlock();
    }

    try {
      if (this.buffers[name]) {
        var src = ctx.createBufferSource();

        src.buffer = this.buffers[name];
        src.connect(this.sfxGain);
        src.start(0);

        return;
      }

      this.synth(name);
    } catch (err) {
      // Never break gameplay for a sound.
    }
  };

  /**
   * Small envelope helper: one oscillator, one gain, auto-cleanup.
   */
  AudioManager.prototype.tone = function (opts) {
    var ctx = this.ctx;

    var now =
      ctx.currentTime +
      (opts.delay || 0);

    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = opts.type || 'sine';

    osc.frequency.setValueAtTime(
      opts.from,
      now
    );

    if (opts.to && opts.to !== opts.from) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, opts.to),
        now + opts.duration
      );
    }

    var peak =
      opts.gain === undefined
        ? 0.22
        : opts.gain;

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    gain.gain.exponentialRampToValueAtTime(
      peak,
      now + 0.012
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + opts.duration
    );

    osc.connect(gain);

    gain.connect(
      opts.bus || this.sfxGain
    );

    osc.start(now);

    osc.stop(
      now + opts.duration + 0.05
    );
  };

  AudioManager.prototype.synth = function (name) {
    switch (name) {
      case 'eat':
        this.tone({
          type: 'triangle',
          from: 440,
          to: 880,
          duration: 0.11,
          gain: 0.25
        });
        break;

      case 'bonus':
        this.tone({
          type: 'triangle',
          from: 660,
          to: 990,
          duration: 0.10,
          gain: 0.24
        });

        this.tone({
          type: 'sine',
          from: 990,
          to: 1320,
          duration: 0.14,
          gain: 0.18,
          delay: 0.08
        });
        break;

      case 'click':
        this.tone({
          type: 'square',
          from: 320,
          to: 260,
          duration: 0.05,
          gain: 0.10
        });
        break;

      case 'levelup':
        this.tone({
          type: 'triangle',
          from: 392,
          to: 392,
          duration: 0.14,
          gain: 0.2
        });

        this.tone({
          type: 'triangle',
          from: 523,
          to: 523,
          duration: 0.14,
          gain: 0.2,
          delay: 0.12
        });

        this.tone({
          type: 'triangle',
          from: 659,
          to: 784,
          duration: 0.3,
          gain: 0.22,
          delay: 0.24
        });
        break;

      case 'highscore':
        this.tone({
          type: 'sine',
          from: 523,
          to: 523,
          duration: 0.12,
          gain: 0.2
        });

        this.tone({
          type: 'sine',
          from: 659,
          to: 659,
          duration: 0.12,
          gain: 0.2,
          delay: 0.1
        });

        this.tone({
          type: 'sine',
          from: 784,
          to: 784,
          duration: 0.12,
          gain: 0.2,
          delay: 0.2
        });

        this.tone({
          type: 'sine',
          from: 1046,
          to: 1046,
          duration: 0.45,
          gain: 0.24,
          delay: 0.3
        });
        break;

      case 'gameover':
        this.tone({
          type: 'sawtooth',
          from: 330,
          to: 110,
          duration: 0.55,
          gain: 0.18
        });

        this.tone({
          type: 'sine',
          from: 220,
          to: 70,
          duration: 0.7,
          gain: 0.16,
          delay: 0.1
        });
        break;

      case 'pause':
        this.tone({
          type: 'sine',
          from: 520,
          to: 380,
          duration: 0.12,
          gain: 0.14
        });
        break;

      case 'resume':
        this.tone({
          type: 'sine',
          from: 380,
          to: 560,
          duration: 0.12,
          gain: 0.14
        });
        break;

      default:
        this.tone({
          type: 'sine',
          from: 440,
          to: 440,
          duration: 0.08,
          gain: 0.12
        });
    }
  };

  /* ------------------------------- music --------------------------------- */

  /**
   * A short procedural loop: a low pulse on the beat plus a wandering
   * pentatonic arpeggio. Scheduled with a lookahead window so it stays in
   * time even when the main thread is busy.
   */
  AudioManager.prototype.startMusic = function () {
    if (!this.settings.music || this.musicTimer) {
      return;
    }

    var ctx = this.ensureContext();

    if (!ctx) return;

    var self = this;

    this.musicStep = 0;
    this.nextNoteAt =
      ctx.currentTime + 0.1;

    this.musicTimer = global.setInterval(
      function () {
        self.scheduleMusic();
      },
      60
    );
  };

  AudioManager.prototype.stopMusic = function () {
    if (this.musicTimer) {
      global.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  };

  AudioManager.prototype.scheduleMusic = function () {
    if (!this.ctx || !this.settings.music) {
      this.stopMusic();
      return;
    }

    var stepDuration = 0.26;
    var horizon =
      this.ctx.currentTime + 0.4;

    var pattern = [
      0,
      2,
      4,
      2,
      5,
      4,
      2,
      0
    ];

    while (this.nextNoteAt < horizon) {
      var step = this.musicStep % 8;

      var delay =
        this.nextNoteAt -
        this.ctx.currentTime;

      if (delay >= 0) {
        if (step % 4 === 0) {
          this.tone({
            type: 'sine',
            from: 110,
            to: 110,
            duration: 0.3,
            gain: 0.16,
            delay: delay,
            bus: this.musicGain
          });
        }

        var note =
          SCALE[pattern[step]] *
          (
            this.musicStep % 16 >= 8
              ? 1.5
              : 1
          );

        this.tone({
          type: 'triangle',
          from: note,
          to: note,
          duration: 0.22,
          gain: 0.07,
          delay: delay,
          bus: this.musicGain
        });
      }

      this.nextNoteAt += stepDuration;
      this.musicStep++;
    }
  };

  NS.AudioManager = AudioManager;

})(window);
