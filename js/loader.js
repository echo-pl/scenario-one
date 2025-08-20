import { Engine } from './app.js';

const params = new URLSearchParams(location.search);
const scenarioId = params.get('scenario');
const landing = document.getElementById('landing');
const terminal = document.getElementById('terminal');
const logEl = document.getElementById('log');
const inputEl = document.getElementById('cmd');
const helpBtn = document.getElementById('help-btn');
const resetBtn = document.getElementById('reset-btn');

if (scenarioId) {
  landing.style.display = 'none';
  terminal.classList.remove('hidden');
  const engine = new Engine(logEl, inputEl);
  helpBtn.addEventListener('click', () => engine.handle('help'));
  resetBtn.addEventListener('click', () => engine.handle('reset'));
  loadScenarioById(scenarioId, engine);
} else {
  terminal.classList.add('hidden');
  listScenarios();
}

async function fetchScenarioFiles() {
  try {
    const res = await fetch('scenarios/');
    const text = await res.text();
    const matches = [...text.matchAll(/href="([^"]+\.(json|js))"/g)].map(m => m[1]);
    if (matches.length) return matches;
  } catch {}
  return ['example-basic.json', 'example-advanced.js'];
}

async function loadMeta(file) {
  if (file.endsWith('.json')) {
    try {
      const data = await fetch('scenarios/' + file).then(r => r.json());
      return { id: data.id, title: data.title, objective: data.objective, file };
    } catch { return null; }
  } else if (file.endsWith('.js')) {
    try {
      const mod = await import('../scenarios/' + file);
      return { id: mod.default.id, title: mod.default.title, objective: mod.default.objective, file };
    } catch { return null; }
  }
}

async function listScenarios() {
  const listEl = document.getElementById('scenario-list');
  const files = await fetchScenarioFiles();
  for (const file of files) {
    const meta = await loadMeta(file);
    if (!meta) continue;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${meta.title}</h3><p>${meta.objective || ''}</p><a class="start-btn" href="?scenario=${meta.id}">Start</a>`;
    listEl.appendChild(card);
  }
}

async function loadScenarioById(id, engine) {
  const files = await fetchScenarioFiles();
  for (const file of files) {
    const meta = await loadMeta(file);
    if (meta && meta.id === id) {
      await bootScenario(file, meta, engine);
      return;
    }
  }
  engine.log('Sorry, unable to load that scenario.');
}

async function bootScenario(file, meta, engine) {
  if (file.endsWith('.json')) {
    const data = await fetch('scenarios/' + file).then(r => r.json());
    engine.setCodes(data.codes);
    engine.setHints(data.hints);
    for (const [id, node] of Object.entries(data.nodes)) {
      engine.registerNode(id, node);
    }
    engine.log(`${data.title}: ${data.objective}`);
  } else if (file.endsWith('.js')) {
    const mod = await import('../scenarios/' + file);
    const scenario = mod.default;
    scenario.init(engine);
    engine.log(`${scenario.title}: ${scenario.objective}`);
  }
}
