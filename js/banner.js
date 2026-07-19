const ANNOUNCEMENT_MESSAGE = 'Color rework, unlimited mode and species categorization has been updated. Check out information(i) icon for more details.'; // ← edit or set to null to hide

const ANNOUNCEMENT_LINK = null; //Null for default
const ANNOUNCEMENT_LINK_TEXT = '';

function getBannerKey(message) {
  // Derive a stable short key from the message so each unique message
  // gets its own dismissed state in localStorage.
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash << 5) - hash + message.charCodeAt(i);
    hash |= 0;
  }
  return 'nijidle_announcement_' + Math.abs(hash);
}

function setupAnnouncement() {
  const banner   = document.getElementById('announcement-banner');
  const textEl   = document.getElementById('announcement-text');
  const closeBtn = document.getElementById('announcement-close');

  if (!banner || !textEl || !closeBtn) return;

  // No message configured — keep banner hidden
  if (!ANNOUNCEMENT_MESSAGE) return;

  const key = getBannerKey(ANNOUNCEMENT_MESSAGE);

  // Already dismissed — don't show
  try {
    if (localStorage.getItem(key) === 'dismissed') return;
  } catch (e) {}

  // Build the banner content
  if (ANNOUNCEMENT_LINK) {
    textEl.textContent = ANNOUNCEMENT_MESSAGE + ' ';
    const link = document.createElement('a');
    link.href = ANNOUNCEMENT_LINK;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'announcement-link';
    link.textContent = ANNOUNCEMENT_LINK_TEXT;
    textEl.appendChild(link);
  } else {
    textEl.textContent = ANNOUNCEMENT_MESSAGE;
  }

  banner.classList.add('announcement-banner--visible');

  closeBtn.addEventListener('click', () => {
    banner.classList.remove('announcement-banner--visible');
    try {
      localStorage.setItem(key, 'dismissed');
    } catch (e) {}
  });
}

setupAnnouncement();