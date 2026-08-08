// ==================================================================
// updates-data.js
//
// The single source of truth for the development-updates board:
// the card data itself, plus the logic that renders it into the
// board, wires up the type filters, and keeps the stats row in sync.
//
// To add/remove/edit a card, just edit the UPDATES array below —
// nothing else needs to change.
// ==================================================================

// ------------------------------------------------------------------
// Data
//
// Fields:
//   title        string   — card heading
//   description  string   — one or two sentence summary
//   type         string   — 'feature' | 'bug' | 'design' | 'improvement'
//                            (drives the first tag shown on the card)
//   status       string   — 'planned' | 'progress' | 'testing' | 'done'
//                            (drives which column the card lands in)
//   priority     boolean  — optional. true adds a "High priority" tag
//   extraTag     string   — optional. a second, freeform tag (e.g. 'UI')
//   footerLeft   string   — left side of the card footer
//   footerRight  string   — right side of the card footer
// ------------------------------------------------------------------

const UPDATES = [
  // ---- Planned ----
  {
    title: 'Archive Mode',
    description: 'Let players play past Niji-Dle',
    type: 'feature',
    status: 'planned',
    footerLeft: 'Planned',
    footerRight: 'Feature',
  },

  // ---- In progress ----
  {
    title: 'Branch selection for unlimited mode',
    description: 'Building a cleaner dashboard for starting games and seeing recent activity.',
    type: 'feature',
    status: 'progress',
    extraTag: 'Gameplay',
    footerLeft: 'In progress',
    footerRight: 'Active',
  },
  {
    title: 'Clues after n tries',
    description: '3 clues to be revealed after n tries, currently gathering data',
    type: 'feature',
    status: 'progress',
    extraTag: 'Gameplay',
    footerLeft: 'Gathering Data',
    footerRight: 'Active',
  },
  {
    title: '? in color column after update',
    description: 'Due to code update and mismatch code version, colors in column are appearing as ?',
    type: 'bug',
    status: 'progress',
    footerLeft: 'Troubleshooting',
    footerRight: 'Active',
  },
  // ---- Testing ----


  // ---- Done ----
  {
    title: 'Unlimited Mode',
    description: 'Players can play Niji-Dle as many times as they want',
    type: 'feature',
    status: 'done',
    footerLeft: 'Shipped',
    footerRight: 'Done',
  },
  {
    title: 'Keyboard Support',
    description: 'Players can use arrow keys to navigate dropdown options',
    type: 'feature',
    status: 'done',
    footerLeft: 'Shipped',
    footerRight: 'Done',
  },
  {
    title: 'Color column rework',
    description: 'Adjusted partial/match status of color column for better navigation of answer',
    type: 'improvement',
    status: 'done',
    footerLeft: 'Shipped',
    footerRight: 'Done',
  },  
    {
    title: 'Tooltip for color column',
    description: 'Added tooltip to show color family when hovered/clicked',
    type: 'feature',
    status: 'done',
    footerLeft: 'Shipped',
    footerRight: 'Done',
  },  
];

const LINKS = [
  {
    label: 'Feedback',
    title: 'Report a bug or suggestion',
    description: 'Spotted something off, or have an idea? Let us know through the feedback form.',
    url: 'https://forms.gle/bh3GgWXefc9dMcMg7',
  },
  {
    label: 'Survey',
    title: 'One month check-in',
    description: 'Share your thoughts on how Niji-Dle has been since launch.',
    url: 'https://forms.gle/WUrq4tnb7BhNateK9',
  },
    {
    label: 'Community',
    title: 'Join the Discord',
    description: 'Get exclusive updates, help with testing, and talk directly with the dev.',
    url: 'https://discord.gg/9r8avqkqtn',
  },
  {
    label: 'Survey',
    title: 'Share oshi fun facts!',
    description: 'Share fun facts of your oshi and favorite livers which will be added in the upcoming clues update',
    url: 'https://forms.gle/nWHN52Pvw6siMRTK8',
  },
];

// ------------------------------------------------------------------
// Rendering
// ------------------------------------------------------------------

