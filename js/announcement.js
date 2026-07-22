function getAnnouncementKey(content) {
  // Derive a stable short key from the content so each unique version
  // of the announcement gets its own dismissed state in localStorage.
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return 'nijidle_announcement_' + Math.abs(hash);
}

function setupAnnouncement() {
  const overlay  = document.getElementById('announcement-overlay');
  const popup    = document.getElementById('announcement-popup');
  const closeBtn = document.getElementById('announcement-close');

  if (!overlay || !popup || !closeBtn) return;

  // Explicitly disabled in HTML — keep hidden
  if (popup.dataset.announcementDisabled === 'true') return;

  // Key is derived from the popup's own HTML content, so any edit to
  // the title/text/link in the HTML automatically resets dismissal.
  const key = getAnnouncementKey(popup.innerHTML);

  // Already dismissed — don't show
  try {
    if (localStorage.getItem(key) === 'dismissed') return;
  } catch (e) {}

  function dismiss() {
    overlay.classList.remove('visible');
    try {
      localStorage.setItem(key, 'dismissed');
    } catch (e) {}
  }

  overlay.classList.add('visible');

  closeBtn.addEventListener('click', dismiss);

  // Click outside the popup box also dismisses it
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismiss();
  });

  // Escape key dismisses it
  document.addEventListener('keydown', function onKeydown(e) {
    if (e.key === 'Escape') {
      dismiss();
      document.removeEventListener('keydown', onKeydown);
    }
  });
}

setupAnnouncement();