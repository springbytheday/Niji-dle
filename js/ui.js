const COLUMNS = [
  { key: 'debutYear', label: 'Debut' },
  { key: 'gender', label: 'Gender' },
  { key: 'species', label: 'Species' },
 // { key: 'birthMonth', label: 'Birth Mo.' },
  { key: 'liverColor', label: 'Color' },
];

function renderBoard(animateFirst = false) {
  const board = document.getElementById('board');
  if (!board) return;

  if (guesses.length === 0) {
    board.innerHTML = `
      <div class="empty-state">
        <p>Make your first guess to start the board.</p>
      </div>`;
    return;
  }

  // Respect reduced-motion preferences by skipping the flip animation
  // path entirely rather than relying on the CSS `animation: none`
  // override — that override alone would leave a cell stuck with its
  // temporary inline reveal-color variables forever, since `animationend`
  // never fires when there's no animation to end.
  const shouldAnimate =
    animateFirst && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const header = `
    <div class="row row--header">
      <div class="cell cell--header">Liver</div>
      ${COLUMNS.map((c) => `<div class="cell cell--header">${c.label}</div>`).join('')}
    </div>`;

  const rows = guesses
    .map((g, i) => renderRow(g, i === 0, i === 0 && shouldAnimate))
    .join('');

  board.innerHTML = header + rows;

  if (shouldAnimate) {
    attachFlipEndHandlers(board);
  }
}

// Once a cell's flip animation finishes, swap it from the temporary
// `cell--flip` class (whose color comes from inline --flip-reveal-*
// variables) to its permanent static `cell--{status}` class. Without
// this, the cell would revert to its unstyled default the instant the
// animation ends, since CSS animations don't leave their end state
// applied as a real style by default in the way we need here.
function attachFlipEndHandlers(container) {
  const flippingCells = container.querySelectorAll('.cell--flip');
  flippingCells.forEach((cell) => {
    cell.addEventListener(
      'animationend',
      () => {
        const status = cell.dataset.status;
        cell.classList.remove('cell--flip');
        cell.classList.add(`cell--${status}`);
        cell.style.removeProperty('--flip-delay');
        cell.style.removeProperty('--flip-reveal-bg');
        cell.style.removeProperty('--flip-reveal-color');
      },
      { once: true }
    );
  });
}

function renderRow(guessResult, isNewest, animate) {
  const { talent } = guessResult;
  const rowClass = isNewest ? 'row row--newest' : 'row';

  const cells = COLUMNS.map((col, i) =>
    renderCell(col.key, guessResult[col.key], animate ? i : null)
  ).join('');

  const hasImage = Boolean(talent.image_url);
  const thumbnail = hasImage
  ? `<img class="talent-thumb" src="${escapeHtmlAttr(talent.image_url)}" alt="" loading="lazy" />`
  : '';
  const nameCellClass = hasImage ? 'cell cell--name has-image' : 'cell cell--name'

  return `
    <div class="${rowClass}">
      <div class="${nameCellClass}">
        ${thumbnail}
        <div class="talent-name-block">
          <span class="talent-name">${escapeHtml(talent.name)}</span>
        </div>
      </div>
      ${cells}
    </div>`;
}

function renderCell(key, data, flipIndex) {
  if (key === 'debutYear') return renderArrowCell(data, flipIndex);
  if (key === 'liverColor') return renderLiverColorCell(data, flipIndex);
  return renderTextCell(data, flipIndex);
}

// Builds the shared flip-related class/style attributes for a cell.
// flipIndex is the cell's column position when animating (used to
// stagger the reveal left-to-right), or null when not animating —
// in which case the cell just gets its normal static status class
// with no animation, exactly as before this feature was added.
function flipAttrs(status, flipIndex) {
  if (flipIndex == null) {
    return { classes: `cell--${status}`, style: '' };
  }
  const delayMs = flipIndex * 150;
  const reveal = {
    hit: { bg: 'var(--hit)', color: '#fff', border: 'transparent' },
    partial: { bg: 'var(--partial)', color: '#1a1300', border: 'transparent' },
    miss: { bg: 'var(--miss)', color: 'var(--text)', border: 'transparent' },
    unknown: { bg: 'transparent', color: 'var(--text-dim)', border: 'var(--unknown)' },
  }[status];

  const style = `--flip-delay:${delayMs}ms; --flip-reveal-bg: ${reveal.bg}; --flip-reveal-color: ${reveal.color}; --flip-reveal-border: ${reveal.border};`;
  return { classes: 'cell--flip', style };
}

