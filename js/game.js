// Game logic: load liver pool, resolve today's answer, compare guesses, render the attribute grid.

const STORAGE_KEY_PREFIX = 'nijidle_progress_';
const UNLIMITED_STORAGE_KEY = 'nijidle_unlimited';

let alllivers = [];
let answerliver = null;
let guesses = [];
let gameOver = false;
let currentMode = 'daily'; 

// ----------------------------------------------------------------
// Date handling — the daily puzzle resets at local midnight.
// ----------------------------------------------------------------
function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ----------------------------------------------------------------
// Puzzle numbering for shared results, counting days since launch 
// ----------------------------------------------------------------
const LAUNCH_DATE = '2026-06-27';
 
function getPuzzleNumber(dateKey) {
  const launch = new Date(LAUNCH_DATE + 'T00:00:00');
  const current = new Date(dateKey + 'T00:00:00');
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((current - launch) / msPerDay);
  return Math.max(1, diffDays + 1);
}

// ----------------------------------------------------------------
// Data loading
// ----------------------------------------------------------------
async function loadlivers() {
  const { data, error } = await db.from('livers').select('*').order('name');
  if (error) {
    console.error('Failed to load livers:', error);
    showError('Could not load the livers. Check your connection and try again.');
    return [];
  }
  return data;
}

function preloadTalentImages(livers) {
  livers.forEach((l) => {
    if (l.image_url) {
      const img = new Image();
      img.src = l.image_url;
    }
  });
}

async function resolveDailyAnswer(dateKey, livers) {
  const { data, error } = await db.rpc('get_or_create_daily_puzzle', {
    target_date: dateKey,
  });
 
  if (error) {
    console.error('get_or_create_daily_puzzle RPC failed, using local fallback:', error);
    return resolveDailyAnswerFallback(dateKey, livers);
  }
 
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    console.error('get_or_create_daily_puzzle returned no row, using local fallback');
    return resolveDailyAnswerFallback(dateKey, livers);
  }
 
  return livers.find((t) => t.id === row.liver_id) || null;
}

// ----------------------------------------------------------------
// Last-resort fallback, only used if the RPC call above fails outright
// ----------------------------------------------------------------
function resolveDailyAnswerFallback(dateKey, livers) {
  const seed = hashString(dateKey);
  const index = seed % livers.length;
  return livers[index];
}

function resolveUnlimitedAnswer(livers) {
  const index = Math.floor(Math.random() * livers.length);
  return livers[index];
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ----------------------------------------------------------------
// Guess comparison
// ----------------------------------------------------------------
function compareGuess(guess, answer) {
  return {
    liver: guess,
    debutYear: compareDebutYear(guess.debut_year, answer.debut_year),
    gender: compareExact(guess.gender, answer.gender),
    species: compareSpecies(guess.species, answer.species),
    liverColor: compareLiverColor(
      guess.liver_color,
      answer.liver_color,
      guess.hue_family,
      answer.hue_family
    ),
    //birthMonth: compareBirthMonth(guess.bday_month, answer.bday_month),
  };
}

function compareDebutYear(guessYear, answerYear) {
  if (guessYear === answerYear) {
    return { status: 'hit', direction: null, value: guessYear };
  }
  return {
    status: 'miss',
    direction: guessYear < answerYear ? 'up' : 'down',
    value: guessYear,
  };
}

// ----------------------------------------------------------------
// Birth month comparison
// ----------------------------------------------------------------
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthNameToNumber(name) {
  if (!name) return null;
  const idx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === name.toLowerCase());
  return idx === -1 ? null : idx + 1; // 1-12
}

function compareBirthMonth(guessVal, answerVal) {
  const guessNum = monthNameToNumber(guessVal);
  const answerNum = monthNameToNumber(answerVal);

  if (guessNum === answerNum) {
    return { status: 'hit', direction: null, value: guessVal };
  }
  return {
    status: 'miss',
    direction: guessNum < answerNum ? 'up' : 'down',
    value: guessVal,
  };
}

function compareExact(guessVal, answerVal) {
  return {
    status: guessVal === answerVal ? 'hit' : 'miss',
    value: guessVal,
  };
}

// ----------------------------------------------------------------
// Species comparison 
// ----------------------------------------------------------------
const SPECIES_STOPWORDS = new Set(['half', 'born', 'quarter', 'part', 'and', 'the', 'a','beings']);

