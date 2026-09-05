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
}

function setupInformation() {
const overlay = document.getElementById('overlay-overlay');
const dialog = document.getElementById('overlay-dialog');
const closeBtn = document.getElementById('overlay-close');
const startBtn = document.getElementById('overlay-start');
const helpBtn = document.getElementById('info-button');

if (!overlay || !dialog || !helpBtn) return;

let lastFocused = null;

// ── Tab switching ──────────────────────────────────────────────
const tabs = dialog.querySelectorAll('.overlay-tab');
const panels = dialog.querySelectorAll('.overlay-panel');

function switchTab(targetTabId) {
tabs.forEach((tab) => {
const isActive = tab.dataset.tab === targetTabId;
tab.classList.toggle('overlay-tab--active', isActive);
tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
});
panels.forEach((panel) => {
panel.classList.toggle('overlay-panel--hidden', panel.id !== 'tab-' + targetTabId);
});
}

tabs.forEach((tab) => {
tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// ── Open / close ───────────────────────────────────────────────
function openInformation(defaultTab = 'colors') {
lastFocused = document.activeElement;
switchTab(defaultTab);
overlay.classList.add('visible');
document.addEventListener('keydown', handleKeydown);
dialog.focus();
ColorWheelinit();
}

function closeInformation() {
overlay.classList.remove('visible');
document.removeEventListener('keydown', handleKeydown);
if (lastFocused && typeof lastFocused.focus === 'function') {
lastFocused.focus();
}
}

// ── Keyboard handling ──────────────────────────────────────────
function handleKeydown(e) {
if (e.key === 'Escape') { closeInformation(); return; }
if (e.key === 'Tab') { trapFocus(e); }
}

function trapFocus(e) {
const focusable = Array.from(dialog.querySelectorAll('button'));
if (focusable.length === 0) return;
const first = focusable[0];
const last = focusable[focusable.length - 1];
if (e.shiftKey && document.activeElement === first) {
e.preventDefault(); last.focus();
} else if (!e.shiftKey && document.activeElement === last) {
e.preventDefault(); first.focus();
}
}

// ── Wire up controls ───────────────────────────────────────────
helpBtn.addEventListener('click', () => openInformation('colors'));
closeBtn.addEventListener('click', closeInformation);
if (startBtn) startBtn.addEventListener('click', closeInformation);

overlay.addEventListener('click', (e) => {
if (e.target === overlay) closeInformation();
});

}

// ── Color Wheel ───────────────────────────────────────────
const chromatic = [
    {name:"Red",color:"#E53935"},
    {name:"Orange",color:"#F57C00"},
    {name:"Cream",color:"#F4E7B5"},
    {name:"Yellow",color:"#FDD835"},
    {name:"Green",color:"#43A047"},
    {name:"Teal",color:"#009688"},
    {name:"Blue",color:"#1E88E5"},
    {name:"Purple",color:"#7E57C2"},
    {name:"Magenta",color:"#D81B60"},
    {name:"Pink",color:"#EC407A"},
];

const achromatic = [
    {name:"White",color:"#fff",text:"#000"},
    {name:"Grey",color:"#9E9E9E"},
    {name:"Black",color:"#111"}
];

const neighbours = {
Red:["Orange","Pink"],
Orange:["Red","Cream"],
Cream:["Orange","Yellow"],
Yellow:["Cream","Green"],
Green:["Yellow","Teal"],
Teal:["Green","Blue"],
Blue:["Teal","Purple"],
Purple:["Blue","Magenta"],
Magenta:["Purple","Pink"],
Pink:["Magenta","Red"],

White:["Grey","Black"],
Grey:["White","Black"],
Black:["White","Grey"]
};

let locked=null;

function createWheel(){

const wheel=document.querySelector("#wheel");
const svg=wheel.querySelector("svg");

const size = wheel.clientWidth;
const cx = size / 2;
const cy = size / 2;
const r = size * 0.4; // 40% of container

const positions={};

chromatic.forEach((c,i)=>{

const angle=(-90+i*(360/chromatic.length))*Math.PI/180;

const x=cx+r*Math.cos(angle);
const y=cy+r*Math.sin(angle);

positions[c.name]={x,y};

const div=document.createElement("div");
div.className="node";
div.dataset.name=c.name;
div.style.background=c.color;
div.innerHTML = c.name;
  
const NODE_SIZE = 50;
const HALF = NODE_SIZE / 2;

div.style.left = `${x - HALF}px`;
div.style.top = `${y - HALF}px`;

if(c.name==="Cream")
    div.style.color="#333";

wheel.appendChild(div);

});

}

function createAchromatic(){

const wrap=document.querySelector("#achromatic");
const svg=wrap.querySelector("svg");

  
const size = wrap.clientWidth;
const cx = size / 2;
const cy = size / 2;
const r = size * 0.4; // 40% of container

achromatic.forEach((c,i) => {
const angle=(-90+i*(360/achromatic.length))*Math.PI/180;

const x=cx+r*Math.cos(angle);
const y=cy+r*Math.sin(angle);

const div=document.createElement("div");
div.className="node";
div.dataset.name=c.name;
div.style.background=c.color;
div.style.color=c.text||"#fff";
div.innerHTML = c.name;
const NODE_SIZE = 50;
const HALF = NODE_SIZE / 2;

div.style.left = `${x - HALF}px`;
div.style.top = `${y - HALF}px`;

wrap.appendChild(div);

});

}


function ColorWheelinit() {
    createWheel();
    createAchromatic();
}


// ── Branch Picker ───────────────────────────────────────────

function setupBranchPicker() {
  const overlay = document.getElementById('branch-overlay');
  const dialog = document.getElementById('branch-dialog');
  const closeButton = document.getElementById('branch-close');
  const startButton = document.getElementById('branch-start');
  const list = document.getElementById('branch-checkbox-list');
  const errorEl = document.getElementById('branch-error');

  if (!overlay || !dialog || !startButton || !list) return;

  let lastFocusedElement = null;
  let pendingConfirm = null;

  function branchCheckboxId(branch) {
    return 'branch-cb-' + branch.replace(/\s+/g, '-').toLowerCase();
  }

  function renderCheckboxes() {
    const branches = getAllBranches();
    const saved = loadSavedBranches();
    list.innerHTML = '';

    branches.forEach((branch) => {
      const id = branchCheckboxId(branch);
      const isChecked = saved ? saved.includes(branch) : true; // default: everything checked

      const label = document.createElement('label');
      label.className = 'branch-checkbox-item';
      label.htmlFor = id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = id;
      checkbox.value = branch;
      checkbox.checked = isChecked;

      const span = document.createElement('span');
      span.textContent = branch;

      label.appendChild(checkbox);
      label.appendChild(span);
      list.appendChild(label);
    });
  }

  function getCheckedBranches() {
    return Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
  }

  function openBranchPickerImpl(onConfirm) {
    pendingConfirm = onConfirm;
    if (errorEl) errorEl.textContent = '';
    renderCheckboxes();
    lastFocusedElement = document.activeElement;
    overlay.classList.add('visible');
    document.addEventListener('keydown', handleKeydown);
    dialog.focus();
  }

  function closeBranchPicker() {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', handleKeydown);
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function confirmSelection() {
    const checked = getCheckedBranches();
    if (checked.length === 0) {
      if (errorEl) errorEl.textContent = 'Pick at least one branch to continue.';
      return;
    }
    closeBranchPicker();
    const callback = pendingConfirm;
    pendingConfirm = null;
    if (callback) callback(checked);
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      // No cancel state here — Escape just confirms whatever's checked,
      // same as closing the dialog, so the game can always proceed.
      confirmSelection();
      return;
    }
    if (e.key === 'Tab') {
      trapFocus(e);
    }
  }

  function trapFocus(e) {
    const focusable = dialog.querySelectorAll('button, input[type="checkbox"]');
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

  startButton.addEventListener('click', confirmSelection);
  if (closeButton) {
    closeButton.addEventListener('click', confirmSelection);
  }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) confirmSelection();
  });

  // Exposed for game.js's chooseBranches() to call.
  window.openBranchPicker = openBranchPickerImpl;
}

