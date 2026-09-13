/*
  render.js — turns SITE_DATA (content.js) into markup using the site's
  existing CSS classes. No new visual components are introduced here;
  this only replaces what used to be hand-duplicated HTML blocks.
*/

function renderProjectCards(containerId, statuses) {
  const container = document.getElementById(containerId);
  if (!container || typeof SITE_DATA === 'undefined') return;

  const items = statuses
    ? SITE_DATA.projects.filter((p) => statuses.includes(p.status))
    : SITE_DATA.projects;

  container.innerHTML = items.map((p) => `
    <div class="card">
      <div class="card-top">
        <span class="course-code">${p.category}</span>
        <span class="status-pill ${p.status}">${p.statusLabel}</span>
      </div>
      <div>
        <span class="lang">${p.lang}</span>
        <h3>${p.title}</h3>
      </div>
      <p>${p.description}</p>
      <div class="stack">
        ${p.stack.map((s) => `<span>${s}</span>`).join('')}
      </div>
      <div class="card-links">
        <a href="${p.linkUrl}" target="_blank" rel="noopener" class="card-btn">${p.linkLabel}</a>
      </div>
    </div>
  `).join('');
}

function renderJourney(containerId) {
  const container = document.getElementById(containerId);
  if (!container || typeof SITE_DATA === 'undefined') return;

  container.innerHTML = SITE_DATA.journey.map((yr) => `
    <div class="journey-year reveal">
      <div class="journey-year-head">
        <p class="eyebrow">${yr.label}</p>
        <h3>${yr.heading}</h3>
      </div>
      <div class="ledger-list">
        ${yr.entries.map((e) => `
          <div class="ledger-item">
            ${e.date ? `<span class="date-tag">${e.date}</span>` : `<span class="date-tag">${yr.kind === 'planned' ? 'Planned' : ''}</span>`}
            <div>
              <h4>${e.title}${e.status === 'in-progress' ? ' <span class=\"status-pill in-progress\" style=\"margin-left:8px;vertical-align:middle;\">In Progress</span>' : ''}</h4>
              <p>${e.body}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderProjectCards('projects-catalog');
  renderJourney('journey-timeline');
});
