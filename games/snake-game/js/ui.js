/**
 * ui.js
 * ---------------------------------------------------------------------------
 * Owns every piece of DOM inside the wrapper: HUD, menus, overlays, settings
 * form, player form, leaderboard and the touch pad.
 *
 * Class names are all prefixed `snake-` and the stylesheet only ever selects
 * inside #snake-game, so nothing here can collide with a host site.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function button(action, label, extra, attrs) {
    return '<button type="button" class="snake-game__button' + (extra || '') +
      '" data-action="' + action + '"' + (attrs || '') + '>' +
      label +
      '</button>';
  }

  function modeCards() {
    return NS.MODE_ORDER.map(function (id) {
      var mode = NS.MODES[id];

      var rules = mode.rules.map(function (rule) {
        return '<li>' + escapeHtml(rule) + '</li>';
      }).join('');

      return '' +
        '<article class="snake-option">' +
          '<div class="snake-option__head">' +
            '<h4 class="snake-option__name">' +
              escapeHtml(mode.label) +
            '</h4>' +
            '<p class="snake-option__best" data-mode-best="' +
              id +
            '">best 0</p>' +
          '</div>' +

          '<p class="snake-option__blurb">' +
            escapeHtml(mode.blurb) +
          '</p>' +

          '<ul class="snake-option__rules">' +
            rules +
          '</ul>' +

          '<div class="snake-option__actions">' +
            '<button type="button" ' +
              'class="snake-game__button snake-game__button--small" ' +
              'data-action="select-mode" ' +
              'data-mode="' + id + '" ' +
              'data-selectable="mode" ' +
              'aria-pressed="false">' +
              'Choose' +
            '</button>' +

            '<button type="button" ' +
              'class="snake-game__button snake-game__button--small ' +
              'snake-game__button--primary" ' +
              'data-action="play-mode" ' +
              'data-mode="' + id + '">' +
              'Play ' + escapeHtml(mode.label) +
            '</button>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  function difficultyCards() {
    return NS.DIFFICULTY_ORDER.map(function (id) {
      var diff = NS.DIFFICULTIES[id];

      return '' +
        '<button type="button" ' +
          'class="snake-option snake-option--button" ' +
          'data-action="select-difficulty" ' +
          'data-difficulty="' + id + '" ' +
          'data-selectable="difficulty" ' +
          'aria-pressed="false">' +

          '<span class="snake-option__name">' +
            escapeHtml(diff.label) +
          '</span>' +

          '<span class="snake-option__blurb">' +
            escapeHtml(diff.blurb) +
          '</span>' +

          '<span class="snake-option__stats">' +
            'start ' + diff.startSpeed +
            ' cells/s · score x' + diff.scoreMultiplier +
          '</span>' +

        '</button>';
    }).join('');
  }

  function howToModes() {
    return NS.MODE_ORDER.map(function (id) {
      var mode = NS.MODES[id];

      return '<dt>' +
        escapeHtml(mode.label) +
        '</dt><dd>' +
        escapeHtml(mode.blurb) +
        '</dd>';
    }).join('');
  }

  function toggleRow(key, label, hint) {
    return '' +
      '<div class="snake-setting">' +

        '<label class="snake-setting__label" ' +
          'for="snake-set-' + key + '">' +

          escapeHtml(label) +

          (hint
            ? '<span class="snake-setting__hint">' +
                escapeHtml(hint) +
              '</span>'
            : '') +

        '</label>' +

        '<input ' +
          'class="snake-setting__toggle" ' +
          'type="checkbox" ' +
          'id="snake-set-' + key + '" ' +
          'data-setting="' + key + '">' +

      '</div>';
  }

  function template() {
    return '' +

    '<div class="snake-game__frame">' +

      /* ------------------------------------------------------------------ */
      /* HUD                                                                */
      /* ------------------------------------------------------------------ */

      '<header class="snake-game__hud" data-hud-root hidden>' +

        '<div class="snake-hud__item">' +
          '<span class="snake-hud__label">Score</span>' +
          '<span class="snake-hud__value" data-hud="score">0</span>' +
        '</div>' +

        '<div class="snake-hud__item">' +
          '<span class="snake-hud__label">Best</span>' +
          '<span class="snake-hud__value" data-hud="high">0</span>' +
        '</div>' +

        '<div class="snake-hud__item" data-hud-item="level">' +
          '<span class="snake-hud__label">Level</span>' +
          '<span class="snake-hud__value" data-hud="level">1</span>' +
        '</div>' +

        '<div class="snake-hud__item">' +
          '<span class="snake-hud__label">Speed</span>' +
          '<span class="snake-hud__value" data-hud="speed">9</span>' +
        '</div>' +

        '<div class="snake-hud__item" data-hud-item="time">' +
          '<span class="snake-hud__label">Time</span>' +
          '<span class="snake-hud__value" data-hud="time">1:00</span>' +
        '</div>' +

        '<div class="snake-hud__effects" data-hud="effects"></div>' +

      '</header>' +


      /* ------------------------------------------------------------------ */
      /* GAME STAGE                                                          */
      /* ------------------------------------------------------------------ */

      '<div class="snake-game__stage" data-stage>' +

        '<canvas ' +
          'class="snake-game__canvas" ' +
          'data-canvas ' +
          'aria-hidden="true">' +
        '</canvas>' +

        '<p ' +
          'class="snake-game__sr" ' +
          'data-live ' +
          'aria-live="polite">' +
        '</p>' +

        '<div class="snake-game__overlay" data-overlay>' +


          /* -------------------------------------------------------------- */
          /* MENU                                                            */
          /* -------------------------------------------------------------- */

          '<section ' +
            'class="snake-screen" ' +
            'data-screen="menu" ' +
            'hidden>' +

            '<div class="snake-screen__panel snake-screen__panel--menu">' +

              '<h2 class="snake-title">SNAKE</h2>' +

              '<p class="snake-subtitle">' +
                'Classic browser game' +
              '</p>' +

              '<div class="snake-menu">' +

                button(
                  'play',
                  'Play',
                  ' snake-game__button--primary'
                ) +

                button(
                  'open-modes',
                  'Game mode'
                ) +

                button(
                  'open-difficulty',
                  'Difficulty'
                ) +

                button(
                  'open-leaderboard',
                  'Leaderboard'
                ) +

                button(
                  'open-settings',
                  'Settings'
                ) +

                button(
                  'open-howto',
                  'How to play'
                ) +

              '</div>' +

              '<p ' +
                'class="snake-menu__status" ' +
                'data-menu-status>' +
              '</p>' +

            '</div>' +

          '</section>' +


          /* -------------------------------------------------------------- */
          /* MODES                                                            */
          /* -------------------------------------------------------------- */

          '<section ' +
            'class="snake-screen" ' +
            'data-screen="modes" ' +
            'hidden ' +
            'aria-label="Game mode">' +

            '<div class="snake-screen__panel snake-screen__panel--wide">' +

              '<h3 class="snake-screen__title">' +
                'Game mode' +
              '</h3>' +

              '<div class="snake-option-grid">' +
                modeCards() +
              '</div>' +

              '<div class="snake-screen__foot">' +
                button('back', 'Back') +
              '</div>' +

            '</div>' +

          '</section>' +


          /* -------------------------------------------------------------- */
          /* DIFFICULTY                                                       */
          /* -------------------------------------------------------------- */

          '<section ' +
            'class="snake-screen" ' +
            'data-screen="difficulty" ' +
            'hidden ' +
            'aria-label="Difficulty">' +

            '<div class="snake-screen__panel">' +

              '<h3 class="snake-screen__title">' +
                'Difficulty' +
              '</h3>' +

              '<div class="snake-option-list">' +
                difficultyCards() +
              '</div>' +

              '<div class="snake-screen__foot">' +
                button('back', 'Back') +
              '</div>' +

            '</div>' +

          '</section>' +


          /* -------------------------------------------------------------- */
          /* PLAYER                                                            */
          /* -------------------------------------------------------------- */

          '<section ' +
            'class="snake-screen" ' +
            'data-screen="player" ' +
            'hidden ' +
            'aria-label="Player">' +

            '<div class="snake-screen__panel snake-screen__panel--compact">' +

              '<h3 class="snake-screen__title">' +
                'Player' +
              '</h3>' +

              '<p class="snake-screen__note">' +
                'Enter your details to save your scores and plays. ' +
                'Your email is kept private and is never shown on the leaderboard.' +
              '</p>' +

              '<form ' +
                'class="snake-player-form" ' +
                'data-player-form ' +
                'novalidate>' +

                '<label ' +
                  'class="snake-player-form__label" ' +
                  'for="snake-player-name">' +
                  'Name' +
                '</label>' +

                '<input ' +
                  'class="snake-player-form__input" ' +
                  'id="snake-player-name" ' +
                  'name="name" ' +
                  'type="text" ' +
                  'autocomplete="name" ' +
                  'maxlength="60" ' +
                  'placeholder="Your name" ' +
                  'required>' +

                '<label ' +
                  'class="snake-player-form__label" ' +
                  'for="snake-player-email">' +
                  'Email' +
                '</label>' +

                '<input ' +
                  'class="snake-player-form__input" ' +
                  'id="snake-player-email" ' +
                  'name="email" ' +
                  'type="email" ' +
                  'autocomplete="email" ' +
                  'maxlength="254" ' +
                  'placeholder="you@example.com" ' +
                  'required>' +

                '<p ' +
                  'class="snake-player-form__error" ' +
                  'data-player-error ' +
                  'aria-live="polite">' +
                '</p>' +

                '<div class="snake-menu">' +

                  button(
                    'player-continue',
                    'Continue',
                    ' snake-game__button--primary'
                  ) +

                  button(
                    'player-load',
                    'Load previous data'
                  ) +

                  button(
                    'back',
                    'Back',
                    ' snake-game__button--quiet'
                  ) +

                '</div>' +

              '</form>' +

            '</div>' +

          '</section>' +


          /* -------------------------------------------------------------- */
          /* LEADERBOARD                                                      */
          /* -------------------------------------------------------------- */

          '<section ' +
            'class="snake-screen" ' +
            'data-screen="leaderboard" ' +
            'hidden ' +
            'aria-label="Leaderboard">' +

            '<div class="snake-screen__panel snake-screen__panel--wide">' +

              '<h3 class="snake-screen__title">' +
                'Leaderboard' +
              '</h3>' +

              '<p ' +
                'class="snake-screen__note" ' +
                'data-leaderboard-status>' +
                'Top scores from Snake players.' +
              '</p>' +

              '<div class="snake-leaderboard" data-leaderboard>' +

                '<div ' +
                  'class="snake-leaderboard__loading" ' +
                  'data-leaderboard-loading ' +
                  'hidden>' +
                  'Loading leaderboard...' +
                '</div>' +

                '<div ' +
                  'class="snake-leaderboard__empty" ' +
                  'data-leaderboard-empty ' +
                  'hidden>' +
                  'No scores yet.' +
                '</div>' +

                '<div ' +
                  'class="snake-leaderboard__error" ' +
                  'data-leaderboard-error ' +
                  'hidden>' +
                '</div>' +

                '<div class="snake-leaderboard__table-wrap">' +

                  '<table class="snake-leaderboard__table">' +

                    '<thead>' +
                      '<tr>' +
                        '<th>#</th>' +
                        '<th>Player</th>' +
                        '<th>Score</th>' +
                      '</tr>' +
                    '</thead>' +

                    '<tbody data-leaderboard-body></tbody>' +

                  '</table>' +

                '</div>' +

              '</div>' +

              '<div class="snake-screen__foot">' +
                button('back', 'Back') +
              '</div>' +

            '</div>' +

          '</section>' +


          /* -------------------------------------------------------------- */
          /* SETTINGS                                                         */
          /* -------------------------------------------------------------- */

          '<section ' +
            'class="snake-screen" ' +
            'data-screen="settings" ' +
            'hidden ' +
            'aria-label="Settings">' +

            '<div class="snake-screen__panel">' +

              '<h3 class="snake-screen__title">' +
                'Settings' +
              '</h3>' +

              '<div class="snake-settings">' +

                toggleRow(
                  'sfx',
                  'Sound effects'
                ) +

                toggleRow(
                  'music',
                  'Music'
                ) +

                '<div class="snake-setting">' +

                  '<label ' +
                    'class="snake-setting__label" ' +
                    'for="snake-set-volume">' +
                    'Volume' +
                  '</label>' +

                  '<input ' +
                    'class="snake-setting__range" ' +
                    'type="range" ' +
                    'id="snake-set-volume" ' +
                    'min="0" ' +
                    'max="100" ' +
                    'step="5" ' +
                    'data-setting="volume">' +

                '</div>' +

                toggleRow(
                  'grid',
                  'Grid lines'
                ) +

                toggleRow(
                  'particles',
                  'Particles'
                ) +

                toggleRow(
                  'shake',
                  'Screen shake'
                ) +

                toggleRow(
                  'touchControls',
                  'Touch pad',
                  'Shown automatically on touch devices'
                ) +

                toggleRow(
                  'reducedMotion',
                  'Reduced motion',
                  'Turns off shake, particles and glow'
                ) +

              '</div>' +

              '<div class="snake-screen__foot">' +

                button(
                  'reset-scores',
                  'Reset high scores',
                  ' snake-game__button--quiet'
                ) +

                button(
                  'back',
                  'Back'
                ) +

              '</div>' +

            '</div>' +

          '</section>' +


          /* -------------------------------------------------------------- */
          /* HOW TO PLAY                                                      */
          /* -------------------------------------------------------------- */

          '<section ' +
            'class="snake-screen" ' +
            'data-screen="howto" ' +
            'hidden ' +
            'aria-label="How to play">' +

            '<div class="snake-screen__panel">' +

              '<h3 class="snake-screen__title">' +
                'How to play' +
              '</h3>' +

              '<ul class="snake-howto">' +

                '<li>' +
                  'Move with the arrow keys or W A S D. On a touch screen, ' +
                  'swipe on the board or use the pad.' +
                '</li>' +

                '<li>' +
                  'Eat food to grow and score. The snake never stops moving.' +
                '</li>' +

                '<li>' +
                  'Hitting a wall, an obstacle or your own body ends the run.' +
                '</li>' +

                '<li>' +
                  'You cannot turn back on yourself — plan the turn one cell early.' +
                '</li>' +

                '<li>' +
                  'Gold food is worth more but disappears. Violet food grants ' +
                  'slow motion or double points.' +
                '</li>' +

                '<li>' +
                  'P or Space pauses, Escape leaves the board.' +
                '</li>' +

              '</ul>' +

              '<h4 class="snake-howto__subtitle">' +
                'The four modes' +
              '</h4>' +

              '<dl class="snake-howto__modes">' +
                howToModes() +
              '</dl>' +

              '<div class="snake-screen__foot">' +
                button('back', 'Back') +
              '</div>' +

            '</div>' +

          '</section>' +


          /* -------------------------------------------------------------- */
          /* PAUSE                                                            */
          /* -------------------------------------------------------------- */

          '<section ' +
            'class="snake-screen" ' +
            'data-screen="pause" ' +
            'hidden ' +
            'aria-label="Paused">' +

            '<div class="snake-screen__panel snake-screen__panel--compact">' +

              '<h3 class="snake-screen__title">' +
                'Paused' +
              '</h3>' +

              '<p ' +
                'class="snake-screen__note" ' +
                'data-pause-note>' +
              '</p>' +

              '<div class="snake-menu">' +

                button(
                  'resume',
                  'Resume',
                  ' snake-game__button--primary'
                ) +

                button(
                  'restart',
                  'Restart'
                ) +

                button(
                  'open-settings',
                  'Settings'
                ) +

                button(
                  'quit',
                  'Quit to menu'
                ) +

              '</div>' +

            '</div>' +

          '</section>' +


          /* -------------------------------------------------------------- */
          /* GAME OVER                                                        */
          /* -------------------------------------------------------------- */

          '<section ' +
            'class="snake-screen" ' +
            'data-screen="gameover" ' +
            'hidden ' +
            'aria-label="Game over">' +

            '<div class="snake-screen__panel snake-screen__panel--compact">' +

              '<p ' +
                'class="snake-flash" ' +
                'data-new-high ' +
                'hidden>' +
                'New high score' +
              '</p>' +

              '<h3 class="snake-screen__title">' +
                'Game over' +
              '</h3>' +

              '<p ' +
                'class="snake-screen__note" ' +
                'data-over-reason>' +
              '</p>' +

              '<dl class="snake-result">' +

                '<div>' +
                  '<dt>Score</dt>' +
                  '<dd data-over="score">0</dd>' +
                '</div>' +

                '<div>' +
                  '<dt>High score</dt>' +
                  '<dd data-over="high">0</dd>' +
                '</div>' +

                '<div>' +
                  '<dt>Level</dt>' +
                  '<dd data-over="level">1</dd>' +
                '</div>' +

                '<div>' +
                  '<dt>Length</dt>' +
                  '<dd data-over="length">4</dd>' +
                '</div>' +

              '</dl>' +

              '<div class="snake-menu">' +

                button(
                  'restart',
                  'Play again',
                  ' snake-game__button--primary'
                ) +

                button(
                  'quit',
                  'Main menu'
                ) +

              '</div>' +

            '</div>' +

          '</section>' +

        '</div>' +
      '</div>' +


      /* ------------------------------------------------------------------ */
      /* GAME BAR                                                            */
      /* ------------------------------------------------------------------ */

      '<div class="snake-game__bar" data-bar hidden>' +

        button(
          'pause',
          'Pause',
          ' snake-game__button--ghost',
          ' data-pause-button'
        ) +

        '<p class="snake-game__meta" data-meta></p>' +

        button(
          'open-settings',
          'Settings',
          ' snake-game__button--ghost'
        ) +

      '</div>' +


      /* ------------------------------------------------------------------ */
      /* TOUCH PAD                                                            */
      /* ------------------------------------------------------------------ */

      '<div class="snake-pad" data-pad hidden>' +

        '<button ' +
          'type="button" ' +
          'class="snake-pad__button snake-pad__key--up" ' +
          'data-direction="up" ' +
          'aria-label="Move up">' +
        '</button>' +

        '<button ' +
          'type="button" ' +
          'class="snake-pad__button snake-pad__key--left" ' +
          'data-direction="left" ' +
          'aria-label="Move left">' +
        '</button>' +

        '<button ' +
          'type="button" ' +
          'class="snake-pad__button snake-pad__key--right" ' +
          'data-direction="right" ' +
          'aria-label="Move right">' +
        '</button>' +

        '<button ' +
          'type="button" ' +
          'class="snake-pad__button snake-pad__key--down" ' +
          'data-direction="down" ' +
          'aria-label="Move down">' +
        '</button>' +

      '</div>' +

    '</div>';
  }


  /* ---------------------------------------------------------------------- */
  /* CONSTRUCTOR                                                            */
  /* ---------------------------------------------------------------------- */

  function UIManager(root) {
    this.root = root;
    this.onAction = function () {};
    this.onSettingChange = function () {};
    this.currentScreen = null;
  }


  /* ---------------------------------------------------------------------- */
  /* BUILD                                                                  */
  /* ---------------------------------------------------------------------- */

  UIManager.prototype.build = function () {
    this.root.innerHTML = template();

    var q = this.root.querySelector.bind(this.root);

    this.refs = {
      /* Player */
      playerForm: q('[data-player-form]'),
      playerName: q('#snake-player-name'),
      playerEmail: q('#snake-player-email'),
      playerError: q('[data-player-error]'),

      /* Leaderboard */
      leaderboard: q('[data-leaderboard]'),
      leaderboardLoading: q('[data-leaderboard-loading]'),
      leaderboardEmpty: q('[data-leaderboard-empty]'),
      leaderboardError: q('[data-leaderboard-error]'),
      leaderboardBody: q('[data-leaderboard-body]'),

      /* Main game */
      frame: q('.snake-game__frame'),
      hud: q('[data-hud-root]'),
      stage: q('[data-stage]'),
      canvas: q('[data-canvas]'),
      overlay: q('[data-overlay]'),
      bar: q('[data-bar]'),
      pad: q('[data-pad]'),
      meta: q('[data-meta]'),
      menuStatus: q('[data-menu-status]'),
      pauseButton: q('[data-pause-button]'),
      pauseNote: q('[data-pause-note]'),
      live: q('[data-live]'),
      newHigh: q('[data-new-high]'),
      overReason: q('[data-over-reason]'),
      levelItem: q('[data-hud-item="level"]'),
      timeItem: q('[data-hud-item="time"]'),
      effects: q('[data-hud="effects"]')
    };

    this.screens = {};

    var sections = this.root.querySelectorAll('[data-screen]');

    for (var i = 0; i < sections.length; i++) {
      this.screens[
        sections[i].getAttribute('data-screen')
      ] = sections[i];
    }

    this.bindEvents();

    return this.refs;
  };


  /* ---------------------------------------------------------------------- */
  /* PLAYER DATA                                                             */
  /* ---------------------------------------------------------------------- */

  UIManager.prototype.getPlayerData = function () {
    return {
      name: this.refs.playerName
        ? this.refs.playerName.value.trim()
        : '',

      email: this.refs.playerEmail
        ? this.refs.playerEmail.value.trim()
        : ''
    };
  };


  UIManager.prototype.setPlayerData = function (player) {
    if (!player) return;

    if (this.refs.playerName) {
      this.refs.playerName.value = player.name || '';
    }
  };


  UIManager.prototype.setPlayerError = function (message) {
    if (this.refs.playerError) {
      this.refs.playerError.textContent = message || '';
    }
  };


  UIManager.prototype.clearPlayerError = function () {
    this.setPlayerError('');
  };


  /* ---------------------------------------------------------------------- */
  /* LEADERBOARD                                                             */
  /* ---------------------------------------------------------------------- */

  UIManager.prototype.setLeaderboardLoading = function (loading) {
    if (this.refs.leaderboardLoading) {
      this.refs.leaderboardLoading.hidden = !loading;
    }
  };


  UIManager.prototype.setLeaderboardEmpty = function (empty) {
    if (this.refs.leaderboardEmpty) {
      this.refs.leaderboardEmpty.hidden = !empty;
    }
  };


  UIManager.prototype.setLeaderboardError = function (message) {
    if (this.refs.leaderboardError) {
      this.refs.leaderboardError.textContent = message || '';
      this.refs.leaderboardError.hidden = !message;
    }
  };


  UIManager.prototype.clearLeaderboard = function () {
    if (this.refs.leaderboardBody) {
      this.refs.leaderboardBody.innerHTML = '';
    }

    this.setLeaderboardLoading(false);
    this.setLeaderboardEmpty(false);
    this.setLeaderboardError('');
  };


  UIManager.prototype.setLeaderboard = function (entries) {
    var body = this.refs.leaderboardBody;

    if (!body) return;

    body.innerHTML = '';

    if (!entries || !entries.length) {
      this.setLeaderboardLoading(false);
      this.setLeaderboardEmpty(true);
      this.setLeaderboardError('');
      return;
    }

    var html = '';

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];

      html += '' +
        '<tr>' +

          '<td>' +
            escapeHtml(entry.rank) +
          '</td>' +

          '<td>' +
            escapeHtml(entry.name) +
          '</td>' +

          '<td>' +
            escapeHtml(entry.score) +
          '</td>' +

        '</tr>';
    }

    body.innerHTML = html;

    this.setLeaderboardLoading(false);
    this.setLeaderboardEmpty(false);
    this.setLeaderboardError('');
  };


  /* ---------------------------------------------------------------------- */
  /* EVENTS                                                                 */
  /* ---------------------------------------------------------------------- */

  UIManager.prototype.bindEvents = function () {
    var self = this;

    /* Button actions. */
    this.root.addEventListener('click', function (event) {
      var target = event.target.closest
        ? event.target.closest('[data-action]')
        : null;

      if (!target || !self.root.contains(target)) return;

      event.preventDefault();

      self.onAction(
        target.getAttribute('data-action'),
        target.dataset || {},
        target
      );
    });


    /* Player form submission. */
    this.root.addEventListener('submit', function (event) {
      var form = event.target;

      if (
        !form ||
        !form.getAttribute ||
        !form.getAttribute('data-player-form')
      ) {
        return;
      }

      event.preventDefault();

      self.onAction(
        'player-continue',
        {},
        form
      );
    });


    /* Settings changes. */
    this.root.addEventListener('change', function (event) {
      var input = event.target;

      if (!input || !input.getAttribute) return;

      var key = input.getAttribute('data-setting');

      if (!key) return;

      var value = input.type === 'checkbox'
        ? input.checked
        : Number(input.value) / 100;

      self.onSettingChange(key, value);
    });


    /* Live volume dragging. */
    this.root.addEventListener('input', function (event) {
      var input = event.target;

      if (!input || !input.getAttribute) return;

      if (
        input.getAttribute('data-setting') !== 'volume'
      ) {
        return;
      }

      self.onSettingChange(
        'volume',
        Number(input.value) / 100
      );
    });
  };


  /* ---------------------------------------------------------------------- */
  /* SCREENS                                                                */
  /* ---------------------------------------------------------------------- */

  UIManager.prototype.showScreen = function (name) {
    this.currentScreen = name || null;

    for (var key in this.screens) {
      if (!Object.prototype.hasOwnProperty.call(this.screens, key)) {
        continue;
      }

      var visible = key === name;

      this.screens[key].hidden = !visible;
    }

    this.refs.overlay.hidden = !name;

    this.root.setAttribute(
      'data-screen',
      name || ''
    );

    if (name && this.screens[name]) {
      var first = this.screens[name].querySelector(
        'button, [href], input'
      );

      if (first && first.focus) {
        try {
          first.focus({
            preventScroll: true
          });
        } catch (err) {
          first.focus();
        }
      }
    }
  };


  UIManager.prototype.setState = function (state) {
    this.root.setAttribute(
      'data-state',
      state
    );
  };


  UIManager.prototype.setPlaying = function (playing) {
    this.refs.hud.hidden = !playing;
    this.refs.bar.hidden = !playing;
  };


  UIManager.prototype.setPadVisible = function (visible) {
    this.refs.pad.hidden = !visible;
  };


  UIManager.prototype.setPauseLabel = function (label) {
    if (this.refs.pauseButton) {
      this.refs.pauseButton.textContent = label;
    }
  };


  UIManager.prototype.announce = function (message) {
    if (this.refs.live) {
      this.refs.live.textContent = message;
    }
  };


  /* ---------------------------------------------------------------------- */
  /* HUD                                                                    */
  /* ---------------------------------------------------------------------- */

  function formatTime(seconds) {
    var total = Math.max(
      0,
      Math.ceil(seconds)
    );

    var minutes = Math.floor(
      total / 60
    );

    var rest = total % 60;

    return minutes +
      ':' +
      (rest < 10 ? '0' : '') +
      rest;
  }


  UIManager.prototype.updateHud = function (data) {
    this.setText(
      'score',
      data.score
    );

    this.setText(
      'high',
      data.high
    );

    this.setText(
      'level',
      data.level
    );

    this.setText(
      'speed',
      Math.round(data.speed)
    );

    this.setText(
      'time',
      formatTime(data.time)
    );

    this.refs.levelItem.hidden =
      !data.showLevel;

    this.refs.timeItem.hidden =
      !data.showTime;

    var chips = '';

    if (data.slow > 0) {
      chips +=
        '<span class="snake-chip snake-chip--slow">' +
        'Slow ' +
        Math.ceil(data.slow) +
        's</span>';
    }

    if (data.double > 0) {
      chips +=
        '<span class="snake-chip snake-chip--double">' +
        '2x ' +
        Math.ceil(data.double) +
        's</span>';
    }

    if (
      this.refs.effects.innerHTML !== chips
    ) {
      this.refs.effects.innerHTML = chips;
    }
  };


  UIManager.prototype.setText = function (name, value) {
    var node = this.root.querySelector(
      '[data-hud="' + name + '"]'
    );

    if (
      node &&
      node.textContent !== String(value)
    ) {
      node.textContent = value;
    }
  };


  UIManager.prototype.setMeta = function (text) {
    if (this.refs.meta) {
      this.refs.meta.textContent = text;
    }
  };


  UIManager.prototype.setMenuStatus = function (text) {
    if (this.refs.menuStatus) {
      this.refs.menuStatus.textContent = text;
    }
  };


  UIManager.prototype.setPauseNote = function (text) {
    if (this.refs.pauseNote) {
      this.refs.pauseNote.textContent = text;
    }
  };


  /* ---------------------------------------------------------------------- */
  /* MODE / DIFFICULTY                                                       */
  /* ---------------------------------------------------------------------- */

  UIManager.prototype.markSelected = function (
    kind,
    id
  ) {
    var nodes = this.root.querySelectorAll(
      '[data-selectable="' + kind + '"]'
    );

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      var value = node.getAttribute(
        'data-' + kind
      );

      var selected = value === id;

      node.setAttribute(
        'aria-pressed',
        selected ? 'true' : 'false'
      );

      if (kind === 'mode') {
        node.textContent =
          selected
            ? 'Selected'
            : 'Choose';
      }
    }
  };


  UIManager.prototype.updateModeScores = function (
    scoresByMode
  ) {
    for (var id in scoresByMode) {
      if (
        !Object.prototype.hasOwnProperty.call(
          scoresByMode,
          id
        )
      ) {
        continue;
      }

      var node = this.root.querySelector(
        '[data-mode-best="' + id + '"]'
      );

      if (node) {
        node.textContent =
          'best ' + scoresByMode[id];
      }
    }
  };


  /* ---------------------------------------------------------------------- */
  /* GAME OVER                                                              */
  /* ---------------------------------------------------------------------- */

  UIManager.prototype.showGameOver = function (data) {
    this.root.querySelector(
      '[data-over="score"]'
    ).textContent = data.score;

    this.root.querySelector(
      '[data-over="high"]'
    ).textContent = data.high;

    this.root.querySelector(
      '[data-over="level"]'
    ).textContent = data.level;

    this.root.querySelector(
      '[data-over="length"]'
    ).textContent = data.length;

    this.refs.newHigh.hidden =
      !data.isNewHigh;

    this.refs.overReason.textContent =
      data.reason || '';

    this.showScreen('gameover');
  };


  /* ---------------------------------------------------------------------- */
  /* SETTINGS                                                               */
  /* ---------------------------------------------------------------------- */

  /**
   * @param {Object} settings
   * @param {boolean} padVisible resolved value for the touch-pad toggle,
   *        since 'auto' means different things on a phone and on a laptop.
   */
  UIManager.prototype.syncSettings = function (
    settings,
    padVisible
  ) {
    var inputs = this.root.querySelectorAll(
      '[data-setting]'
    );

    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];

      var key = input.getAttribute(
        'data-setting'
      );

      if (key === 'volume') {
        input.value = Math.round(
          (settings.volume || 0) * 100
        );

      } else if (key === 'touchControls') {

        input.checked =
          padVisible === undefined
            ? settings.touchControls !== 'off'
            : !!padVisible;

      } else {

        input.checked = !!settings[key];

      }
    }
  };


  /* ---------------------------------------------------------------------- */
  /* EXPORT                                                                 */
  /* ---------------------------------------------------------------------- */

  NS.UIManager = UIManager;
  NS.formatTime = formatTime;

})(window);