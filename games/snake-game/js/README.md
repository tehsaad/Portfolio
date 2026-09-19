# Snake

A complete, dependency-free Snake game built with HTML5 Canvas, CSS3 and vanilla
JavaScript. It is written as an **isolated, embeddable component**: the whole game
lives inside a single `#snake-game` wrapper, every CSS rule is scoped to that id,
and it can be dropped into an existing website without touching that site's markup
or styles.

No frameworks. No build step. No npm install. Open `index.html` and play.

---

## Project overview

| | |
|---|---|
| Rendering | One `<canvas>`, logical 25×25 grid, `devicePixelRatio` aware |
| Code | 13 plain scripts on a `window.SnakeGame` namespace |
| Dependencies | None — Canvas, Web Audio and localStorage only |
| Persistence | `localStorage`, with an in-memory fallback if it is blocked |
| Audio | Synthesised with the Web Audio API; sample files are optional |
| Accessibility | Keyboard-operable UI, focus rings, ARIA labels, reduced-motion mode |

---

## Features

- Four game modes and four difficulties, each with its own saved high score.
- Time-based game loop — identical speed at 30, 60, 120 and 144 FPS.
- Smooth interpolated movement (the head slides out of the neck, the tail retracts).
- Three food types: normal, timed bonus, and special (slow-motion or 2× score).
- Particles, glow, floating score text, level-up banner, death animation, screen shake.
- Safe procedural obstacles — validated with a flood fill so the board is never sealed.
- Attract-mode demo snake playing itself behind the main menu.
- Keyboard (arrows + WASD), swipe, and an on-screen D-pad.
- Pause, resume, restart, quit — all reachable by keyboard.
- Full settings panel, persisted between visits.
- Graceful degradation: no audio files, no Web Audio, or no localStorage all still play.

---

## Game modes

| Mode | Rules |
|---|---|
| **Classic** | Walls are solid. Speed creeps up as you grow. Ends on any collision. |
| **Timed** | A fixed clock (45–75 s by difficulty). Bonus food adds 3 seconds. Score as high as you can before it runs out. |
| **Endless** | A new obstacle drops in every 5 foods, never near your head and never sealing the board. Survive as long as you can. |
| **Challenge** | Eight hand-tuned levels that cycle with rising targets. Each level brings a new obstacle layout and more speed. The snake is re-centred safely on every level up. |

Difficulties (`Easy`, `Normal`, `Hard`, `Extreme`) change starting speed, top speed,
obstacle density, timer length, and the score multiplier (0.8× → 1.8×).

---

## Controls

| Action | Input |
|---|---|
| Move | `↑ ↓ ← →` or `W A S D` |
| Pause / resume | `P` or `Escape` |
| Confirm on an overlay | `Space` or `Enter` |
| Move (touch) | Swipe anywhere on the board, or use the on-screen D-pad |

Arrow keys only have their page-scroll prevented while a game is actually running,
so the rest of the host page keeps scrolling normally.

---

## Project structure

```text
snake-game/
├── index.html              Standalone demo page (not needed when embedding)
├── README.md
├── css/
│   └── style.css           Every rule scoped under #snake-game
├── js/
│   ├── config.js           GAME_CONFIG, states, difficulties, modes, theme
│   ├── storage.js          StorageManager — high scores + settings
│   ├── audio.js            AudioManager — Web Audio synth + optional samples
│   ├── input.js            InputManager — keyboard, swipe, D-pad
│   ├── snake.js            Snake — body, queued turns, growth, self-collision
│   ├── food.js             Food — types, safe spawning, lifetimes
│   ├── levels.js           Obstacle layouts, seeded RNG, playability check
│   ├── effects.js          Particles, floating text, screen shake, banners
│   ├── renderer.js         All canvas drawing + cached background
│   ├── attract.js          Demo snake shown behind the menu
│   ├── ui.js               UIManager — builds the DOM, screens, HUD
│   ├── game.js             Game — state machine, loop, collisions, modes
│   └── main.js             SnakeGame.mount() + auto-mount
└── assets/
    ├── audio/              Optional .wav files (see below)
    └── images/             Unused — the game draws everything itself
```

