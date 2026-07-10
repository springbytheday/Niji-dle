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

  const base = `
      <div class="empty-state">
        <p>Make your first guess to start the board.</p>
      </div>`;
  
  const header = `
    <div class="row row--header">
      <div class="cell cell--header">Liver</div>
      ${COLUMNS.map((c) => `<div class="cell cell--header">${c.label}</div>`).join('')}
    </div>`;

  if (guesses.length === 0) {
    board.innerHTML = header + base;
    return;
  }

  // Respect reduced-motion preferences
  const shouldAnimate =
    animateFirst && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rows = guesses
    .map((g, i) => renderRow(g, i === 0, i === 0 && shouldAnimate))
    .join('');

  board.innerHTML = header + rows;

  if (shouldAnimate) {
    attachFlipEndHandlers(board);
  }
}

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
  const { liver } = guessResult;
  const rowClass = isNewest ? 'row row--newest' : 'row';

  const cells = COLUMNS.map((col, i) =>
    renderCell(col.key, guessResult[col.key], animate ? i : null)
  ).join('');

  const hasImage = Boolean(liver.image_url);
  const thumbnail = hasImage
  ? `<img class="liver-thumb" src="${escapeHtmlAttr(liver.image_url)}" alt="" loading="lazy" />`
  : '';
  const nameCellClass = hasImage ? 'cell cell--name has-image' : 'cell cell--name'

  return `
    <div class="${rowClass}">
      <div class="${nameCellClass}">
        ${thumbnail}
        <div class="liver-name-block">
          <span class="liver-name">${escapeHtml(liver.name)}</span>
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

function flipAttrs(status, flipIndex) {
  if (flipIndex == null) {
    return { classes: `cell--${status}`, style: '' };
  }
  const delayMs = flipIndex * 150;
  const reveal = {
    hit: { bg: 'var(--hit)', color: '#fff', border: 'transparent' },
    partial: { bg: 'var(--partial)', color: '#1a1300', border: 'transparent' },
    miss: { bg: 'var(--miss)', color: 'var(--text)', border: 'transparent' },
  }[status];

  const style = `--flip-delay:${delayMs}ms; --flip-reveal-bg: ${reveal.bg}; --flip-reveal-color: ${reveal.color}; --flip-reveal-border: ${reveal.border};`;
  return { classes: 'cell--flip', style };
}

function renderTextCell(data, flipIndex) {
  const { classes, style } = flipAttrs(data.status, flipIndex);
  const display = data.value == null ? '?' : escapeHtml(String(data.value));
  return `<div class="cell ${classes}" style="${style}" data-status="${data.status}">${display}</div>`;
}

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

// ----------------------------------------------------------------
// Sharing results
// ----------------------------------------------------------------
const STATUS_EMOJI = {
  hit: '🟩',
  partial: '🟨',
  miss: '⬛',
};

function buildEmojiGrid() {
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
  return `${summary}\n\n${buildEmojiGrid()}\n\nhttps://www.nijidle.com/`;
}
 
