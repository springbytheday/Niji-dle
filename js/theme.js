const THEME_STORAGE_KEY = 'nijidle_theme';

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
  }
}

function getEffectiveTheme() {
  const saved = getSavedTheme();
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
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

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (!getSavedTheme()) {
      applyTheme(getEffectiveTheme());
    }
  });
}

initTheme();
