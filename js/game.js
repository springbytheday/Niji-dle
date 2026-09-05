// Game logic: load liver pool, resolve today's answer, compare guesses, render the attribute grid.

const STORAGE_KEY_PREFIX = 'nijidle_progress_';
const UNLIMITED_STORAGE_KEY = 'nijidle_unlimited';

const LAUNCH_DATE = '2026-06-27';

const DAILY_BRANCHES = ['en', 'jp', 'ex-kr', 'ex-id'];

let alllivers = [];
let answerliver = null;
let guesses = [];
let gameOver = false;
let currentMode = 'daily'; 

let dailyState = { answer: null, guesses: [], gameOver: false };
let unlimitedState = { answer: null, guesses: [], gameOver: false };

const BRANCH_STORAGE_KEY = 'nijidle_branches';
let selectedBranches = [];

// Human-readable branch names for labeling stats.
const BRANCH_DISPLAY_NAMES = {
  en: 'EN',
  jp: 'JP',
  'ex-kr': 'ex-KR',
  'ex-id': 'ex-ID',
};

// ----------------------------------------------------------------
// Unlimited mode — branch filtering
// ----------------------------------------------------------------
// Returns the sorted list of distinct branch values present in the pool.
function getAllBranches() {
  return [...new Set(alllivers.map((t) => t.branch).filter(Boolean))].sort();
}

