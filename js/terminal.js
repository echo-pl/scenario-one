/* Echo Platoon INTELNET – CodePen build (AU English)
   Adds: IP-driven connect flow, staged handshake, intrusion timer & auto-disconnect.
*/
(function(){
  // —— Tunables —— //
  var CONNECT_DELAY_MS = 2200;      // time to "establish" a connection
  var INTRUSION_LIMIT_MS = 90000;   // session lifespan before forced disconnect (90s)
  var INTRUSION_TICK_MS = 1000;     // countdown update interval

  // Map field IPs to nodes (print these on your physical intel props)
  var IP_TO_NODE = {
    "10.2.3.112": "alpha",
    "10.4.1.77":  "bravo"
  };

  // —— Scenario data —— //
  var GAME = {
    codes: {},
    found: {},
    currentHost: null,
    connected: false,
    sessionEndsAt: null,
    nodes: {},
    hints: {},
    hintIndex: {}
  };

  // —— DOM —— //
  var screen = document.getElementById('screen');
  var input  = document.getElementById('cmd');
  var hostEl = document.getElementById('host');
  var alphaState = document.getElementById('alphaState');
  var bravoState = document.getElementById('bravoState');
  var progressEl = document.getElementById('progress');
  var brief = document.getElementById('brief');
  var objectiveEl = document.getElementById('objective');

  // —— Helpers —— //
  function write(txt, cls){
    var row = document.createElement('div');
    row.className = 'row ' + (cls || 'out');
    row.textContent = txt;
    screen.appendChild(row);
    screen.scrollTop = screen.scrollHeight;
  }
  function hr(){ write('────────────────────────────────────────────────', 'muted'); }
  function setHost(){ hostEl.textContent = '/' + (GAME.currentHost || ''); }
  function updatePanel(){
    alphaState.textContent = GAME.found.alpha ? ('Code ' + GAME.codes.alpha + ' found') : (GAME.currentHost==='alpha'?'Connected':'Unknown');
    bravoState.textContent = GAME.found.bravo ? ('Code ' + GAME.codes.bravo + ' found') : (GAME.currentHost==='bravo'?'Connected':'Unknown');
    var total = (GAME.found.alpha?1:0) + (GAME.found.bravo?1:0);
    var timeLeft = timeRemaining();
    var t = total + ' / 2 codes';
    if(GAME.connected && timeLeft > 0){
      t += ' · session ' + fmtTime(timeLeft) + ' remaining';
    }
    progressEl.textContent = t;
  }
  function victoryCheck(){
    if(GAME.found.alpha && GAME.found.bravo){
      hr();
      write('MISSION COMPLETE ✅', 'success');
      write('Take these to the lock box:  ' + GAME.codes.alpha + '  +  ' + GAME.codes.bravo, 'success');
      hr();
    }
  }
  function fileLookup(path){
    if(!GAME.connected || !GAME.currentHost) return null;
    var files = GAME.nodes[GAME.currentHost].files || {};
    return files.hasOwnProperty(path) ? files[path] : null;
  }
  function listFiles(){
    if(!GAME.connected){ write('Not connected. Use: connect <ip|alpha|bravo>', 'warn'); return; }
    var files = GAME.nodes[GAME.currentHost].files;
    var keys = Object.keys(files);
    if(!keys.length){ write('(no files)'); return; }
    var tree = {};
    keys.forEach(function(p){
      var m = p.split(/\/(.+)/);
      var dir = m[0], file = m[1] || '';
      if(!tree[dir]) tree[dir] = [];
      tree[dir].push(file);
    });
    Object.keys(tree).forEach(function(dir){
      write(dir + '/', 'muted');
      tree[dir].forEach(function(f){ write('  ' + f); });
    });
  }
  function rot13(s){
    return s.replace(/[a-zA-Z]/g, function(c){
      var base = (c <= 'Z') ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0)-base+13)%26+base);
    });
  }
  function decodeBase64(s){
    try{ return atob(String(s).replace(/\s+/g,'')); }
    catch(e){ return null; }
  }
  function fmtTime(ms){
    var sec = Math.max(0, Math.floor(ms/1000));
    var m = Math.floor(sec/60), s = sec%60;
    return (m<10?'0':'')+m+':' + (s<10?'0':'')+s;
  }
  function timeRemaining(){
    return (GAME.connected && GAME.sessionEndsAt) ? (GAME.sessionEndsAt - Date.now()) : 0;
  }

  function resetGameState(msg){
    stopTimer();
    Object.keys(GAME.found).forEach(function(k){ GAME.found[k] = false; });
    GAME.currentHost = null;
    GAME.connected = false;
    GAME.sessionEndsAt = null;
    GAME.hintIndex = {};
    setHost(); updatePanel();
    if(msg) write(msg, 'warn');
  }

  function loadScenario(data){
    resetGameState();
    GAME.codes = data.codes || {};
    GAME.nodes = data.nodes || {};
    GAME.hints = data.hints || {};
    GAME.hintIndex = {};
    GAME.found = {};
    Object.keys(GAME.codes).forEach(function(k){ GAME.found[k] = false; });
    objectiveEl.textContent = data.objective || '';
    write('Loaded scenario: ' + (data.title || data.id), 'success');
    updatePanel();
  }

  // —— Session management —— //
  var timerId = null;
  function startTimer(){
    stopTimer();
    timerId = setInterval(function(){
      var left = timeRemaining();
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
  function stagedConnect(targetNode){
    // Visual “probing → handshake → elevating → connected”
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
          // Subtle note in the brief after first connect
          if(brief && !brief.dataset.hint){
            brief.dataset.hint = '1';
            brief.textContent = 'Maintain a low profile. Extract what you need before the session expires.';
          }
        }, 400);
      }, 700);
    }, 700);
  }

  // —— Commands —— //
  var handlers = {
    help: function(){
      write('Available commands:', 'muted');
      write('  help                    Show this help');
      write('  scan                    Passive sweep (may not reveal hidden hosts)');
      write('  connect <ip|alpha|bravo>  Attempt link to target');
      write('  disconnect              Terminate current session');
      write('  ls                      List files on current node');
      write('  cat <path>              Print a file');
      write('  decode base64 <x>       Decode Base64 of <file|text>');
      write('  decode rot13  <x>       Decode ROT13 of <file|text>');
      write('  status                  Show progress and session time');
      write('  submit 1234             Submit a discovered code');
      write('  hint                    Show a hint (if available)');
      write('  clear                   Clear the screen');
      write('  reset                   Reset the exercise');
      write('  run <file>              Load a scenario JSON');
    },
    clear: function(){ screen.innerHTML = ''; },
    scan: function(){
      write('Running passive scan…', 'muted');
      setTimeout(function(){
        write('No broadcast beacons detected. Field reconnaissance may be required.', 'warn');
        write('Tip: look for a target address in recovered notes.', 'muted');
      }, 300);
    },
    connect: function(arg){
      if(!arg){ write('Usage: connect <ip|alpha|bravo>', 'warn'); return; }
      if(GAME.connected){ write('A session is already active. Use `disconnect` first.', 'warn'); return; }

      var node = null;
      // Accept direct node names
      if(GAME.nodes[arg]) node = arg;

      // Accept IPs — only mapped IPs will work; others simulate failure
      if(!node && /^\d{1,3}(\.\d{1,3}){3}$/.test(arg)){
        node = IP_TO_NODE[arg] || null;
        if(!node){
          write('Attempting connection to ' + arg + ' …', 'muted');
          setTimeout(function(){ write('No response, target filtered or offline.', 'err'); }, 1100);
          return;
        }
      }

      if(!node){
        write('Unknown target. Use a valid field address or known host (alpha|bravo).', 'warn');
        return;
      }

      write('Connecting to ' + (IP_TO_NODE[arg] ? arg + ' ('+node+')' : node) + ' …', 'muted');
      setTimeout(function(){ stagedConnect(node); }, CONNECT_DELAY_MS);
    },
    disconnect: function(){ disconnectUser(); },
    ls: function(){ listFiles(); },
    cat: function(path){
      if(!GAME.connected){ write('Not connected.', 'warn'); return; }
      if(!path){ write('Usage: cat <path>', 'warn'); return; }
      var val = fileLookup(path);
      if(val == null){ write('No such file here.', 'err'); return; }
      write('----- ' + path + ' -----', 'muted');
      write(val);
      write('----- end -----', 'muted');
    },
    decode: function(kind){
      var rest = Array.prototype.slice.call(arguments,1).join(' ');
      if(!kind || !rest){ write('Usage: decode base64|rot13 <file|text>', 'warn'); return; }
      var source = fileLookup(rest);
      if(source == null) source = rest;
      var out = null, label = '';
      if(kind.toLowerCase()==='base64'){ out = decodeBase64(source); label='Base64'; }
      else if(kind.toLowerCase()==='rot13'){ out = rot13(source); label='ROT13'; }
      else { write('Unknown decoder. Use base64 or rot13', 'warn'); return; }
      if(out==null){ write(label + ' decode failed.', 'err'); return; }
      write('[decoded ' + label + ']', 'muted');
      write(out, 'success');

      // Auto-detect "CODE: 1234" (or PBQR: 1234)
      var m = out.match(/CODE:\s*(\d{4})/i) || out.match(/PBQR:\s*(\d{4})/i);
      if(m){ handlers.submit(m[1]); }
    },
    status: function(){
      updatePanel();
      var a = (GAME.found.alpha?'complete':'pending');
      var b = (GAME.found.bravo?'complete':'pending');
      var left = timeRemaining();
      if(GAME.connected){
        write('Status: connected / ' + (GAME.currentHost || '?') + ' · time left ' + fmtTime(left));
      } else {
        write('Status: idle (no active session).');
      }
      write('Alpha: ' + a + ' | Bravo: ' + b);
    },
    submit: function(num){
      num = String(num || '');
      if(!/^\d{4}$/.test(num)){ write('Submit requires a 4‑digit number.', 'warn'); return; }
      var hit = false;
      if(num===GAME.codes.alpha){ if(!GAME.found.alpha){ write('Alpha code accepted.', 'success'); } GAME.found.alpha = true; hit=true; }
      if(num===GAME.codes.bravo){ if(!GAME.found.bravo){ write('Bravo code accepted.', 'success'); } GAME.found.bravo = true; hit=true; }
      if(!hit){ write('Code rejected.', 'err'); }
      updatePanel(); victoryCheck();
    },
    hint: function(){
      var ctx = GAME.currentHost || 'global';
      var list = GAME.hints[ctx] || GAME.hints.global || [];
      if(!list.length){ write('No hints available.', 'warn'); return; }
      var idx = GAME.hintIndex[ctx] || 0;
      if(idx >= list.length){ write('No more hints.', 'warn'); return; }
      write('Hint: ' + list[idx], 'muted');
      GAME.hintIndex[ctx] = idx + 1;
    },
    reset: function(){
      resetGameState('Exercise state reset.');
    },
    run: function(file){
      if(!file){ write('Usage: run <scenario.json>', 'warn'); return; }
      fetch('scenarios/' + file)
        .then(function(res){ if(!res.ok) throw new Error(); return res.json(); })
        .then(function(data){ loadScenario(data); })
        .catch(function(){ write('Scenario load failed.', 'err'); });
    }
  };

  // —— Input routing —— //
  function route(line){
    var parts = String(line).trim().split(/\s+/);
    var cmd = (parts.shift() || '').toLowerCase();
    if(!cmd) return;
    if(handlers[cmd]){ handlers[cmd].apply(null, parts); }
    else { write("Unknown command: " + cmd + " (try 'help')", 'err'); }
  }

  // —— Wire up —— //
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      var val = input.value;
      write('$ ' + val, 'muted');
      route(val);
      input.value = '';
    }
  });
  document.querySelectorAll('[data-run]').forEach(function(b){
    b.addEventListener('click', function(){
      var c = b.getAttribute('data-run');
      write('$ ' + c, 'muted'); route(c);
    });
  });
  document.getElementById('btnHelp').addEventListener('click', function(){ route('help'); });
  document.getElementById('btnReset').addEventListener('click', function(){ route('reset'); });

  // —— Boot banner —— //
  write('ECHO-INTELNET v1.2 · Training build', 'muted');
  write('No scenario loaded. Staff: run <file> (e.g., run scenario-one.json)', 'muted');
  hr(); setHost(); updatePanel();
})();