function setupGiveUpConfirm() {
  const overlay = document.getElementById('giveup-overlay');
  const dialog = document.getElementById('giveup-dialog');
  const closeButton = document.getElementById('giveup-close');
  const cancelButton = document.getElementById('giveup-cancel');
  const confirmButton = document.getElementById('giveup-confirm');
  const triggerButton = document.getElementById('give-up-button');

  if (!overlay || !dialog || !triggerButton) return;

  let lastFocusedElement = null;

  function openConfirm() {
    lastFocusedElement = document.activeElement;
    overlay.classList.add('visible');
    document.addEventListener('keydown', handleKeydown);
    dialog.focus();
  }

  function closeConfirm() {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', handleKeydown);
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeConfirm();
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

  triggerButton.addEventListener('click', openConfirm);
  closeButton.addEventListener('click', closeConfirm);
  if (cancelButton) cancelButton.addEventListener('click', closeConfirm);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeConfirm();
  });

  confirmButton.addEventListener('click', () => {
    closeConfirm();
    if (typeof giveUpUnlimited === 'function') giveUpUnlimited();
  });
}

function setupAllStatsModal() {
  const overlay = document.getElementById('allstats-overlay');
  const dialog = document.getElementById('allstats-dialog');
  const closeButton = document.getElementById('allstats-close');
  const body = document.getElementById('allstats-body');

  if (!overlay || !dialog || !body) return;

  let lastFocusedElement = null;

function buildTable() {
  const rows = getAllUnlimitedStats();
  if (rows.length === 0) {
    return '<p class="allstats-empty">No unlimited rounds played yet.</p>';
  }
  const body = rows.map((r) => `
    <tr>
      <td>${escapeHtml(r.label)}</td>
      <td>${r.totalPlayed}</td>
      <td>${r.winRate}%</td>
      <td>${escapeHtml(String(r.averageGuessesOnWins))}</td>
      <td>${escapeHtml(String(r.averageGuessesAll))}</td>
    </tr>`).join('');
  return `
    <table class="allstats-table">
      <thead>
        <tr><th>Branches</th><th>Played</th><th>Win %</th><th>Avg (Wins)</th><th>Avg (All)</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

  function openModal() {
    body.innerHTML = buildTable();
    lastFocusedElement = document.activeElement;
    overlay.classList.add('visible');
    document.addEventListener('keydown', handleKeydown);
    dialog.focus();
  }

  function closeModal() {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', handleKeydown);
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') { trapFocus(e); }
  }

  function trapFocus(e) {
    const focusable = dialog.querySelectorAll('button');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  if (closeButton) closeButton.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Exposed for ui.js's "View all stats" button to call.
  window.openAllStatsModal = openModal;
}

function setupSettingsModal() {
  const overlay = document.getElementById('settings-overlay');
  const dialog = document.getElementById('settings-dialog');
  const closeButton = document.getElementById('settings-close');
  const applyButton = document.getElementById('settings-apply');
  const list = document.getElementById('settings-branch-list');
  const errorEl = document.getElementById('settings-branch-error');
  const triggerButton = document.getElementById('settings-button');

  if (!overlay || !dialog || !applyButton || !list) return;

  let lastFocusedElement = null;

  // ── Tab switching (same pattern as setupInformation) ──────────
  // Only "branches" exists today; add more <button class="overlay-tab">
  // + matching <div id="settings-tab-x"> panels in the HTML to extend,
  // e.g. a future "columns" tab for a column selector — no other
  // changes needed here.
  const tabs = dialog.querySelectorAll('.overlay-tab');
  const panels = dialog.querySelectorAll('.overlay-panel');

  function switchTab(targetTabId) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === targetTabId;
      tab.classList.toggle('overlay-tab--active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    panels.forEach((panel) => {
      panel.classList.toggle('overlay-panel--hidden', panel.id !== 'settings-tab-' + targetTabId);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // ── Branches panel ─────────────────────────────────────────────
  function branchCheckboxId(branch) {
    return 'settings-branch-cb-' + branch.replace(/\s+/g, '-').toLowerCase();
  }

  function renderBranchCheckboxes() {
    const branches = getAllBranches();
    const saved = loadSavedBranches();
    list.innerHTML = '';

    branches.forEach((branch) => {
      const id = branchCheckboxId(branch);
      const isChecked = saved ? saved.includes(branch) : true;

      const label = document.createElement('label');
      label.className = 'branch-checkbox-item';
      label.htmlFor = id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = id;
      checkbox.value = branch;
      checkbox.checked = isChecked;

      const span = document.createElement('span');
      span.textContent = branch;

      label.appendChild(checkbox);
      label.appendChild(span);
      list.appendChild(label);
    });
  }

  function getCheckedBranches() {
    return Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
  }

  // ── Open / close ────────────────────────────────────────────────
  function openSettings() {
    if (errorEl) errorEl.textContent = '';
    switchTab('branches');
    renderBranchCheckboxes();
    lastFocusedElement = document.activeElement;
    overlay.classList.add('visible');
    document.addEventListener('keydown', handleKeydown);
    dialog.focus();
  }

  function closeSettings() {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', handleKeydown);
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function applySettings() {
    const checkedBranches = getCheckedBranches();
    if (checkedBranches.length === 0) {
      if (errorEl) errorEl.textContent = 'Pick at least one branch to continue.';
      return;
    }
    closeSettings();
    // game.js listens for this to reset the unlimited round with the
    // new branch selection. Future panels (e.g. columns) can extend
    // this payload rather than needing a second callback.
    if (typeof window.onSettingsApplied === 'function') {
      window.onSettingsApplied({ branches: checkedBranches });
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') { closeSettings(); return; }
    if (e.key === 'Tab') { trapFocus(e); }
  }

  function trapFocus(e) {
    const focusable = dialog.querySelectorAll('button, input[type="checkbox"]');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  applyButton.addEventListener('click', applySettings);
  if (closeButton) closeButton.addEventListener('click', closeSettings);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettings();
  });
  if (triggerButton) triggerButton.addEventListener('click', openSettings);

  // Exposed in case something else needs to trigger it programmatically.
  window.openSettingsModal = openSettings;
}

setupInformation();
setupTutorial();
setupBranchPicker();
setupGiveUpConfirm();
setupAllStatsModal();
setupSettingsModal();