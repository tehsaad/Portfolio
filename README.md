# TehSaad — Portfolio (Static / Frontend-only)

Pure HTML, CSS &amp; JavaScript — no build step, no server, no database.
Push this straight to GitHub Pages, Netlify, Vercel, or any static host.

## Structure

```
index.html              Intro / bio & overview
projects.html           Projects catalog (C++, Python, JS builds with GitHub links)
university.html         NUST SEECS curriculum & academic roadmap
AI-Specialization.html  AI engineering specialization roadmap
contact.html            Direct contact & message form (with 1-click copy email)
css/style.css           Design system — tokens, typography, layout, components
css/animations.css      Scroll-reveal + motion (respects prefers-reduced-motion)
js/main.js              Nav toggle, scroll reveal, contact form, 1-click copy
```

## Running it

Just open `index.html` in a browser, or push the whole folder to any static
host — there's nothing to install or configure.

## Editing content

- **Add a project**: copy a `.card` block in `projects.html` and edit the text.
- **Add a certificate / society**: each file has an HTML comment right above
  the empty-state block explaining what markup to paste in (just reuse the
  `.card` structure from `projects.html`).
- **Swap in your photo**: drop it at `assets/img/profile.jpg`, then in
  `index.html` replace the placeholder `<svg>...</svg>` inside
  `.portrait-frame` with `<img src="assets/img/profile.jpg" alt="Saad Rizwan">`.
- **Contact form**: currently opens the visitor's email client with the
  message pre-filled (no backend needed). If you want it to submit silently
  instead, wire it up to a free form service like Formspree or Netlify Forms
  — swap out the `mailto:` logic in `js/main.js`'s `initContactForm()`.

## Design notes

Palette: ink navy / parchment / brass / oxblood — an "academic dossier" feel.
Each page's hero background is a bespoke inline SVG (topographic lines,
circuit motif, wax-seal rings, blueprint grid) instead of stock photography,
so everything here is yours to keep and edit freely.
