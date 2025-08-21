import {
  GAME,
  IP_TO_NODE,
  INTRUSION_LIMIT_MS,
  INTRUSION_TICK_MS,
  fmtTime,
  timeRemaining,
  resetIpMap
} from "./gameState.js";
import { createHandlers } from "./commandHandlers.js";
// ---- DOM ---- //
const screen = document.getElementById('screen');
const input  = document.getElementById('cmd');
const hostEl = document.getElementById('host');
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
const brief = document.getElementById('brief');
const objectiveEl = document.getElementById('objective');
const imgModal = document.getElementById('imgModal');
const imgModalImg = document.getElementById('imgModalImg');
const imgModalContent = document.getElementById('imgModalContent');
const imgModalClose = document.getElementById('imgModalClose');

imgModalClose.addEventListener('click', () => {
  imgModal.classList.add('hidden');
  imgModalImg.src = '';
});
function showImageModal(src){
  imgModalImg.src = src;
  imgModal.classList.remove('hidden');
}
(function(el){
  let sx, sy, ox, oy;
  el.addEventListener('mousedown', function(e){
    sx = e.clientX; sy = e.clientY;
    const r = el.getBoundingClientRect();
    ox = r.left; oy = r.top;
    function mv(ev){
      el.style.left = (ox + ev.clientX - sx) + 'px';
      el.style.top  = (oy + ev.clientY - sy) + 'px';
    }
    function up(){
      document.removeEventListener('mousemove', mv);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseup', up);
    e.preventDefault();
  });
})(imgModalContent);

// ---- Helpers ---- //
function write(txt, cls){
  const row = document.createElement('div');
  row.className = 'row ' + (cls || 'out');
  row.textContent = txt;
  screen.appendChild(row);
  screen.scrollTop = screen.scrollHeight;
}
function hr(){ write('────────────────────────────────────────────────', 'muted'); }
function setHost(){
  if(GAME.currentHost){
    const node = GAME.nodes[GAME.currentHost];
    hostEl.textContent = '/' + (node && node.visible ? GAME.currentHost : '?');
  } else {
    hostEl.textContent = '/';
  }
}
function updatePanel(){
  let totalFound = 0;
  Object.keys(GAME.nodes).forEach(function(k){
    const node = GAME.nodes[k];
    const grid = node.grid ? ' @ ' + node.grid : '';
    let txt = 'Unknown';
    if(GAME.found[k]){ txt = 'Code ' + GAME.codes[k] + ' found' + grid; totalFound++; }
    else if(GAME.currentHost === k){ txt = 'Connected' + grid; }
    if(node.stateEl) node.stateEl.textContent = txt;
  });
  const totalCodes = Object.keys(GAME.nodes).length;
  const timeLeft = timeRemaining();
  let t = totalFound + ' / ' + totalCodes + ' codes';
  if(GAME.connected && timeLeft > 0){
    t += ' · session ' + fmtTime(timeLeft) + ' remaining';
  }
  progressEl.textContent = t;
}
function victoryCheck(){
  const allFound = Object.keys(GAME.found).every(function(k){ return GAME.found[k]; });
  if(allFound){
    hr();
    write(GAME.completeMessage || 'MISSION COMPLETE ✅', 'success');
    Object.keys(GAME.codes).forEach(function(k){
      const grid = (GAME.nodes[k] && GAME.nodes[k].grid) ? ' @ ' + GAME.nodes[k].grid : '';
      const label = (GAME.nodes[k] && GAME.nodes[k].displayName) ? GAME.nodes[k].displayName : k.toUpperCase();
      write(label + ': ' + GAME.codes[k] + grid, 'success');
    });
    hr();
  }
}
function fileLookup(path){
  if(!GAME.connected || !GAME.currentHost) return null;
  const files = GAME.nodes[GAME.currentHost].files || {};
  return Object.prototype.hasOwnProperty.call(files, path) ? files[path] : null;
}
function listFiles(){
  if(!GAME.connected){ write('Not connected. Use: connect <ip or name>', 'warn'); return; }
  const files = GAME.nodes[GAME.currentHost].files;
  const keys = Object.keys(files);
  if(!keys.length){ write('(no files)'); return; }
  const tree = {};
  keys.forEach(function(p){
    const m = p.split(/\/(.+)/);
    const dir = m[0], file = m[1] || '';
    if(!tree[dir]) tree[dir] = [];
    tree[dir].push(file);
  });
  Object.keys(tree).forEach(function(dir){
    write(dir + '/', 'muted');
    tree[dir].forEach(function(f){ write('  ' + f); });
  });
}
function clearScreen(){ screen.innerHTML = ''; }

// ---- Session management ---- //
let timerId = null;
function startTimer(){
  stopTimer();
  timerId = setInterval(function(){
    const left = timeRemaining();
    if(left <= 0){
      stopTimer();
      forcedDisconnect('Intrusion detected. Link dropped.');
    } else {
      updatePanel();
    }
  }, INTRUSION_TICK_MS);
}
function stopTimer(){
  if(timerId){ clearInterval(timerId); timerId = null; }
}
function forcedDisconnect(reason){
  GAME.connected = false;
  write(reason || 'Disconnected.', 'err');
  GAME.currentHost = null;
  setHost(); updatePanel();
}
function disconnectUser(){
  if(!GAME.connected){ write('No active session.', 'warn'); return; }
  stopTimer();
  GAME.connected = false;
  write('Session terminated by user.', 'warn');
  GAME.currentHost = null;
  setHost(); updatePanel();
}
function resetGameState(msg){
  stopTimer();
  Object.keys(GAME.found).forEach(function(k){ GAME.found[k] = false; });
  GAME.hintIndex = {};
  GAME.currentHost = null;
  GAME.connected = false;
  GAME.sessionEndsAt = null;
  setHost(); updatePanel();
  imgModal.classList.add('hidden');
  imgModalImg.src = '';
  if(msg) write(msg, 'warn');
}
function loadScenario(data){
  resetGameState();
  resetIpMap();
  GAME.codes = data.codes || {};
  GAME.nodes = data.nodes || {};
  GAME.completeMessage = data.completeMessage || null;
  GAME.hints = data.hints || {};
  GAME.hintIndex = {};
  if(!Array.isArray(GAME.hints.global)) GAME.hints.global = [];
  GAME.found = {};
  objectiveEl.textContent = data.objective || '';
  Array.from(statusEl.querySelectorAll('.node-item')).forEach(function(el){ el.remove(); });
  const progressDt = document.getElementById('progress').previousElementSibling;
  const keys = Object.keys(GAME.nodes);
  keys.forEach(function(k, idx){
    GAME.found[k] = false;
    const node = GAME.nodes[k];
    if(node.ip) IP_TO_NODE[node.ip] = k;
    node.visible = node.visible === true;
    node.displayName = node.visible ? (node.name || k) : 'Node ' + (idx+1);
    const dt = document.createElement('dt');
    dt.className = 'node-item';
    dt.textContent = node.displayName;
    const dd = document.createElement('dd');
    dd.className = 'node-item';
    dd.textContent = 'Unknown';
    node.stateEl = dd;
    statusEl.insertBefore(dt, progressDt);
    statusEl.insertBefore(dd, progressDt);
  });
  write('Loaded scenario: ' + (data.title || data.id), 'success');
  updatePanel();
}
function stagedConnect(targetNode){
  write('Probing…', 'muted');
  setTimeout(function(){
    write('Handshake…', 'muted');
    setTimeout(function(){
      write('Elevating…', 'muted');
      setTimeout(function(){
        GAME.connected = true;
        GAME.currentHost = targetNode;
        GAME.sessionEndsAt = Date.now() + INTRUSION_LIMIT_MS;
        setHost(); updatePanel(); startTimer();
        write('→ ' + GAME.nodes[targetNode].banner, 'muted');
        if(brief && !brief.dataset.hint){
          brief.dataset.hint = '1';
          brief.textContent = 'Maintain a low profile. Extract what you need before the session expires.';
        }
      }, 400);
    }, 700);
  }, 700);
}

// ---- Command handlers ---- //
const handlers = createHandlers({
  write,
  listFiles,
  fileLookup,
  showImageModal,
  updatePanel,
  victoryCheck,
  stagedConnect,
  disconnectUser,
  resetGameState,
  loadScenario,
  clearScreen
});

// ---- Input routing ---- //
function route(line){
  const parts = String(line).trim().split(/\s+/);
  const cmd = (parts.shift() || '').toLowerCase();
  if(!cmd) return;
  if(handlers[cmd]){ handlers[cmd].apply(null, parts); }
  else { write("Unknown command: " + cmd + " (try 'help')", 'err'); }
}

// ---- Wire up ---- //
input.addEventListener('keydown', function(e){
  if(e.key === 'Enter'){
    const val = input.value;
    write('$ ' + val, 'muted');
    route(val);
    input.value = '';
  }
});
document.querySelectorAll('[data-run]').forEach(function(b){
  b.addEventListener('click', function(){
    const c = b.getAttribute('data-run');
    write('$ ' + c, 'muted'); route(c);
  });
});
document.getElementById('btnHelp').addEventListener('click', function(){ route('help'); });
document.getElementById('btnReset').addEventListener('click', function(){ route('reset'); });

// ---- Boot banner ---- //
write('ECHO-INTELNET v1.2 · Training build', 'muted');
write('No scenario loaded. Use run <file> to load a scenario from /scenarios', 'muted');
hr(); setHost(); updatePanel();