Load order matters: `config.js` first, `main.js` last. Everything in between
registers itself on `window.SnakeGame`.

---

## How to run

**Option A — just open it.** Double-click `index.html`. Because the project uses
classic `<script>` tags instead of ES modules, it works over `file://` with no server.

**Option B — a local server** (nicer for testing audio files and mobile devices):

```bash
cd snake-game
python3 -m http.server 8000
# then visit http://localhost:8000
```

---

## How to integrate into another website

Five steps, none of which touch your existing markup or CSS.

1. **Copy the folder** into your site, e.g. `/projects/snake-game/`.

2. **Add the wrapper** wherever you want the game to appear:

   ```html
   <div id="snake-game"></div>
   ```

   That is the only markup you need — `ui.js` builds every screen inside it.

3. **Link the stylesheet** in your `<head>`:

   ```html
   <link rel="stylesheet" href="/projects/snake-game/css/style.css">
   ```

4. **Add the scripts** before `</body>`, in this order:

   ```html
   <script src="/projects/snake-game/js/config.js"></script>
   <script src="/projects/snake-game/js/storage.js"></script>
   <script src="/projects/snake-game/js/audio.js"></script>
   <script src="/projects/snake-game/js/input.js"></script>
   <script src="/projects/snake-game/js/snake.js"></script>
   <script src="/projects/snake-game/js/food.js"></script>
   <script src="/projects/snake-game/js/levels.js"></script>
   <script src="/projects/snake-game/js/effects.js"></script>
   <script src="/projects/snake-game/js/renderer.js"></script>
   <script src="/projects/snake-game/js/attract.js"></script>
   <script src="/projects/snake-game/js/ui.js"></script>
   <script src="/projects/snake-game/js/game.js"></script>
   <script src="/projects/snake-game/js/main.js"></script>
   ```

5. **Point it at the assets folder** if the game does not live next to the page:

   ```html
   <div id="snake-game" data-base-path="/projects/snake-game/"></div>
   ```

   This only matters for optional audio samples; everything else is self-contained.

### Mounting it yourself

To control when the game starts (inside a tab, a modal, an IntersectionObserver):

```html
<div id="snake-game" data-autostart="false"></div>
```

```js
const game = SnakeGame.mount('#snake-game', { basePath: '/projects/snake-game/' });
// later, if you remove the element from the page:
game.destroy();
```

`destroy()` stops the loop, removes every listener, and empties the wrapper.

### What is *not* needed when embedding

- `index.html` — it is only a demo page.
- The `body.snake-demo-page` rules in `style.css` — they are scoped to that class
  and do nothing on your site. You can delete them.
- `assets/images/` — the game draws everything procedurally.

### Why it will not fight your CSS

Every selector starts with `#snake-game`, which gives the game rules higher
specificity than typical class-based site styles, while none of its rules can leak
outward. Class names are prefixed (`.snake-game-button`, `.snake-game-hud`,
`.snake-game-panel`), so there are no `.container` / `.card` / `.button` collisions.
Font stacks fall back to system fonts if your site does not load Fraunces, Inter or
IBM Plex Mono.

---

## How to customize

### Colours

Two places, by design:

- **DOM chrome** (panels, buttons, HUD): the custom-property block at the top of
  `css/style.css`.

  ```css
  #snake-game {
    --snake-ink: #0f1722;
    --snake-parchment: #efe6d4;
    --snake-brass: #c69749;
    --snake-jade: #4fae7d;
    --snake-oxblood: #8d3a3a;
  }
  ```

- **Canvas** (snake, food, grid, obstacles): `NS.THEME` in `js/config.js`. Canvas
  cannot read CSS variables, so the palette is mirrored there.