const TYPE_LABELS = {
  feature: 'Feature',
  bug: 'Bug',
  design: 'Design',
  improvement: 'Improvement',
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function buildCardHtml(update) {
  const tags = [`<span class="tag">${escapeHtml(TYPE_LABELS[update.type] || update.type)}</span>`];
  if (update.extraTag) {
    tags.push(`<span class="tag">${escapeHtml(update.extraTag)}</span>`);
  }
  if (update.priority) {
    tags.push(`<span class="tag priority">High priority</span>`);
  }

  return `
    <article class="card" data-type="${escapeHtml(update.type)}" data-status="${escapeHtml(update.status)}">
      <div class="tags">${tags.join('')}</div>
      <h3>${escapeHtml(update.title)}</h3>
      <p>${escapeHtml(update.description)}</p>
      <div class="card-footer"><span>${escapeHtml(update.footerLeft)}</span><span>${escapeHtml(update.footerRight)}</span></div>
    </article>`;
}

function renderCards() {
  const containers = {
    planned: document.getElementById('cards-planned'),
    progress: document.getElementById('cards-progress'),
    testing: document.getElementById('cards-testing'),
    done: document.getElementById('cards-done'),
  };

  // Reset each column before rendering, in case this ever re-runs.
  Object.values(containers).forEach((el) => { if (el) el.innerHTML = ''; });

  UPDATES.forEach((update) => {
    const container = containers[update.status];
    if (!container) return; // unknown status — skip rather than break the board
    container.insertAdjacentHTML('beforeend', buildCardHtml(update));
  });
}

function buildLinkCardHtml(link) {
  return `
    <a class="link-card" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">
      <div class="link-kicker">${escapeHtml(link.label)}</div>
      <h3>${escapeHtml(link.title)}</h3>
      <p>${escapeHtml(link.description)}</p>
    </a>`;
}
 
function renderLinks() {
  const container = document.getElementById('link-cards');
  if (!container) return;
  container.innerHTML = '';
  LINKS.forEach((link) => {
    container.insertAdjacentHTML('beforeend', buildLinkCardHtml(link));
  });
}

// ------------------------------------------------------------------
// Stats + filters
// ------------------------------------------------------------------
const STATUSES = ['planned', 'progress', 'testing', 'done'];

const COLLAPSE_LIMIT = 3;
let currentFilter = 'all';

const expandedState = Object.fromEntries(STATUSES.map((s) => [s, false]));
 

function updateColumnToggle(status, visibleCardsInColumn) {
  const wrap = document.getElementById(`${status}-toggle-wrap`);
  if (!wrap) return;
  wrap.innerHTML = '';


  const hiddenCount = visibleCardsInColumn.length - COLLAPSE_LIMIT;
  if (hiddenCount <= 0) return; // nothing to collapse — no button needed
 
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'show-more';
  button.textContent = expandedState[status] ? 'Show less' : `Show ${hiddenCount} more`;
  button.addEventListener('click', () => {
    expandedState[status] = !expandedState[status];
    applyVisibility(updateCardsRef);
  });
  wrap.appendChild(button);
}

function applyVisibility(cards) {
  const filterPassed = (card) =>
    currentFilter === 'all' || card.dataset.type === currentFilter;
 
  // First pass: plain type filtering for every card.
  cards.forEach((card) => {
    card.classList.toggle('hidden', !filterPassed(card));
  });
    STATUSES.forEach((status) => {
    const visibleInColumn = cards.filter(
      (card) => card.dataset.status === status && filterPassed(card)
    );
 
    visibleInColumn.forEach((card, i) => {
      if (!expandedState[status] && i >= COLLAPSE_LIMIT) {
        card.classList.add('hidden');
      }
    });

    updateColumnToggle(status, visibleInColumn);
    });
    updateCount(cards);
}

function setupFilters(cards) {
  const filters = [...document.querySelectorAll('.filter')];
 
  filters.forEach((button) => {
    button.addEventListener('click', () => {
      filters.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
 
      currentFilter = button.dataset.filter;
      // Collapse every column back when switching filters.
      STATUSES.forEach((status) => { expandedState[status] = false; });
      applyVisibility(cards);
    });
  });

}

function updateCount(cards) {
  
  const filterPassed = (card) =>
    currentFilter === 'all' || card.dataset.type === currentFilter;
 
  STATUSES.forEach((status) => {
    const count = cards.filter((card) =>
      card.dataset.status === status && filterPassed(card)
    ).length;
 
    const element = document.querySelector(`[data-count="${status}"]`);
    if (element) element.textContent = count;
  });
}

// ------------------------------------------------------------------
// Init — runs once this script executes (placed at the end of the
// body, after the board/toolbar markup, so all elements already exist).
// ------------------------------------------------------------------

let updateCardsRef = [];

renderCards();
renderLinks();
updateCardsRef = [...document.querySelectorAll('.card')];
setupFilters(updateCardsRef);
applyVisibility(updateCardsRef);
