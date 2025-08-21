// Game state and utility functions for the Echo INTELNET terminal

export const CONNECT_DELAY_MS = 2200;      // time to "establish" a connection
export const INTRUSION_LIMIT_MS = 90000;   // session lifespan before forced disconnect (90s)
export const INTRUSION_TICK_MS = 1000;     // countdown update interval

// Map field IPs to nodes (populated per scenario)
export const IP_TO_NODE = {};
export function resetIpMap(){
  Object.keys(IP_TO_NODE).forEach(k => delete IP_TO_NODE[k]);
}

// Scenario data
export const GAME = {
  codes: {},
  found: {},
  currentHost: null,
  connected: false,
  sessionEndsAt: null,
  nodes: {},
  completeMessage: null,
  hints: {},
  hintIndex: {}
};

// --- Utilities --- //
export function rot13(s){
  return s.replace(/[a-zA-Z]/g, function(c){
    const base = (c <= 'Z') ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0)-base+13)%26+base);
  });
}

export function decodeBase64(s){
  try{ return atob(String(s).replace(/\s+/g,'')); }
  catch(e){ return null; }
}

export function fmtTime(ms){
  const sec = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(sec/60), s = sec%60;
  return (m<10?'0':'')+m+':' + (s<10?'0':'')+s;
}

export function timeRemaining(){
  return (GAME.connected && GAME.sessionEndsAt) ? (GAME.sessionEndsAt - Date.now()) : 0;
}

// Parse simple key=value scenario text files
export function parseScenarioText(txt){
  const obj = {};
  txt.split(/\r?\n/).forEach(function(line){
    line = line.trim();
    if(!line || line.charAt(0)==='#') return;
    const idx = line.indexOf('=');
    if(idx === -1) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    const parts = key.split('.');
    let ref = obj;
    for(let i=0;i<parts.length-1;i++){
      const p = parts[i];
      if(!ref[p]) ref[p] = {};
      ref = ref[p];
    }
    ref[parts[parts.length-1]] = val;
  });
  return obj;
}
