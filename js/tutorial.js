// tutorial.js
//
// Tutorial modal: shows automatically on a person's first-ever visit
// (tracked via localStorage, same pattern as theme.js), and can be
// reopened any time via the help icon in the header.

const TUTORIAL_STORAGE_KEY = 'nijidle_tutorial_seen';

function hasSeenTutorial() {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  } catch (e) {
    return false; // localStorage unavailable — treat as "not seen" each time
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  } catch (e) {
    // Nothing to do — the modal just won't remember being dismissed
    // across reloads if storage isn't available.
  }
}

function setupTutorial() {
  const overlay = document.getElementById('tutorial-overlay');
  const dialog = document.getElementById('tutorial-dialog');
  const closeButton = document.getElementById('tutorial-close');
  const startButton = document.getElementById('tutorial-start');
  const helpButton = document.getElementById('help-button');

  if (!overlay || !dialog || !helpButton) return;

  let lastFocusedElement = null;

  function openTutorial() {
    lastFocusedElement = document.activeElement;
    overlay.classList.add('visible');
    document.addEventListener('keydown', handleKeydown);
    // Focus the dialog itself first, which is the conventional initial
    // focus target for a dialog whose heading is its main content,
    // rather than jumping straight to a button inside it.
    dialog.focus();
  }

  function closeTutorial() {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', handleKeydown);
    markTutorialSeen();
    // Return focus to whatever triggered the modal (the help button,
    // or nothing if it was the automatic first-visit open), rather than
    // leaving focus lost on a now-hidden element.
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeTutorial();
      return;
    }
    if (e.key === 'Tab') {
      trapFocus(e);
    }
  }

  // Keeps Tab/Shift+Tab cycling within the dialog's focusable elements
  // instead of escaping into the page behind the overlay.
  function trapFocus(e) {
    const focusable = dialog.querySelectorAll('button');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  helpButton.addEventListener('click', openTutorial);
  closeButton.addEventListener('click', closeTutorial);
  startButton.addEventListener('click', closeTutorial);

  // Clicking the overlay backdrop itself (not the dialog content) also
  // closes it, a standard modal convention.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeTutorial();
    }
  });

  if (!hasSeenTutorial()) {
    openTutorial();
  }
}

setupTutorial();
