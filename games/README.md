# Games — landing page

A standalone HTML/CSS/JS page for the Games section of tehsaad.site. Currently
shows one game (Snake, as a placeholder card); built so adding more games is
a one-object change, not a redesign.

## Project structure

```
games-page/
├── index.html
├── css/
│   └── games.css
├── js/
│   └── games.js
├── assets/
│   ├── images/        ← put game cover images here (snake-cover.jpg, etc.)
│   └── icons/
└── README.md
```

## Adding a new game

Everything on the page is generated from the `games` array at the top of
`js/games.js`. To add a game, add one object — nothing else in the file
needs to change, and the grid, filters, search, and count update
automatically:

```javascript
{
  title: "2048",
  description: "A simple puzzle game about merging tiles.",
  category: "Puzzle",
  technologies: ["HTML", "CSS", "JavaScript"],
  image: "assets/images/2048-cover.jpg",
  link: "games/2048/index.html",
  status: "Playable",
}
```

Fields:

- **title / description** — shown on the card; description reveals on hover/tap.
- **category** — drives the filter buttons (a new category adds a new button automatically).
- **technologies** — shown as a `·`-separated list in the meta row.
- **image** — a 16:10-ish cover image. If it fails to load (or hasn't been
  added yet), the card falls back to a plain initial on a dark panel instead
  of breaking.
- **link** — where "Play Game" points. Point it at the game's own folder,
  e.g. `games/2048/index.html`.
- **status** — `"Playable"` shows the real link and a "Play Game →" call to
  action. Anything else (e.g. `"Coming Soon"`) disables the link, swaps in
  an "In Development" label, and tags the card.
- **featured** *(optional)* — `true` gives the card a wider, two-column slot
  on desktop. Use sparingly — it's meant for one standout game, not most of
  them.

## Integration guide

This is built to be dropped into your existing site, not to run as its own
separate site:

1. **HTML** — copy everything inside `<div id="games-page">…</div>` from
   `index.html` into wherever this page lives on tehsaad.site (e.g. the body
   of `games.html`). The `<header>` block inside it is optional scaffolding —
   if your site already has a shared header/nav, delete that `<header>` and
   keep your real one; nothing else in the page depends on it.
2. **CSS** — include `css/games.css` on that page. Every rule is scoped
   under `#games-page`, and there are no bare `body`, `.container`,
   `.card`, or `.button` selectors, so it won't touch styles elsewhere on
   the site.
3. **JS** — include `js/games.js` (a plain `<script src="…">`, no build
   step, no dependencies). It only ever touches elements inside
   `#games-page`.
4. **Fonts** — the page assumes Fraunces, Inter, and IBM Plex Mono are
   already loaded site-wide (matching the rest of tehsaad.site). If they
   aren't yet, uncomment the Google Fonts `<link>` tags at the top of
   `index.html`.
5. **Assets** — put cover images in `assets/images/`. Keep the folder next
   to `index.html`, or update the `image` paths in `games.js` to match
   wherever you host them.
6. **Games themselves** — this project does not contain the games. Build
   each one separately (e.g. the Snake game) in its own folder and point
   that card's `link` at it, e.g. `games/snake/index.html`.

## Customization

| What | Where |
|---|---|
| Colors | CSS custom properties at the top of `games.css` (`--gp-ink`, `--gp-parchment`, `--gp-brass`, `--gp-oxblood`, …) |
| Typography | `--gp-font-display` / `--gp-font-body` / `--gp-font-mono` in `games.css` |
| Card size / aspect ratio | `.game-card__media { aspect-ratio: 16 / 10; }` |
| Hover reveal speed | `.game-card__details { transition: max-height 380ms …, opacity 300ms …; }` |
| Scroll-reveal stagger | `setTimeout(…, i * 70)` inside `observeCards()` in `games.js` |
| Grid columns per breakpoint | the `@media` rules around `.games-page__grid` in `games.css` |
| Game data (add/edit/remove games) | the `games` array at the top of `games.js` |
| Featured game | set `featured: true` on one game object |
| Categories / filters | derived automatically from the `category` field on each game — add a new category by using it on a game |

## Notes

- No frameworks, no build step — three files, open `index.html` directly or
  serve the folder statically.
- Respects `prefers-reduced-motion`: scroll reveal and hover animations are
  disabled, and card descriptions stay visible instead of relying on a
  hover-triggered transition.
- Hover-only content (description, "Play Game") is also reachable by
  keyboard focus and by tap on touch devices, so nothing is hover-locked.
- Missing cover images degrade to a plain initial rather than a broken
  image icon.