async function copyShareText(button) {
  const text = buildShareText();
  try {
    await navigator.clipboard.writeText(text);
    showCopyFeedback(button, 'Copied!');
  } catch (e) {
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

let countdownIntervalId = null;
 
function getMsUntilNextLocalMidnight() {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0, 0
  );
  return nextMidnight - now;
}
 
function formatCountdown(ms) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
 
function startCountdown() {
  stopCountdown();
 
  const display = document.getElementById('countdown-display');
  if (!display) return;
 
  function tick() {
    const msRemaining = getMsUntilNextLocalMidnight();
    display.textContent = formatCountdown(msRemaining);
 
    if (msRemaining <= 0) {
      stopCountdown();
      window.location.reload(); //reload when hit 00:00
    }
  }
 
  tick();
  countdownIntervalId = setInterval(tick, 1000);
}
 
function stopCountdown() {
  if (countdownIntervalId !== null) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
}

function showEndState() {
  const banner = document.getElementById('end-banner');
  const input = document.getElementById('guess-input');
  if (input) {
    input.disabled = true;
    input.placeholder = currentMode === 'daily' ? "Today's liver has been found" : "You've found the liver";
  }

  if (!banner) return;

  if (currentMode === 'daily') {
    banner.innerHTML = `
      <div class="end-card">
        <p class="end-title">It was ${escapeHtml(answerliver.name)}!</p>
        <p class="end-sub">New liver in: <span id="countdown-display" class="countdown-display">00:00:00</span></p>
        <button id="share-button" class="share-button" type="button">Share results</button>
        <a class="end-link" href="https://forms.gle/amsYyEbaHsDTHoSD7">Share some fun facts of your fav livers~</a>
      </div>`;
    banner.classList.add('visible');
 
    const shareButton = document.getElementById('share-button');
    if (shareButton) {
      shareButton.addEventListener('click', () => copyShareText(shareButton));
    }
    
    startCountdown();
  }
  else {
    // Unlimited mode — no countdown or share, just a play-again button
    banner.innerHTML = `
      <div class="end-card">
        <p class="end-title">It was ${escapeHtml(answerliver.name)}!</p>
        <p class="end-sub">Want to go again?</p>
        <button id="play-again-button" class="share-button" type="button">Play again</button>
      </div>`;
    banner.classList.add('visible');

    const playAgainButton = document.getElementById('play-again-button');
    if (playAgainButton) {
      playAgainButton.addEventListener('click', () => {
        banner.classList.remove('visible');
        banner.innerHTML = '';
        input.disabled = false;
        input.placeholder = "Type a liver name...";
        newUnlimitedRound();
      });
    }
  }
}

// ----------------------------------------------------------------
// Modes
// ----------------------------------------------------------------

// Updates the mode toggle tabs to reflect which mode is currently active.
// Called by switchMode() in game.js whenever the mode changes.
function updateModeToggle(mode) {
  const dailyTab = document.getElementById('mode-daily');
  const unlimitedTab = document.getElementById('mode-unlimited');
  if (dailyTab && unlimitedTab) {
    dailyTab.classList.toggle('mode-tab--active', mode === 'daily');
    dailyTab.setAttribute('aria-selected', mode === 'daily' ? 'true' : 'false');
    unlimitedTab.classList.toggle('mode-tab--active', mode === 'unlimited');
    unlimitedTab.setAttribute('aria-selected', mode === 'unlimited' ? 'true' : 'false');
  }

  const prompt = document.getElementById('game-prompt');
  if (prompt) {
    prompt.textContent = mode === 'daily'
      ? 'Guess today\u2019s Nijisanji liver'
      : 'Guess any Nijisanji liver';
  }

  // Clear the end-banner and stop the countdown when switching modes,
  // so a won daily board doesn't leave a frozen end-card when you
  // switch to unlimited (and vice versa).
  const banner = document.getElementById('end-banner');
  if (banner) {
    banner.classList.remove('visible');
    banner.innerHTML = '';
  }
  const input = document.getElementById('guess-input');
  if (input && mode === 'unlimited') {
    input.disabled = false;
    input.placeholder = "Type a liver name...";
  }
  stopCountdown();
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
      showAllSuggestions(input, list);
      return;
    }
9
    if (query.includes(" ")) {
      const matches = alllivers.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
      renderSuggestionList(matches, input, list);
    }
    else {
      const guessedIds = new Set(guesses.map((g) => g.liver.id));
      const matches = alllivers
      .filter((t) => !guessedIds.has(t.id))
      .filter((t) => matchesNamePrefix(t.name, query))
        .slice(0, 8);
      renderSuggestionList(matches, input, list);
    }
  });

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

function showAllSuggestions(input, list) {
  const guessedIds = new Set(guesses.map((g) => g.liver.id));
  const allAvailable = alllivers.filter((t) => !guessedIds.has(t.id));
  renderSuggestionList(allAvailable, input, list);
}

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
      thumb.className = 'liver-thumb liver-thumb--suggestion';
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

function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeAttr(str) {
  return String(str).replace(/[^#a-zA-Z0-9]/g, '');
}

//Param: Name - answer, Query - guess
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