function tokenizeSpecies(str) {
  return str
    .toLowerCase()
    .split(/[\s,-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !SPECIES_STOPWORDS.has(w));
}

function compareSpecies(guessVal, answerVal) {
  if (guessVal.toLowerCase() === answerVal.toLowerCase()) {
    return { status: 'hit', value: guessVal };
  }
  const guessTokens = new Set(tokenizeSpecies(guessVal));
  const answerTokens = new Set(tokenizeSpecies(answerVal));
  const sharesWord = [...guessTokens].some((t) => answerTokens.has(t));
  return { status: sharesWord ? 'partial' : 'miss', value: guessVal };
}

// ----------------------------------------------------------------
// Color comparison
// ----------------------------------------------------------------
const COLOUR_NEIGHBOURS = {
  red:     ['orange', 'pink'],
  orange:  ['red', 'cream'],
  cream:   ['orange', 'yellow'],
  yellow:  ['cream', 'green'],
  green:   ['yellow', 'teal'],
  teal:    ['green', 'blue'],
  blue:    ['teal', 'purple'],
  purple:  ['blue', 'magenta'],
  magenta: ['purple', 'pink'],
  pink:    ['magenta', 'red'],
  // Achromatics are all neighbours of each other
  white:   ['grey', 'black'],
  grey:    ['white', 'black'],
  black:   ['white', 'grey'],
};

function areColourNeighbours(familyA, familyB) {
  const neighbours = COLOUR_NEIGHBOURS[familyA.toLowerCase()];
  return neighbours ? neighbours.includes(familyB.toLowerCase()) : false;
}

function compareLiverColor(guessColor, answerColor, guessHueFamily, answerHueFamily) {
  if (guessColor.toLowerCase() === answerColor.toLowerCase()) {
    return { status: 'hit', value: guessColor };
  }
  const g = guessHueFamily.toLowerCase();
  const a = answerHueFamily.toLowerCase();
  if (g === a) return { status: 'hit', value: guessColor };
  if (areColourNeighbours(g, a)) return { status: 'partial', value: guessColor };
  return { status: 'miss', value: guessColor };
}

// ----------------------------------------------------------------
// Local progress persistence (per-day, so refreshing doesn't lose state)
// ----------------------------------------------------------------
function saveProgress() {
  const payload = {
    answerId: answerliver.id,
    guessIds: guesses.map((g) => g.liver.id),
    gameOver,
  };
try {
    if (currentMode === 'daily') {
      const key = STORAGE_KEY_PREFIX + todayKey();
      localStorage.setItem(key, JSON.stringify(payload));
    } else {
      localStorage.setItem(UNLIMITED_STORAGE_KEY, JSON.stringify(payload));
    }
  } catch (e) {
    console.warn('Could not persist progress:', e);
  }
}

function loadProgress() {
  const key = STORAGE_KEY_PREFIX + todayKey();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function loadUnlimitedProgress() {
  try {
    const raw = localStorage.getItem(UNLIMITED_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function clearUnlimitedProgress() {
  try {
    localStorage.removeItem(UNLIMITED_STORAGE_KEY);
  } catch (e) {
    // Non-critical
  }
}

// ----------------------------------------------------------------
// Clears old daily mode progress data
// ----------------------------------------------------------------
function cleanupStaleProgress() {
  try {
    const todayPrefix = STORAGE_KEY_PREFIX + todayKey();
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        k.startsWith(STORAGE_KEY_PREFIX) &&
        k !== todayPrefix &&
        k !== UNLIMITED_STORAGE_KEY
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    // Non-critical
  }
}


// ----------------------------------------------------------------
// Game flow
// ----------------------------------------------------------------
async function initGame() {
  alllivers = await loadlivers();
  if (alllivers.length === 0) return;


  preloadTalentImages(alllivers);

  await switchMode('daily', true);
  setupAutocomplete();
}

async function switchMode(mode, isInitialLoad = false) {
  currentMode = mode;
  guesses = [];
  gameOver = false;
  answerliver = null;

  updateModeToggle(mode);

  if (mode === 'daily') {
    const dateKey = todayKey();
    answerliver = await resolveDailyAnswer(dateKey, alllivers);

    if (!answerliver) {
      showError('Could not determine today\u2019s puzzle. Please try again later.');
      return;
    }

    // Restore saved daily progress (guesses made earlier today).
    const saved = loadProgress();
    if (saved && saved.answerId === answerliver.id) {
      guesses = saved.guessIds
        .map((id) => alllivers.find((t) => t.id === id))
        .filter(Boolean)
        .map((t) => compareGuess(t, answerliver));
      gameOver = saved.gameOver;
    }
  } else {
    // Unlimited: restore a saved in-progress round if one exists,
    // otherwise pick a fresh random liver.
    const savedUnlimited = loadUnlimitedProgress();
    if (savedUnlimited) {
      const savedAnswer = alllivers.find((t) => t.id === savedUnlimited.answerId);
      if (savedAnswer) {
        answerliver = savedAnswer;
        guesses = savedUnlimited.guessIds
          .map((id) => alllivers.find((t) => t.id === id))
          .filter(Boolean)
          .map((t) => compareGuess(t, answerliver));
        gameOver = savedUnlimited.gameOver;
      } else {
        // Saved liver no longer in active roster (e.g. was deactivated)
        // — start fresh rather than restoring a broken state.
        clearUnlimitedProgress();
        answerliver = resolveUnlimitedAnswer(alllivers);
      }
    } else {
      answerliver = resolveUnlimitedAnswer(alllivers);
    }
  }

  stopCountdown();
  renderBoard();

  if (!isInitialLoad) {
    setupAutocomplete();
  }

  if (gameOver) {
    showEndState();
  }
}

// ----------------------------------------------------------------
// Unlimited Mode
// ----------------------------------------------------------------
function newUnlimitedRound() {
  clearUnlimitedProgress();
  guesses = [];
  gameOver = false;
  answerliver = resolveUnlimitedAnswer(alllivers);
  renderBoard();
  setupAutocomplete();
}


function submitGuess(liver) {
  if (gameOver) return;
  if (guesses.some((g) => g.liver.id === liver.id)) return; // no duplicate guesses

  const result = compareGuess(liver, answerliver);
  guesses.unshift(result); // newest guess on top, like a feed


  if (liver.id === answerliver.id) {
    gameOver = true;
    recordWin(guesses.length);
  }

  saveProgress();
  renderBoard(true); // animate the flip reveal for this fresh guess only

  if (gameOver) {
    showEndState();
  }
}

function showError(message) {
  const board = document.getElementById('board');
  if (board) {
    board.innerHTML = `<p class="error-state">${message}</p>`;
  }
}
// ----------------------------------------------------------------
// Unlimited Mode - Stats
// ----------------------------------------------------------------

const STATS_KEYS = {
  daily:     'nijidle_stats_daily',
  unlimited: 'nijidle_stats_unlimited',
};

function defaultStats(mode) {
  const base = {
    totalGuessesOnWins: 0,
    totalPlayed: 0
  };
  if (mode === 'daily') {
    // Daily needs date tracking for skip-a-day streak detection
    base.currentStreak = 0;
    base.bestStreak = 0;
    base.lastSolvedDate = null; // 'YYYY-MM-DD' of the most recent solved day
  }
  return base;
}

function loadStats(mode) {
  try {
    const raw = localStorage.getItem(STATS_KEYS[mode]);
    if (!raw) return defaultStats(mode);
    return { ...defaultStats(mode), ...JSON.parse(raw) };
  } catch (e) {
    return defaultStats(mode);
  }
}
 
function saveStats(mode, stats) {
  try {
    localStorage.setItem(STATS_KEYS[mode], JSON.stringify(stats));
  } catch (e) {
    console.warn('Could not save stats:', e);
  }
}
 
function recordWin(guessCount) {
  const mode = currentMode;
  const stats = loadStats(mode);
 
  if (mode === 'daily') {
    const today = todayKey();
    const yesterday = getPreviousDay(today);
 
    // Guard against double-counting if the page is reloaded after solving
    if (stats.lastSolvedDate === today) return;
 
    stats.totalPlayed += 1;
    stats.totalGuessesOnWins += guessCount;
 
    // Streak continues only if the last solved day was yesterday.
    // Otherwise it's been skipped — reset to 1.
    if (stats.lastSolvedDate === yesterday) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
 
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    stats.lastSolvedDate = today;
  } else {
    // Unlimited: no loss condition, streak only ever grows
    stats.totalPlayed += 1;
    stats.totalGuessesOnWins += guessCount;
  }
 
  saveStats(mode, stats);
}
 
// Returns 'YYYY-MM-DD' for the calendar day before the given dateKey
function getPreviousDay(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
 
function getStats(mode) {
  const stats = loadStats(mode);
  const avg = stats.totalPlayed > 0
    ? (stats.totalGuessesOnWins / stats.totalPlayed).toFixed(1)
    : '—';
  return { ...stats, averageGuesses: avg };
}