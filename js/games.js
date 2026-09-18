/* ==========================================================================
   Games Page — data + rendering
   Everything on the page is generated from the `games` array below.
   To add a game, add one object to this array — nothing else in this
   file needs to change. See the bottom of the file for a walkthrough.
   ========================================================================== */

(function () {
  "use strict";

  /**
   * @typedef {Object} Game
   * @property {string} title
   * @property {string} description
   * @property {string} category
   * @property {string[]} technologies
   * @property {string} image        - path to a cover image (16:10 works best)
   * @property {string} link         - where "Play Game" points
   * @property {"Playable"|"Coming Soon"|"In Progress"} status
   * @property {boolean} [featured]  - optional, gives the card a larger slot
   */

  /** @type {Game[]} */
  const games = [
    {
      title: "Snake",
      description:
        "A classic Snake game built from scratch with HTML Canvas — four modes, four difficulties, and per-mode high scores.",
      category: "Arcade",
      technologies: ["HTML", "CSS", "JavaScript", "Canvas"],
      image: "assets/images/snake-cover.jpg",
      link: "games/snake/index.html",
      status: "Playable",
      featured: true,
    },

    // -------------------------------------------------------------
    // Add more games here as you build them, e.g.:
    //
    // {
    //   title: "2048",
    //   description: "A simple puzzle game about merging tiles.",
    //   category: "Puzzle",
    //   technologies: ["HTML", "CSS", "JavaScript"],
    //   image: "assets/images/2048-cover.jpg",
    //   link: "games/2048/index.html",
    //   status: "Playable",
    // },
    // -------------------------------------------------------------
  ];

  const grid = document.querySelector("[data-games-grid]");
  const countEl = document.querySelector("[data-games-count]");
  const filtersEl = document.querySelector("[data-games-filters]");
  const searchInput = document.getElementById("games-search");
  const emptyEl = document.querySelector("[data-games-empty]");

  let activeCategory = "All";
  let activeQuery = "";

  /** Escape text going into innerHTML. */
  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function buildCard(game) {
    const li = document.createElement("li");
    li.className = "game-card" + (game.featured ? " game-card--featured" : "");
    li.dataset.category = game.category;
    li.dataset.searchText = [game.title, game.category, ...game.technologies]
      .join(" ")
      .toLowerCase();

    const isPlayable = game.status === "Playable";
    const initial = esc(game.title.charAt(0));

    const badge =
      game.status === "Playable"
        ? ""
        : `<span class="game-card__badge game-card__badge--coming-soon">${esc(game.status)}</span>`;

    const cta = isPlayable
      ? `<span class="game-card__cta">Play Game →</span>`
      : `<span class="game-card__cta game-card__cta--disabled">In Development</span>`;

    // Cards for unfinished games aren't links to a broken page.
    const Tag = isPlayable ? "a" : "div";
    const hrefAttr = isPlayable ? `href="${esc(game.link)}"` : "";
    const linkClass = isPlayable ? "game-card__link" : "game-card__link game-card__link--disabled";
    const roleAttr = isPlayable ? "" : `role="group" aria-label="${esc(game.title)}, ${esc(game.status)}"`;

    li.innerHTML = `
      <${Tag} class="${linkClass}" ${hrefAttr} ${roleAttr} tabindex="${isPlayable ? "0" : "-1"}">
        <div class="game-card__media">
          <img
            class="game-card__image"
            src="${esc(game.image)}"
            alt="${esc(game.title)} cover art"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="game-card__media-fallback" style="display:none;">${initial}</div>
          <div class="game-card__scrim"></div>
          ${badge}
          <div class="game-card__body">
            <h3 class="game-card__title">${esc(game.title)}</h3>
            <div class="game-card__details">
              <p class="game-card__description">${esc(game.description)}</p>
              <ul class="game-card__meta">
                <li><strong>Category:</strong> ${esc(game.category)}</li>
                <li><strong>Built with:</strong> ${esc(game.technologies.join(" · "))}</li>
              </ul>
              ${cta}
            </div>
          </div>
        </div>
      </${Tag}>
    `;

    // Mobile / no-hover devices: tap to reveal, tap again (or tap elsewhere) to close.
    const linkEl = li.querySelector(".game-card__link");
    linkEl.addEventListener("click", (e) => {
      const isCoarsePointer = window.matchMedia("(hover: none)").matches;
      if (isCoarsePointer && !li.classList.contains("is-tapped")) {
        e.preventDefault();
        document
          .querySelectorAll(".game-card.is-tapped")
          .forEach((el) => el !== li && el.classList.remove("is-tapped"));
        li.classList.add("is-tapped");
      }
    });

    return li;
  }

  function renderFilters() {
    const categories = ["All", ...new Set(games.map((g) => g.category))];
    filtersEl.innerHTML = categories
      .map(
        (cat) =>
          `<button type="button" class="games-page__filter" data-category="${esc(cat)}" aria-pressed="${cat === "All"}">${esc(cat)}</button>`
      )
      .join("");

    filtersEl.querySelectorAll(".games-page__filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.category;
        filtersEl
          .querySelectorAll(".games-page__filter")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        applyFilters();
      });
    });
  }

  function renderGrid() {
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    games.forEach((game) => frag.appendChild(buildCard(game)));
    grid.appendChild(frag);
    countEl.textContent = `${games.length} ${games.length === 1 ? "game" : "games"} so far`;
    observeCards();
  }

  function applyFilters() {
    const cards = grid.querySelectorAll(".game-card");
    let visibleCount = 0;

    cards.forEach((card) => {
      const matchesCategory =
        activeCategory === "All" || card.dataset.category === activeCategory;
      const matchesQuery =
        !activeQuery || card.dataset.searchText.includes(activeQuery);
      const visible = matchesCategory && matchesQuery;
      card.style.display = visible ? "" : "none";
      if (visible) visibleCount += 1;
    });

    emptyEl.hidden = visibleCount !== 0;
  }

  function observeCards() {
    const cards = grid.querySelectorAll(".game-card");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      cards.forEach((c) => c.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add("is-visible"), i * 70);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    cards.forEach((c) => io.observe(c));
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      activeQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  renderFilters();
  renderGrid();
})();
