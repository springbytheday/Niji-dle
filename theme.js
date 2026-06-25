// theme.js
//
// Light/dark theme handling. Defaults to the OS preference
// (prefers-color-scheme), which the CSS in style.css already handles
// on its own via a media query — this script only needs to act once
// the person has manually toggled, since that's the case CSS alone
// can't express (a media query can't be "overridden" by a click).
//
// Persists the manual choice in localStorage so it's remembered next
// visit. If the person has never manually toggled, no data-theme
// attribute is set at all, and the page just follows the OS preference
// (and continues following it live if the OS preference changes).

const THEME_STORAGE_KEY = 'nijidle_theme';

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (e) {
    return null; // localStorage unavailable (e.g. private browsing) — fall back to OS preference
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    // Nothing to do if storage isn't available — the toggle still works
    // for the current page view, it just won't persist on reload.
  }
}

function getEffectiveTheme() {
  const saved = getSavedTheme();
  if (saved === 'dark' || saved === 'light') return saved;
  // No manual preference saved — mirror the current OS preference so
  // the toggle button's icon starts in the right state.
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    // Shows the symbol for the CURRENT theme (sun while in light mode,
    // moon while in dark mode) — not what you'd switch to.
    icon.innerHTML = theme === 'light' ? '&#9788;' : '&#9790;';
  }
}

function initTheme() {
  applyTheme(getEffectiveTheme());

  const toggleButton = document.getElementById('theme-toggle');
  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      saveTheme(next);
    });
  }

  // If the person has never manually chosen a theme, keep following
  // OS preference changes live (e.g. their system switches to dark mode
  // at sunset). Once they've manually toggled, this listener still
  // fires but getEffectiveTheme() will keep returning their saved
  // choice instead, since getSavedTheme() takes priority.
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (!getSavedTheme()) {
      applyTheme(getEffectiveTheme());
    }
  });
}

initTheme();