function loadSavedBranches() {
  try {
    const raw = localStorage.getItem(BRANCH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}

function saveBranches(branches) {
  try {
    localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(branches));
  } catch (e) {
    // Non-critical
  }
}

// Livers eligible to be the Unlimited answer, given the current branch
// selection. Falls back to the full roster if the filter would otherwise
// leave nothing to pick from.
function getUnlimitedPool() {
  const pool = alllivers.filter((t) => selectedBranches.includes(t.branch));
  return pool.length > 0 ? pool : alllivers;
}

// Opens the branch picker modal (see modal.js) and resolves once the
// player confirms a selection, saving it for next time.
function chooseBranches() {
  return new Promise((resolve) => {
    if (typeof openBranchPicker !== 'function') {
      // Picker isn't available for some reason — fall back to everything.
      resolve(getAllBranches());
      return;
    }
    openBranchPicker((branches) => {
      selectedBranches = branches;
      saveBranches(branches);
      resolve(branches);
    });
  });
}

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

// Livers that can be typed/selected as a guess in the current mode.
// Daily is scoped to the same branches the puzzle answer can come from
// (see get_or_create_daily_puzzle); Unlimited is scoped to whatever
// branches the player picked in the branch picker — same pool the
// answer itself was drawn from.
function getGuessablePool() {
  if (currentMode === 'daily') {
    const eligible = alllivers.filter((t) => DAILY_BRANCHES.includes(String(t.branch).toLowerCase()));
    return eligible.length > 0 ? eligible : alllivers;
  }
  return getUnlimitedPool();
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
  const eligible = livers.filter((t) => DAILY_BRANCHES.includes(String(t.branch).toLowerCase()));
  const pool = eligible.length > 0 ? eligible : livers;
  const seed = hashString(dateKey);
  const index = seed % pool.length;
  return pool[index];
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
const SPECIES_STOPWORDS = new Set(['half', 'born', 'quarter', 'part', 'and', 'the', 'a','being']);

function tokenizeSpecies(str) {
  return str
    .toLowerCase()
    .split(/[\s,:\-]+/)
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
    return { status: 'hit', color: guessColor, family:guessHueFamily};
  }
  const g = guessHueFamily.toLowerCase();
  const a = answerHueFamily.toLowerCase();
  if (g === a) return { status: 'partial', color: guessColor, family:guessHueFamily};
  if (areColourNeighbours(g, a)) return { status: 'another_partial', color: guessColor, family:guessHueFamily};
  return { status: 'miss', color: guessColor, family:guessHueFamily};
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
  updateModeToggle(mode);

  if (mode === 'daily') {
    const dateKey = todayKey();
    const resolved = await resolveDailyAnswer(dateKey, alllivers);

    // Bail if the user left Daily while this RPC was in flight
    if (currentMode !== 'daily') return;

    if (!resolved) {
      showError('Could not determine today\u2019s puzzle. Please try again later.');
      return;
    }

    dailyState = { answer: resolved, guesses: [], gameOver: false };

    // Restore saved daily progress (guesses made earlier today).
    const saved = loadProgress();
    if (saved && saved.answerId === resolved.id) {
      dailyState.guesses = saved.guessIds
        .map((id) => alllivers.find((t) => t.id === id))
        .filter(Boolean)
        .map((t) => compareGuess(t, resolved));
      dailyState.gameOver = saved.gameOver;
    }
    applyState(dailyState);
  } else {
    const savedUnlimited = loadUnlimitedProgress();
    unlimitedState = { answer: null, guesses: [], gameOver: false };
    guesses = [];
    gameOver = false;
    renderBoard();
    if (savedUnlimited) {
      const savedAnswer = alllivers.find((t) => t.id === savedUnlimited.answerId);
      if (savedAnswer) {
        unlimitedState.answer = savedAnswer;
        unlimitedState.guesses = savedUnlimited.guessIds
          .map((id) => alllivers.find((t) => t.id === id))
          .filter(Boolean)
          .map((t) => compareGuess(t, savedAnswer));
        unlimitedState.gameOver = savedUnlimited.gameOver;
        // Restore the branch filter this round was started with, so a
        // page reload mid-round doesn't silently reopen guessing to
        // every branch again.
        selectedBranches = loadSavedBranches() || getAllBranches();
      } else {
        // Saved liver no longer in active roster (e.g. was deactivated)
        // — start fresh rather than restoring a broken state.
        clearUnlimitedProgress();
        selectedBranches = await chooseBranches();
        unlimitedState.answer = resolveUnlimitedAnswer(getUnlimitedPool());
      }
    } else {
      selectedBranches = await chooseBranches();
      unlimitedState.answer = resolveUnlimitedAnswer(getUnlimitedPool());
    }
    if (currentMode !== 'unlimited') return;
    applyState(unlimitedState);
  }
}

function applyState(state) {
  answerliver = state.answer;
  guesses = state.guesses;
  gameOver = state.gameOver;

  const giveUpBtn = document.getElementById('give-up-button');
  if (giveUpBtn) {
    giveUpBtn.style.display = (currentMode === 'unlimited' && !gameOver) ? 'inline-flex' : 'none';
  }
  const changeBranchesBtn = document.getElementById('settings-button');
  if (changeBranchesBtn) {
    changeBranchesBtn.style.display = (currentMode === 'unlimited' && !gameOver) ? 'inline-flex' : 'none';
  }
  stopCountdown();
  renderBoard();
  if (gameOver) showEndState();
}

// ----------------------------------------------------------------
// Unlimited Mode
// ----------------------------------------------------------------
async function newUnlimitedRound() {
  clearUnlimitedProgress();
  guesses = [];
  gameOver = false;
  renderBoard();
  if (!selectedBranches || selectedBranches.length === 0) {
    selectedBranches = loadSavedBranches() || await chooseBranches();
  }
  unlimitedState = { answer: resolveUnlimitedAnswer(getUnlimitedPool()), guesses: [], gameOver: false };
  applyState(unlimitedState);
}

// Called by modal.js's Settings modal when the player applies a new
// branch selection. Starts a fresh unlimited round under the new
// filter. If a future "Columns" tab is added to Settings, extend the
// payload object rather than adding a second global callback.
window.onSettingsApplied = function ({ branches }) {
  if (currentMode !== 'unlimited') return;
  selectedBranches = branches;
  saveBranches(branches);
  clearUnlimitedProgress();
  unlimitedState = { answer: resolveUnlimitedAnswer(getUnlimitedPool()), guesses: [], gameOver: false };
  applyState(unlimitedState);
};

function submitGuess(liver) {
  if (gameOver) return;
  if (guesses.some((g) => g.liver.id === liver.id)) return; // no duplicate guesses
  
  const result = compareGuess(liver, answerliver);
  guesses.unshift(result); // newest guess on top, like a feed


  if (liver.id === answerliver.id) {
    gameOver = true;
    (currentMode === 'daily' ? dailyState : unlimitedState).gameOver = true; 
    recordResult(currentMode, { won: true, guessCount: guesses.length }, getBranchSignature(selectedBranches));
  }

  saveProgress();
  renderBoard(true); // animate the flip reveal for this fresh guess only

  if (gameOver) {
    document.getElementById('give-up-button')?.style.setProperty('display', 'none');
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
// Stats
// ----------------------------------------------------------------

const STATS_KEYS = {
  daily:     'nijidle_stats_daily',
  unlimited: 'nijidle_stats_unlimited',
};

function defaultStats(mode) {
  const base = {
    totalGuessesOnWins: 0,
    totalGuessesAll: 0,
    totalPlayed: 0,
    totalWins: 0,
  };
  if (mode === 'daily') {
    base.currentStreak = 0;
    base.bestStreak = 0;
    base.lastSolvedDate = null;
  }
  return base;
}

// Order-independent key for a branch selection, e.g. ['jp','en'] -> 'en,jp'
function getBranchSignature(branches) {
  return [...branches].sort().join(',');
}

function loadUnlimitedStatsMap() {
  let map;
  try {
    const raw = localStorage.getItem(STATS_KEYS.unlimited);
    map = raw ? JSON.parse(raw) : {};
  } catch (e) {
    map = {};
  }
  if (map && typeof map === 'object' && 'totalPlayed' in map) {
    const legacy = map;
    const allSig = getBranchSignature(getAllBranches());
    map = { [allSig]: legacy };
    saveUnlimitedStatsMap(map);
  }
  return map || {};
}

function saveUnlimitedStatsMap(map) {
  try {
    localStorage.setItem(STATS_KEYS.unlimited, JSON.stringify(map));
  } catch (e) {
    console.warn('Could not save stats:', e);
  }
}

function loadStats(mode, branchSignature) {
  if (mode === 'daily') {
    try {
      const raw = localStorage.getItem(STATS_KEYS.daily);
      if (!raw) return defaultStats('daily');
      return { ...defaultStats('daily'), ...JSON.parse(raw) };
    } catch (e) {
      return defaultStats('daily');
    }
  }
  const map = loadUnlimitedStatsMap();
  return { ...defaultStats('unlimited'), ...(map[branchSignature] || {}) };
}
 
function saveStats(mode, stats, branchSignature) {
  if (mode === 'daily') {
    try {
      localStorage.setItem(STATS_KEYS.daily, JSON.stringify(stats));
    } catch (e) {
      console.warn('Could not save stats:', e);
    }
    return;
  }
  const map = loadUnlimitedStatsMap();
  map[branchSignature] = stats;
  saveUnlimitedStatsMap(map);
}
 
function recordResult(mode, { won, guessCount = 0 }, branchSignature) {
  const stats = loadStats(mode, branchSignature);

  if (mode === 'daily') {
    if (!won) return; // no give-up path in daily

    const today = todayKey();
    const yesterday = getPreviousDay(today);
    if (stats.lastSolvedDate === today) return; // guard double-count on reload

    stats.totalPlayed += 1;
    stats.totalWins += 1;
    stats.totalGuessesOnWins += guessCount;
    stats.totalGuessesAll += guessCount;

    stats.currentStreak = stats.lastSolvedDate === yesterday ? stats.currentStreak + 1 : 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    stats.lastSolvedDate = today;
  } else {
    stats.totalPlayed += 1; // wins AND give-ups count as played
    stats.totalGuessesAll += guessCount;
    if (won) {
      stats.totalWins += 1;
      stats.totalGuessesOnWins += guessCount;
    }
  }

  saveStats(mode, stats, branchSignature);
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
 
function getStats(mode, branchSignature) {
  const stats = loadStats(mode, branchSignature);
  const averageGuessesOnWins = stats.totalWins > 0
    ? (stats.totalGuessesOnWins / stats.totalWins).toFixed(1)
    : '—';
  const averageGuessesAll = stats.totalPlayed > 0
    ? (stats.totalGuessesAll / stats.totalPlayed).toFixed(1)
    : '—';
  return { ...stats, averageGuessesOnWins, averageGuessesAll };
}

function giveUpUnlimited() {
  if (currentMode !== 'unlimited' || gameOver) return;

  gameOver = true;
  gaveUp = true;
  recordResult('unlimited', { won: false, guessCount: guesses.length }, getBranchSignature(selectedBranches));
  saveProgress();
  renderBoard();
  showEndState(true);
}

function formatBranchName(branch) {
  return BRANCH_DISPLAY_NAMES[branch] || branch;
}

// Turns a branch signature back into a display label, e.g.
// "en,jp" -> "EN, JP". If the signature matches every known branch,
// show "All branches" instead of spelling all of them out.
function getBranchLabel(signature) {
  if (!signature) return 'All branches';
  const branches = signature.split(',').filter(Boolean);
  const allSig = getBranchSignature(getAllBranches());
  if (signature === allSig) return 'All branches';
  return branches.map(formatBranchName).join(', ');
}

// Every branch-combo the player has ever recorded unlimited stats
// under, with derived win rate, sorted by most-played first.
function getAllUnlimitedStats() {
  const map = loadUnlimitedStatsMap();
  return Object.keys(map)
    .map((sig) => {
      const stats = { ...defaultStats('unlimited'), ...map[sig] };
      const averageGuessesOnWins = stats.totalWins > 0
        ? (stats.totalGuessesOnWins / stats.totalWins).toFixed(1)
        : '—';
      const averageGuessesAll = stats.totalPlayed > 0
        ? (stats.totalGuessesAll / stats.totalPlayed).toFixed(1)
        : '—';
      const winRate = stats.totalPlayed > 0
        ? Math.round((stats.totalWins / stats.totalPlayed) * 100)
        : 0;
      return {
        signature: sig,
        label: getBranchLabel(sig),
        totalPlayed: stats.totalPlayed,
        totalWins: stats.totalWins,
        winRate,
        averageGuessesOnWins,
        averageGuessesAll,
      };
    })
    .sort((a, b) => b.totalPlayed - a.totalPlayed);
}