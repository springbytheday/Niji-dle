function getAnnouncementKey(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return 'nijidle_announcement_' + Math.abs(hash);
}

function setupAnnouncement() {
  const overlay     = document.getElementById('announcement-overlay');
  const popup       = document.getElementById('announcement-popup');
  const closeBtn    = document.getElementById('announcement-close');
  const reopenBtn   = document.getElementById('announcement-button');

  if (!overlay || !popup || !closeBtn) return;

  const key = getAnnouncementKey(popup.innerHTML);

  function show() {
    overlay.classList.add('visible');
    document.addEventListener('keydown', onKeydown);
  }

  function dismiss() {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', onKeydown);
    try {
      localStorage.setItem(key, 'dismissed');
    } catch (e) {}
  }

  function onKeydown(e) {
    if (e.key === 'Escape') dismiss();
  }

  closeBtn.addEventListener('click', dismiss);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismiss();
  });

  if (reopenBtn) {
    reopenBtn.addEventListener('click', show);
  }

  // Explicitly disabled in HTML, or already dismissed — don't auto-show,
  // but the reopen button above still works regardless.
  if (popup.dataset.announcementDisabled === 'true') return;
  try {
    if (localStorage.getItem(key) === 'dismissed') return;
  } catch (e) {}

  show();
}

setupAnnouncement();