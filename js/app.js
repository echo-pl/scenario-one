export class Engine {
  constructor(logEl, inputEl) {
    this.logEl = logEl;
    this.inputEl = inputEl;
    this.commands = new Map();
    this.nodes = {};
    this.currentNode = null;
    this.codes = {};
    this.found = new Set();
    this.hints = {};
    this.hintContext = 'global';

    this.inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const line = this.inputEl.value.trim();
        this.log('> ' + line);
        this.inputEl.value = '';
        this.handle(line);
      }
    });

    this.registerBuiltins();
  }

  log(text, cls = '') {
    const div = document.createElement('div');
    div.textContent = text;
    if (cls) div.className = cls;
    this.logEl.appendChild(div);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  clear() { this.logEl.innerHTML = ''; }

  registerNode(id, node) { this.nodes[id] = node; }
  setCodes(codes) { this.codes = codes || {}; }
  setHints(hints) { this.hints = hints || {}; }
  setHintContext(ctx) { this.hintContext = ctx || 'global'; }
  onCommand(name, fn) { this.commands.set(name, fn); }
  success() { this.log('Mission accomplished. Well done, Cadet.'); }

  reset() {
    this.currentNode = null;
    this.found.clear();
    this.clear();
    this.setHintContext('global');
    this.log('System reset.');
  }

  registerBuiltins() {
    this.onCommand('help', () => {
      this.log('Commands: ' + Array.from(this.commands.keys()).join(', '));
      const hints = [
        ...(this.hints.global || []),
        ...(this.hints[this.hintContext] || [])
      ];
      hints.forEach(h => this.log('HINT: ' + h));
    });

    this.onCommand('clear', () => this.clear());

    this.onCommand('status', () => {
      const found = Array.from(this.found).join(', ') || 'none';
      this.log(`Codes submitted: ${found}`);
    });

    this.onCommand('scan', () => {
      this.log('Available nodes: ' + Object.keys(this.nodes).join(', '));
    });

    this.onCommand('connect', args => {
      const id = args[0];
      if (!this.nodes[id]) return this.log('No such node.');
      this.currentNode = id;
      this.setHintContext(id);
      this.log(this.nodes[id].banner || `Connected to ${id}.`);
    });

    this.onCommand('ls', () => {
      if (!this.currentNode) return this.log('Not connected. Use `connect <node>`.');
      const files = Object.keys(this.nodes[this.currentNode].files || {});
      this.log(files.join('\n'));
    });

    this.onCommand('cat', args => {
      if (!this.currentNode) return this.log('Not connected.');
      const path = args[0];
      const file = this.nodes[this.currentNode].files[path];
      if (!file) return this.log('File not found.');
      this.log(file);
    });

    this.onCommand('decode', args => {
      const type = args[0];
      let content = args.slice(1).join(' ');
      if (this.currentNode && this.nodes[this.currentNode].files[content]) {
        content = this.nodes[this.currentNode].files[content];
      }
      if (!content) return this.log('Nothing to decode.');
      let out = '';
      if (type === 'base64') {
        try { out = atob(content.trim()); }
        catch { out = 'Invalid Base64.'; }
      } else if (type === 'rot13') {
        out = content.replace(/[a-zA-Z]/g, c => {
          const base = c <= 'Z' ? 65 : 97;
          return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
        });
      } else {
        return this.log('Unknown decoder.');
      }
      this.log(out);
    });

    this.onCommand('submit', args => {
      const code = args[0];
      const entries = Object.entries(this.codes);
      const hit = entries.find(([, v]) => v === code);
      if (hit) {
        this.found.add(hit[0]);
        this.log(`Code ${hit[0].toUpperCase()} accepted.`);
        if (this.found.size >= entries.length) this.success();
      } else {
        this.log('Incorrect code.');
      }
    });

    this.onCommand('reset', () => this.reset());
  }

  handle(line) {
    const [cmd, ...args] = line.split(/\s+/);
    const fn = this.commands.get(cmd);
    if (fn) fn(args, this);
    else this.log('Unknown command.');
  }
}
