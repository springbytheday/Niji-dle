// game.js
// Core NijiDle logic: load talent pool, resolve today's answer,
// compare guesses, render the attribute grid.

const STORAGE_KEY_PREFIX = 'nijidle_progress_';

let allTalents = [];
let answerTalent = null;
let guesses = [];
let gameOver = false;

// ----------------------------------------------------------------
// Date handling — the daily puzzle resets at local midnight.
// We key storage and the daily_puzzles lookup by this date string
// so everyone playing on the same calendar day gets the same answer.
// ----------------------------------------------------------------
function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Puzzle numbering for shared results (e.g. "NijiDle #12"), counting
// days since launch — same idea as Wordle's "#1247". Change this single
// constant when the real launch date is locked in; everything else
// recalculates automatically. Currently set for testing, NOT the real
// launch date.
const LAUNCH_DATE = '2026-06-27'; // TODO: update to the real launch date before going live
 
function getPuzzleNumber(dateKey) {
  const launch = new Date(LAUNCH_DATE + 'T00:00:00');
  const current = new Date(dateKey + 'T00:00:00');
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((current - launch) / msPerDay);
  // Clamped to 1 so testing before LAUNCH_DATE doesn't show a
  // nonsensical zero or negative puzzle number.
  return Math.max(1, diffDays + 1);
}

// ----------------------------------------------------------------
// Data loading
// ----------------------------------------------------------------
async function loadTalents() {
  const { data, error } = await db.from('talents').select('*').order('name');
  if (error) {
    console.error('Failed to load livers:', error);
    showError('Could not load the livers. Check your connection and try again.');
    return [];
  }
  return data;
}