### Snake appearance

`NS.THEME.snake*` sets the body gradient, glow and eye colours. The geometry — a
rounded polyline with a lighter spine — lives in `drawSnake()` in `js/renderer.js`.
Change the `lineWidth` multiplier there to make the snake thinner or fatter.

### Speed

`NS.DIFFICULTIES` in `js/config.js`. Speeds are **cells per second**, not
milliseconds:

```js
normal: { startSpeed: 9, maxSpeed: 16, speedStep: 0.25, scoreMultiplier: 1, ... }
```

`speedStep` is added per food; `levelSpeedStep` is added per level in Challenge mode.

### Grid size

`NS.CONFIG.grid` in `js/config.js`. If you make it non-square, also change
`--snake-aspect` in `css/style.css` so the canvas box matches.

### Difficulty

Same `NS.DIFFICULTIES` object: `obstacleScale` controls layout density,
`timedSeconds` the Timed clock, `scoreMultiplier` the payout.

### Food

`NS.CONFIG.food` (spawn chances, lifetimes, the score at which bonus and special
food start appearing), `NS.CONFIG.scoring` (points), and `NS.CONFIG.powerups`
(slow-motion factor and duration, 2×-score duration).

### Game modes

`NS.MODES` in `js/config.js` holds each mode's label, description and the `rules[]`
array shown before starting. Mode-specific behaviour is in `js/game.js` — search for
the mode id (`timed`, `endless`, `challenge`).

### Levels and obstacles

`js/levels.js`. `Layouts` contains the generators (`corners`, `blocks`, `walls`,
`cross`, `rings`, `tunnel`, `maze`); `NS.LEVELS` is the 8-entry progression table.
Every generated layout is flood-filled before use, so a new layout cannot
accidentally seal off the board.

### Effects

`NS.CONFIG.particles` (count per food, pool cap, lifetime) and `NS.CONFIG.shake`
(shake magnitude for food, level up and death). Setting particles or shake off in
the in-game Settings panel — or enabling OS-level reduced motion — disables them
at runtime.

---

## How to add audio

**The game ships with no audio files and still has sound.** Every cue is
synthesised with the Web Audio API, including an optional procedural music loop
(off by default).

To use real samples instead, drop files with these exact names into
`assets/audio/`:

| File | Plays when |
|---|---|
| `eat.wav` | Normal food eaten |
| `bonus.wav` | Bonus or special food eaten |
| `click.wav` | Any UI button press |
| `level-up.wav` | Advancing a level |
| `game-over.wav` | Death |
| `high-score.wav` | Beating your record |

All six are optional and independent — a missing or malformed file is caught, the
synth version is used for that cue, and nothing is logged as an error. If you host
the game somewhere other than the current page's folder, set `data-base-path` on
the wrapper so the loader finds them.

Sound effects, music and master volume are all in the Settings panel and persist
via `localStorage`.

---

## Browser compatibility

Tested targets: recent Chrome, Edge, Firefox and Safari, desktop and mobile.

- Canvas 2D, `localStorage` and `requestAnimationFrame` are assumed.
- Web Audio is feature-detected; without it the game is silent and fully playable.
- `localStorage` is probed at startup; if it throws (private mode, blocked cookies)
  the manager transparently switches to an in-memory store — scores work for the
  session but do not persist.
- `aspect-ratio` has a `padding-top` fallback behind `@supports`.
- `devicePixelRatio` is capped at 2.5 so phones with very high DPR do not render
  a pointlessly large buffer.

---

## Data stored

Keys are namespaced `snakeGame.v1.*`:

- `snakeGame.v1.scores` — high scores, keyed `mode:difficulty`
- `snakeGame.v1.settings` — audio, visual and control toggles
- `snakeGame.v1.selection` — last mode and difficulty chosen

Nothing is sent anywhere; there is no network code in the project.
