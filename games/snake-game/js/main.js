/**
 * main.js
 * ---------------------------------------------------------------------------
 * Entry point. Loads last so every other module has registered itself.
 *
 * Auto-mounts into #snake-game when that element exists. To control the timing
 * yourself, add data-autostart="false" to the wrapper and call:
 *
 *     const game = SnakeGame.mount(document.querySelector('#snake-game'));
 *     // later: game.destroy();
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;

  /**
   * @param {HTMLElement|string} target wrapper element or CSS selector
   * @param {Object} [options] { basePath: 'snake-game/' } when assets live
   *        somewhere other than the current page's folder.
   */
  NS.mount = function (target, options) {
    var root = typeof target === 'string'
      ? document.querySelector(target)
      : target;

    if (!root) {
      if (global.console) {
        console.warn(
          '[SnakeGame] mount target not found:',
          target
        );
      }

      return null;
    }

    var game = new NS.Game(root, options || {});

    game.init();

    root.__snakeGame = game;

    return game;
  };

  /**
   * Starts the short initialization splash.
   */
  function startLoading(root) {
    root.setAttribute('data-loading', 'true');
  }

  /**
   * Removes the initialization splash after the browser has had a chance
   * to render it. The short delay prevents the animation from flashing
   * instantly on fast devices.
   */
  function finishLoading(root) {
    var hide = function () {
      root.setAttribute('data-loading', 'false');
    };

    if (global.requestAnimationFrame) {
      global.requestAnimationFrame(function () {
        global.requestAnimationFrame(function () {
          global.setTimeout(hide, 650);
        });
      });
    } else {
      global.setTimeout(hide, 650);
    }
  }

  function autoMount() {
    var root = document.getElementById('snake-game');

    if (!root) return;

    if (root.getAttribute('data-autostart') === 'false') {
      return;
    }

    /*
     * Enable the loading state before initialization starts.
     */
    startLoading(root);

    NS.instance = NS.mount(root, {
      basePath:
        root.getAttribute('data-base-path') || ''
    });

    /*
     * Remove the loading state after initialization.
     */
    if (NS.instance) {
      finishLoading(root);
    } else {
      root.setAttribute('data-loading', 'false');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      autoMount
    );
  } else {
    autoMount();
  }

})(window);