function renderTextCell(data, flipIndex) {
  const { classes, style } = flipAttrs(data.status, flipIndex);
  const display = data.value == null ? '?' : escapeHtml(String(data.value));
  return `<div class="cell ${classes}" style="${style}" data-status="${data.status}">${display}</div>`;
}

// Shared by any attribute that's compared linearly with an up/down
// arrow toward the answer (debut year, birth month). Just displays
// the raw value as-is, so debut year shows a number and birth month
// shows its month name string unchanged.
function renderArrowCell(data, flipIndex) {
  const { classes, style } = flipAttrs(data.status, flipIndex);
  const display = data.value == null ? '?' : escapeHtml(String(data.value));
  let arrow = '';
  if (data.direction === 'up') arrow = '<span class="arrow">&uarr;</span>';
  if (data.direction === 'down') arrow = '<span class="arrow">&darr;</span>';
  return `<div class="cell ${classes}" style="${style}" data-status="${data.status}">${display}${arrow}</div>`;
}

function renderLiverColorCell(data, flipIndex) {
  const { classes, style } = flipAttrs(data.status, flipIndex);
  const swatch = data.value
    ? `<span class="swatch" style="background:${escapeAttr(data.value)}"></span>`
    : '?';
  return `<div class="cell ${classes} cell--swatches" style="${style}" data-status="${data.status}">${swatch}</div>`;
}

const STATUS_EMOJI = {
  hit: '🟩',
  partial: '🟨',
  miss: '⬛',
  unknown: '⬜',
};

function buildEmojiGrid() {
  // guesses is stored newest-first (see game.js submitGuess); share text
  // reads top-to-bottom as guess #1 -> final guess, so reverse here.
  const orderedOldestFirst = [...guesses];
  return orderedOldestFirst
    .map((g) => COLUMNS.map((col) => STATUS_EMOJI[g[col.key].status] || '⬜').join(''))
    .join('\n');
}
 
function buildShareText() {
  const puzzleNumber = getPuzzleNumber(todayKey());
  const guessCount = guesses.length;
  const guessWord = guessCount === 1 ? 'guess' : 'guesses';
  const summary = `Niji-Dle #${puzzleNumber} — found in ${guessCount} ${guessWord}`;
  return `${summary}\n\n${buildEmojiGrid()}\n\nhttps://springbytheday.github.io/Niji-dle/`;
}
 
async function copyShareText(button) {
  const text = buildShareText();
  try {
    await navigator.clipboard.writeText(text);
    showCopyFeedback(button, 'Copied!');
  } catch (e) {
    // Clipboard API can fail (older browsers, insecure context, denied
    // permission) — fall back to a manual-select textarea trick rather
    // than leaving the person with no way to get the text at all.
    fallbackCopy(text);
    showCopyFeedback(button, 'Copied!');
  }
}
 
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch (e) {
    console.error('Fallback copy failed:', e);
  }
  document.body.removeChild(textarea);
}
 
function showCopyFeedback(button, message) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = message;
  button.disabled = true;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1500);
}



