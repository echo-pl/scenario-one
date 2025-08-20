(async () => {
  const params = new URLSearchParams(location.search);
  const scenarioFile = params.get('scenario') || 'example-basic.json';
  let data;
  try {
    data = await fetch(`scenarios/${scenarioFile}`).then(r => r.json());
  } catch (e) {
    document.body.innerHTML = '<p>Failed to load scenario.</p>';
    throw e;
  }

  document.title = data.title || 'Echo Platoon Intelligence Network';
  const totalCodes = Object.keys(data.codes || {}).length;
  const GAME = {
    codes: data.codes,
    found: Object.fromEntries(Object.keys(data.codes || {}).map(k => [k, false])),
    currentHost: null,
    nodes: data.nodes || {},
    hints: data.hints || {}
  };

  // DOM helpers
  const screen = document.getElementById('screen');
  const input = document.getElementById('cmd');
  const mapbox = document.getElementById('mapbox');
  const mapfile = document.getElementById('mapfile');
  document.getElementById('objective').textContent = data.objective || '';
  document.getElementById('progress').textContent = `0 / ${totalCodes} codes`;

  const S = {
    write(txt, cls = 'out') {
      const row = document.createElement('div');
      row.className = 'row ' + cls;
      row.textContent = txt;
      screen.appendChild(row);
      screen.scrollTop = screen.scrollHeight;
    },
    prompt() {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span class="prompt">echo@ops</span><span class="host">/${GAME.currentHost || ''}</span><span> $</span>`;
      screen.appendChild(row);
      screen.scrollTop = screen.scrollHeight;
    },
    hr() { S.write('────────────────────────────────────────────────', 'muted'); }
  };

  // Utilities
  const rot13 = s => s.replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
  });

  const decodeBase64 = s => {
    try {
      return atob(s.replace(/\s+/g, ''));
    } catch (e) { return null; }
  };

  const fileLookup = path => {
    if (!GAME.currentHost) return null;
    const files = GAME.nodes[GAME.currentHost].files;
    return files[path] ?? null;
  };

  const listFiles = () => {
    if (!GAME.currentHost) { S.write('Not connected. Use: connect alpha|bravo', 'warn'); return; }
    const entries = Object.keys(GAME.nodes[GAME.currentHost].files);
    if (!entries.length) { S.write('(no files)'); return; }
    const tree = {};
    entries.forEach(p => {
      const [dir, file] = p.split(/\/(.+)/);
      (tree[dir] ??= new Set()).add(file);
    });
    Object.entries(tree).forEach(([dir, set]) => {
      S.write(dir + '/', 'muted');
      [...set].forEach(f => S.write('  ' + f));
    });
  };

  const updatePanel = () => {
    if ('alpha' in GAME.codes) {
      document.getElementById('alphaState').textContent = GAME.found.alpha
        ? `Code ${GAME.codes.alpha} found`
        : (GAME.currentHost === 'alpha' ? 'Connected' : 'Unknown');
    }
    if ('bravo' in GAME.codes) {
      document.getElementById('bravoState').textContent = GAME.found.bravo
        ? `Code ${GAME.codes.bravo} found`
        : (GAME.currentHost === 'bravo' ? 'Connected' : 'Unknown');
    }
    const total = Object.values(GAME.found).filter(Boolean).length;
    document.getElementById('progress').textContent = `${total} / ${totalCodes} codes`;
  };

  const victoryCheck = () => {
    if (Object.values(GAME.found).every(Boolean)) {
      S.hr();
      S.write('MISSION COMPLETE ✅', 'success');
      const codesStr = Object.values(GAME.codes).join('  +  ');
      S.write(`Take these to the lock box:  ${codesStr}`, 'success');
      S.hr();
    }
  };

  const handlers = {
    help() {
      S.write('Available commands:', 'muted');
      S.write('  help                    Show this help');
      S.write('  scan                    Recon for Raven nodes');
      S.write('  connect alpha|bravo     Open a session');
      S.write('  ls                      List files on current node');
      S.write('  cat <path>              Print a file');
      S.write('  decode base64 <x>       Decode Base64 of <file|text>');
      S.write('  decode rot13  <x>       Decode ROT13 of <file|text>');
      S.write('  status                  Show progress');
      S.write('  submit 1234             Submit a discovered code');
      S.write('  map                     Toggle map panel highlight');
      S.write('  hint                    Contextual hint');
      S.write('  clear                   Clear the screen');
      S.write('  reset                   Reset the exercise');
    },
    clear() { screen.innerHTML = ''; },
    scan() {
      S.write('Running passive scan…', 'muted');
      setTimeout(() => {
        Object.entries(GAME.nodes).forEach(([id, node]) => {
          S.write(`• Found host: ${id}  (${node.name})`);
        });
        S.write('Hint: try `connect alpha`', 'muted');
      }, 300);
    },
    connect(arg) {
      if (!arg || !GAME.nodes[arg]) { S.write('Usage: connect alpha|bravo', 'warn'); return; }
      GAME.currentHost = arg;
      S.write('→ ' + GAME.nodes[arg].banner, 'host');
      updatePanel();
    },
    ls() { listFiles(); },
    cat(path) {
      if (!path) { S.write('Usage: cat <path>', 'warn'); return; }
      const val = fileLookup(path);
      if (val == null) { S.write('No such file here.', 'err'); return; }
      S.write('----- ' + path + ' -----', 'muted');
      S.write(val);
      S.write('----- end -----', 'muted');
    },
    decode(kind, rest) {
      if (!kind || !rest) { S.write('Usage: decode base64|rot13 <file|text>', 'warn'); return; }
      let source = fileLookup(rest);
      if (source == null) source = rest;
      let out = null, label = '';
      if (kind.toLowerCase() === 'base64') {
        out = decodeBase64(source);
        label = 'Base64';
      } else if (kind.toLowerCase() === 'rot13') {
        out = rot13(source);
        label = 'ROT13';
      } else {
        S.write('Unknown decoder. Use base64 or rot13', 'warn'); return;
      }
      if (out == null) { S.write(label + ' decode failed.', 'err'); return; }
      S.write(`[decoded ${label}]`);
      S.write(out, 'success');
      const m = out.match(/CODE:\s*(\d{4})/i) || out.match(/PBQR:\s*(\d{4})/i);
      if (m) { handlers.submit(m[1]); }
    },
    status() {
      updatePanel();
      const flags = Object.entries(GAME.found).map(([k, v]) => `${k}: ${v ? 'complete' : 'pending'}`);
      S.write(flags.join(' | '));
    },
    submit(num) {
      if (!/^\d{4}$/.test(String(num || ''))) { S.write('Submit requires a 4‑digit number.', 'warn'); return; }
      const s = String(num);
      let flagged = false;
      for (const [key, val] of Object.entries(GAME.codes)) {
        if (s === val) { GAME.found[key] = true; flagged = true; S.write(`${key.charAt(0).toUpperCase() + key.slice(1)} code accepted.`, 'success'); }
      }
      if (!flagged) { S.write('Code rejected.', 'err'); }
      updatePanel(); victoryCheck();
    },
    map() {
      mapbox.style.outline = mapbox.style.outline ? '' : '2px solid var(--accent)';
      if (mapbox.querySelector('img')) { S.write('Map visible in side panel.'); }
      else { S.write('Upload an area map in the side panel (optional).'); }
    },
    hint() {
      if (!GAME.currentHost) {
        const h = GAME.hints.global?.[0] || 'Try `scan` then `connect alpha`.';
        S.write(h, 'muted'); return;
      }
      if (!GAME.found[GAME.currentHost] && GAME.hints[GAME.currentHost]?.length) {
        S.write(GAME.hints[GAME.currentHost][0], 'muted');
      } else {
        const h = GAME.hints.complete?.[0] || 'When you’ve found both codes, `status` then take them to the box.';
        S.write(h, 'muted');
      }
    },
    reset() {
      GAME.found = Object.fromEntries(Object.keys(GAME.codes).map(k => [k, false]));
      GAME.currentHost = null;
      updatePanel();
      S.write('Exercise state reset.', 'warn');
    }
  };

  const route = line => {
    const parts = line.trim().split(/\s+/);
    const cmd = (parts.shift() || '').toLowerCase();
    if (!cmd) { return; }
    if (handlers[cmd]) {
      handlers[cmd](...parts);
    } else {
      S.write(`Unknown command: ${cmd} (try 'help')`, 'err');
    }
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = input.value;
      S.write(`$ ${val}`, 'muted');
      route(val);
      input.value = '';
    }
  });

  document.querySelectorAll('[data-run]').forEach(btn => {
    btn.addEventListener('click', () => { const c = btn.getAttribute('data-run'); S.write(`$ ${c}`, 'muted'); route(c); });
  });

  const setMap = file => {
    const url = URL.createObjectURL(file);
    mapbox.innerHTML = `<img alt="Area map" src="${url}">`;
    S.write('Map loaded into side panel.');
  };
  mapfile.addEventListener('change', e => {
    const f = e.target.files?.[0]; if (f) setMap(f);
  });
  ['dragover', 'drop'].forEach(ev => {
    mapbox.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop') { const f = e.dataTransfer.files?.[0]; if (f) setMap(f); } });
  });

  S.write('ECHO-INTELNET v1.0 · Training build', 'muted');
  S.write(`${data.title}: ${data.objective}`);
  S.hr();
  updatePanel();
})();
