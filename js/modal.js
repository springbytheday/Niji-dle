const TUTORIAL_STORAGE_KEY = 'nijidle_tutorial_seen';

function hasSeenTutorial() {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  } catch (e) {
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
    dialog.focus();
  }

  function closeTutorial() {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', handleKeydown);
    markTutorialSeen();
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

  if (!hasSeenTutorial()) {
    openTutorial();
  }
}

function setupInformation() {
  const overlay = document.getElementById('information-overlay');
  const dialog = document.getElementById('information-dialog');
  const closeButton = document.getElementById('information-close');
  const infoButton = document.getElementById('info-button');

  if (!overlay || !dialog || !infoButton) return;

  let lastFocusedElement = null;

  function openInformation() {
    lastFocusedElement = document.activeElement;
    overlay.classList.add('visible');
    document.addEventListener('keydown', handleKeydown);
    dialog.focus();
  }

  function closeInformation() {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', handleKeydown);
    markTutorialSeen();
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

  infoButton.addEventListener('click', openInformation);
  closeButton.addEventListener('click', closeInformation);

}

setupInformation();
setupTutorial();