function showEndState() {
  const banner = document.getElementById('end-banner');
  const input = document.getElementById('guess-input');
  if (input) {
    input.disabled = true;
    input.placeholder = "Today's talent has been found";
  }
  if (banner) {
    banner.innerHTML = `
      <div class="end-card">
        <p class="end-title">It was ${escapeHtml(answerTalent.name)}!</p>
        <p class="end-sub">Come back tomorrow for a new liver.</p>
        <button id="share-button" class="share-button" type="button">Share results</button>
      </div>`;
    banner.classList.add('visible');
 
    const shareButton = document.getElementById('share-button');
    if (shareButton) {
      shareButton.addEventListener('click', () => copyShareText(shareButton));
    }
  }
}
// ----------------------------------------------------------------
// Autocomplete
// ----------------------------------------------------------------
function setupAutocomplete() {
  const input = document.getElementById('guess-input');
  const list = document.getElementById('suggestions');
  if (!input || !list) return;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      // Empty box: same "browse everything" behavior as focusing/clicking
      // into an empty box, so clearing the text falls back to the full
      // roster instead of just closing the dropdown.
      showAllSuggestions(input, list);
      return;
    }

    const guessedIds = new Set(guesses.map((g) => g.talent.id));
    const matches = allTalents
      .filter((t) => !guessedIds.has(t.id))
      .filter((t) => matchesNamePrefix(t.name, query))
      .slice(0, 8);
    
    renderSuggestionList(matches, input, list);

  });
   // Clicking/focusing into an empty box browses the full roster, rather
  // than requiring the person to type something before seeing any
  // options. Only triggers when empty — if there's already text, typing
  // resumed via the `input` listener above takes over as normal.
  input.addEventListener('focus', () => {
    if (!input.value.trim()) {
      showAllSuggestions(input, list);
    }
  });

  document.addEventListener('click', (e) => {
    if (!list.contains(e.target) && e.target !== input) {
      list.classList.remove('visible');
    }
  });
}

// Shows every not-yet-guessed talent, unfiltered and uncapped — the
// dropdown's own max-height + overflow-y handles scrolling for however
// long the list ends up being.
function showAllSuggestions(input, list) {
  const guessedIds = new Set(guesses.map((g) => g.talent.id));
  const allAvailable = allTalents.filter((t) => !guessedIds.has(t.id));
  renderSuggestionList(allAvailable, input, list);
}

// Shared rendering for both the filtered (typed) and unfiltered (browse)
// suggestion lists, so there's only one place building the actual DOM.
function renderSuggestionList(matches, input, list) {
  list.innerHTML = '';

  if (matches.length === 0) {
    list.classList.remove('visible');
    return;
  }

  matches.forEach((t) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'suggestion-item';

    if (t.image_url) {
      const thumb = document.createElement('img');
      thumb.className = 'talent-thumb talent-thumb--suggestion';
      thumb.src = t.image_url;
      thumb.alt = '';
      thumb.loading = 'lazy';
      item.appendChild(thumb);
    }

    const label = document.createElement('span');
    label.textContent = t.name;
    item.appendChild(label);

    item.addEventListener('click', () => {
      submitGuess(t);
      input.value = '';
      list.innerHTML = '';
      list.classList.remove('visible');
    });
    list.appendChild(item);
  });

  list.classList.add('visible');
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// For values inserted into an HTML attribute (e.g. an img src URL) where
// the element-content trick `escapeHtml` uses doesn't apply, and the
// hex-only `escapeAttr` below would destroy real URL characters like
// "/", ":", "?", "=". Only escapes what's actually dangerous inside a
// double-quoted attribute: the quote character itself (plus & and < as
// a defensive baseline), leaving normal URL characters intact.
function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeAttr(str) {
  return String(str).replace(/[^#a-zA-Z0-9]/g, '');
}

// Matches if the FIRST or LAST word of the name starts with the query.
// Middle words are normally ignored — EXCEPT single-letter middle words
// (e.g. a middle initial like "Kuzuha K Something"), which are checked
// regardless of position. A single letter can't meaningfully have a
// "prefix" beyond itself, so that check is an exact match rather than
// startsWith.
function matchesNamePrefix(name, query) {
  const words = name.toLowerCase().trim().split(/\s+/);
  if (words.length === 0) return false;

  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  if (firstWord.startsWith(query) || lastWord.startsWith(query)) {
    return true;
  }

  return words.some((w) => w.length === 1 && w === query);
}
