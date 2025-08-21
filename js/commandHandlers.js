// Command handlers for the Echo INTELNET terminal
import {
  GAME,
  IP_TO_NODE,
  CONNECT_DELAY_MS,
  decodeBase64,
  rot13,
  fmtTime,
  timeRemaining,
  parseScenarioText
} from './gameState.js';

export function createHandlers(deps){
  const {
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
  } = deps;

  const handlers = {
    help(){
      write('Available commands:', 'muted');
      write('  help                    Show this help');
      write('  scan                    Passive sweep (may not reveal hidden hosts)');
      write('  hint                    Show a hint');
      write('  connect <ip|name>  Attempt link to target');
      write('  disconnect              Terminate current session');
      write('  ls                      List files on current node');
      write('  cat <path>              Print a file');
      write('  decode base64 <x>       Decode Base64 of <file|text>');
      write('  decode rot13  <x>       Decode ROT13 of <file|text>');
      write('  status                  Show progress and session time');
      write('  submit 1234             Submit a discovered code');
      write('  clear                   Clear the screen');
      write('  reset                   Reset the exercise');
      write('  run <file>              Load a scenario file');
      write('  load <file>             Alias for run');
    },
    clear(){ clearScreen(); },
    scan(){
      write('Running passive scan…', 'muted');
      setTimeout(function(){
        write('No broadcast beacons detected. Field reconnaissance may be required.', 'warn');
        write('Tip: look for a target address in recovered notes.', 'muted');
      }, 300);
    },
    hint(){
      const hints = GAME.hints || {};
      const idxMap = GAME.hintIndex || {};
      let key = 'global';
      if(GAME.connected && GAME.currentHost && Array.isArray(hints[GAME.currentHost])){
        key = GAME.currentHost;
      }
      const list = hints[key] || [];
      const idx = idxMap[key] || 0;
      if(idx < list.length){
        write('Hint: ' + list[idx], 'muted');
        idxMap[key] = idx + 1;
      } else {
        write('No more hints available.', 'warn');
      }
    },
    connect(arg){
      if(!arg){ write('Usage: connect <ip or name>', 'warn'); return; }
      if(GAME.connected){ write('A session is already active. Use `disconnect` first.', 'warn'); return; }

      let node = null;
      if(GAME.nodes[arg]) node = arg;

      if(!node && /^\d{1,3}(\.\d{1,3}){3}$/.test(arg)){
        node = IP_TO_NODE[arg] || null;
        if(!node){
          write('Attempting connection to ' + arg + ' …', 'muted');
          setTimeout(function(){ write('No response, target filtered or offline.', 'err'); }, 1100);
          return;
        }
      }

      if(!node){
        write('Unknown target. Use a valid field address or visible host name.', 'warn');
        return;
      }

      let display = node;
      if(IP_TO_NODE[arg]){
        display = arg;
        if(GAME.nodes[node] && GAME.nodes[node].visible){ display += ' (' + node + ')'; }
      }
      write('Connecting to ' + display + ' …', 'muted');
      setTimeout(function(){ stagedConnect(node); }, CONNECT_DELAY_MS);
    },
    disconnect(){ disconnectUser(); },
    ls(){ listFiles(); },
    cat(path){
      if(!GAME.connected){ write('Not connected.', 'warn'); return; }
      if(!path){ write('Usage: cat <path>', 'warn'); return; }
      const val = fileLookup(path);
      if(val == null){ write('No such file here.', 'err'); return; }
      if(typeof val === 'object' && val.image){
        showImageModal(val.image);
        if(val.caption) write(val.caption, 'muted');
      } else {
        write('----- ' + path + ' -----', 'muted');
        write(val);
        write('----- end -----', 'muted');
      }
    },
    decode(kind, ...restArgs){
      const rest = restArgs.join(' ');
      if(!kind || !rest){ write('Usage: decode base64|rot13 <file|text>', 'warn'); return; }
      let source = fileLookup(rest);
      if(source == null) source = rest;
      let out = null, label = '';
      if(kind.toLowerCase()==='base64'){ out = decodeBase64(source); label='Base64'; }
      else if(kind.toLowerCase()==='rot13'){ out = rot13(source); label='ROT13'; }
      else { write('Unknown decoder. Use base64 or rot13', 'warn'); return; }
      if(out==null){ write(label + ' decode failed.', 'err'); return; }
      write('[decoded ' + label + ']', 'muted');
      write(out, 'success');
      const m = out.match(/CODE:\s*(\d{4})/i) || out.match(/PBQR:\s*(\d{4})/i);
      if(m){ handlers.submit(m[1]); }
    },
    status(){
      updatePanel();
      const left = timeRemaining();
      if(GAME.connected){
        write('Status: connected / ' + (GAME.currentHost || '?') + ' · time left ' + fmtTime(left));
      } else {
        write('Status: idle (no active session).');
      }
      Object.keys(GAME.nodes).forEach(function(k){
        const label = GAME.nodes[k].displayName || k;
        const st = GAME.found[k] ? 'complete' : 'pending';
        write(label + ': ' + st);
      });
    },
    submit(num){
      num = String(num || '');
      if(!/^\d{4}$/.test(num)){ write('Submit requires a 4‑digit number.', 'warn'); return; }
      let hit = false;
      Object.keys(GAME.codes).forEach(function(k){
        if(num===GAME.codes[k]){
          if(!GAME.found[k]){ write((GAME.nodes[k].displayName || k) + ' code accepted.', 'success'); }
          GAME.found[k] = true;
          hit = true;
        }
      });
      if(!hit){ write('Code rejected.', 'err'); }
      updatePanel(); victoryCheck();
    },
    reset(){
      resetGameState('Exercise state reset.');
    },
    run(file){
      if(!file){ write('Usage: run <scenario file>', 'warn'); return; }
      fetch('scenarios/' + file)
        .then(function(res){
          if(!res.ok) throw new Error();
          return file.toLowerCase().endsWith('.json') ? res.json() : res.text();
        })
        .then(function(data){
          if(typeof data === 'string'){ data = parseScenarioText(data); }
          loadScenario(data);
        })
        .catch(function(){ write('Scenario load failed.', 'err'); });
    },
    load(file){ handlers.run(file); }
  };

  return handlers;
}