async function resolveDailyAnswer(dateKey, talents) {
  // Look for a precomputed daily_puzzles row first.
  const { data, error } = await db
    .from('daily_puzzles')
    .select('talent_id')
    .eq('puzzle_date', dateKey)
    .maybeSingle();

  if (error) {
    console.error('Failed to load daily puzzle:', error);
  }

  if (data) {
    return talents.find((t) => t.id === data.talent_id) || null;
  }

  // Fallback: no row exists for today yet. Deterministically pick one
  // from the date string so it's still stable across reloads/devices,
  // even though it isn't pre-registered in daily_puzzles.
  const seed = hashString(dateKey);
  const index = seed % talents.length;
  return talents[index];
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
// Each attribute returns a status used to color its cell:
//   'hit'     - exact match (green/pink)
//   'partial' - same color family but not exact hex (liver color), or
//               shared a meaningful word (species, e.g. "human" in both
//               "half-demon half-human" and "magicborn human")
//   'miss'    - no match (gray)
//   'unknown' - data not available, never counted right or wrong
// Debut year additionally returns a direction: 'up' | 'down' | null
// ----------------------------------------------------------------
function compareGuess(guess, answer) {
  return {
    talent: guess,
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
  if (guessYear == null || answerYear == null) {
    return { status: 'unknown', direction: null, value: guessYear };
  }
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
// Birth month comparison (linear, like debut year — not cyclical).
// Stored as a full month name (e.g. "March") rather than a number, with
// "Unknown" (exact case) as a non-null sentinel for undisclosed talents.
// "Unknown" or any unrecognized text is treated the same as missing
// data: shown as the 'unknown' status, never counted right or wrong.
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
  if (guessVal == null || answerVal == null) {
    return { status: 'unknown', direction: null, value: guessVal };
  }
  const guessNum = monthNameToNumber(guessVal);
  const answerNum = monthNameToNumber(answerVal);
  console.log(guessNum);
  console.log(answerNum);
  // Covers "Unknown" and any other unrecognized text the same way.
  if (guessNum == null || answerNum == null) {
    return { status: 'unknown', direction: null, value: guessVal };
  }
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
  if (guessVal == null || answerVal == null) {
    return { status: 'unknown', value: guessVal };
  }
  return {
    status: guessVal === answerVal ? 'hit' : 'miss',
    value: guessVal,
  };
}

// ----------------------------------------------------------------
// Species comparison (word-overlap matching)
// Species is stored as free text (e.g. "half-demon half-human",
// "magicborn human") rather than a fixed vocabulary, so exact-string
// matching would miss real overlap like both species containing
// "human". Instead, split each value into meaningful words (splitting
// on spaces AND hyphens, so "half-demon" yields "demon") and check for
// any shared word, excluding generic modifiers like "half" that don't
// identify a species on their own.
// ----------------------------------------------------------------
const SPECIES_STOPWORDS = new Set(['half', 'born', 'quarter', 'part', 'and', 'the', 'a']);

function tokenizeSpecies(str) {
  return str
    .toLowerCase()
    .split(/[\s-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !SPECIES_STOPWORDS.has(w));
}

function compareSpecies(guessVal, answerVal) {
  if (guessVal == null || answerVal == null) {
    return { status: 'unknown', value: guessVal };
  }
  if (guessVal.toLowerCase() === answerVal.toLowerCase()) {
    return { status: 'hit', value: guessVal };
  }
  const guessTokens = new Set(tokenizeSpecies(guessVal));
  const answerTokens = new Set(tokenizeSpecies(answerVal));
  const sharesWord = [...guessTokens].some((t) => answerTokens.has(t));
  return { status: sharesWord ? 'partial' : 'miss', value: guessVal };
}

function compareLiverColor(guessColor, answerColor, guessHueFamily, answerHueFamily) {
  if (guessColor == null || answerColor == null) {
    return { status: 'unknown', value: guessColor };
  }
  if (guessColor.toLowerCase() === answerColor.toLowerCase()) {
    return { status: 'hit', value: guessColor };
  }
  // hue_family is manually assigned per talent (see supabase_schema.sql)
  // rather than computed from the hex value — manual judgment matches
  // fandom/branding color associations more reliably than an automatic
  // HSL-bucket calculation did. Grayscale only matches itself on exact
  // hex (handled above), never on family — two different grays/blacks/
  // whites read as genuinely different colors.
  if (
    guessHueFamily.toLowerCase() === answerHueFamily.toLowerCase()
  ) {
    return { status: 'partial', value: guessColor };
  }
  return { status: 'miss', value: guessColor };
}

// ----------------------------------------------------------------
// Local progress persistence (per-day, so refreshing doesn't lose state)
// ----------------------------------------------------------------
function saveProgress() {
  const key = STORAGE_KEY_PREFIX + todayKey();
  const payload = {
    answerId: answerTalent.id,
    guessIds: guesses.map((g) => g.talent.id),
    gameOver,
  };
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not persist progress:', e);
  }
}

function loadProgress() {
  const key = STORAGE_KEY_PREFIX + todayKey();
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// ----------------------------------------------------------------
// Game flow
// ----------------------------------------------------------------
async function initGame() {
  allTalents = await loadTalents();
  if (allTalents.length === 0) return;

  const dateKey = todayKey();
  answerTalent = await resolveDailyAnswer(dateKey, allTalents);

  if (!answerTalent) {
    showError('Could not determine today\u2019s puzzle. Please try again later.');
    return;
  }

  const saved = loadProgress();
  if (saved && saved.answerId === answerTalent.id) {
    guesses = saved.guessIds
      .map((id) => allTalents.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => compareGuess(t, answerTalent));
    gameOver = saved.gameOver;
  }

  renderBoard();
  setupAutocomplete();

  if (gameOver) {
    showEndState();
  }
}

function submitGuess(talent) {
  if (gameOver) return;
  if (guesses.some((g) => g.talent.id === talent.id)) return; // no duplicate guesses

  const result = compareGuess(talent, answerTalent);
  guesses.unshift(result); // newest guess on top, like a feed

  if (talent.id === answerTalent.id) {
    gameOver = true;
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
