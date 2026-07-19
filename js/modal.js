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
console.log("setup overlay");
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
markoverlaySeen();
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

setupInformation();
setupTutorial();
