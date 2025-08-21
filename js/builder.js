const codesDiv = document.getElementById('codes');
const nodesDiv = document.getElementById('nodes');
const globalHintsDiv = document.getElementById('globalHints');
const outputPre = document.getElementById('output');
const builderForm = document.getElementById('builder');

let dragItem = null;

const setDraggable = (el, container) => {
  el.draggable = true;
  el.addEventListener('dragstart', () => {
    dragItem = el;
  });
  el.addEventListener('dragover', (e) => e.preventDefault());
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dragItem && dragItem !== el) {
      container.insertBefore(dragItem, el);
      updateOutput();
    }
  });
};

const updateOutput = () => {
  const scenario = {
    id: document.getElementById('id').value,
    title: document.getElementById('title').value,
    objective: document.getElementById('objective').value,
    codes: {},
    nodes: {},
    hints: { global: [] }
  };
  codesDiv.querySelectorAll('div.flex').forEach((div) => {
    const inputs = div.querySelectorAll('input');
    const key = inputs[0].value.trim();
    const val = inputs[1].value.trim();
    if (key && val) scenario.codes[key] = val;
  });
  nodesDiv.querySelectorAll('fieldset').forEach((fs) => {
    const key = fs.querySelector('.node-key').value.trim();
    if (!key) return;
    const node = {
      name: fs.querySelector('.node-name').value,
      banner: fs.querySelector('.node-banner').value,
      ip: fs.querySelector('.node-ip').value,
      visible: fs.querySelector('.node-visible').checked,
      files: {}
    };
    fs.querySelectorAll('.file-list > div.flex').forEach((f) => {
      const inputs = f.querySelectorAll('input,textarea');
      const path = inputs[0].value.trim();
      const content = inputs[1].value;
      if (path) node.files[path] = content;
    });
    const hints = [];
    fs.querySelectorAll('.hint-list > div.flex input').forEach((h) => {
      const val = h.value.trim();
      if (val) hints.push(val);
    });
    if (hints.length) scenario.hints[key] = hints;
    scenario.nodes[key] = node;
  });
  globalHintsDiv.querySelectorAll('div.flex input').forEach((h) => {
    const val = h.value.trim();
    if (val) scenario.hints.global.push(val);
  });
  outputPre.textContent = JSON.stringify(scenario, null, 2);
};

const addCode = (key = '', value = '') => {
  const wrap = document.createElement('div');
  wrap.className = 'flex';
  wrap.innerHTML = `
      <input type="text" placeholder="Key (e.g. alpha)" value="${key}" />
      <input type="text" placeholder="4-digit code" value="${value}" />
      <button type="button" class="btn btn-small">×</button>
    `;
  wrap.querySelector('button').addEventListener('click', () => {
    wrap.remove();
    updateOutput();
  });
  codesDiv.appendChild(wrap);
  setDraggable(wrap, codesDiv);
  updateOutput();
};

const addFile = (container) => {
  const wrap = document.createElement('div');
  wrap.className = 'flex';
  wrap.innerHTML = `
      <input type="text" placeholder="path/to/file.txt" />
      <textarea placeholder="file contents"></textarea>
      <button type="button" class="btn btn-small">×</button>
    `;
  wrap.querySelector('button').addEventListener('click', () => {
    wrap.remove();
    updateOutput();
  });
  container.appendChild(wrap);
  setDraggable(wrap, container);
  updateOutput();
};

const addHint = (container, value = '') => {
  const wrap = document.createElement('div');
  wrap.className = 'flex';
  wrap.innerHTML = `
      <input type="text" value="${value}" />
      <button type="button" class="btn btn-small">×</button>
    `;
  wrap.querySelector('button').addEventListener('click', () => {
    wrap.remove();
    updateOutput();
  });
  container.appendChild(wrap);
  setDraggable(wrap, container);
  updateOutput();
};

const addNode = () => {
  const wrap = document.createElement('fieldset');
  wrap.innerHTML = `
      <legend>Node</legend>
      <div class="form-grid">
        <div><label>Key</label><input type="text" class="node-key" placeholder="alpha" /></div>
        <div><label>Name</label><input type="text" class="node-name" /></div>
        <div><label>Banner</label><input type="text" class="node-banner" /></div>
        <div><label>IP</label><input type="text" class="node-ip" /></div>
        <div><label><input type="checkbox" class="node-visible" checked /> Visible</label></div>
      </div>
      <fieldset class="files"><legend>Files</legend><div class="file-list"></div>
         <button type="button" class="btn btn-small add-file">Add file</button>
      </fieldset>
      <fieldset class="hints"><legend>Hints</legend><div class="hint-list"></div>
         <button type="button" class="btn btn-small add-hint">Add hint</button>
      </fieldset>
      <button type="button" class="btn btn-small remove-node">Remove node</button>
    `;
  wrap.querySelector('.add-file').addEventListener('click', () =>
    addFile(wrap.querySelector('.file-list'))
  );
  wrap.querySelector('.add-hint').addEventListener('click', () =>
    addHint(wrap.querySelector('.hint-list'))
  );
  wrap.querySelector('.remove-node').addEventListener('click', () => {
    wrap.remove();
    updateOutput();
  });
  nodesDiv.appendChild(wrap);
  setDraggable(wrap, nodesDiv);
  updateOutput();
};

document.getElementById('addCode').addEventListener('click', () => addCode());
document.getElementById('addNode').addEventListener('click', () => addNode());
document.getElementById('addGlobalHint').addEventListener('click', () =>
  addHint(globalHintsDiv)
);
document.getElementById('updateJson').addEventListener('click', updateOutput);
document.getElementById('downloadJson').addEventListener('click', () => {
  updateOutput();
  const blob = new Blob([outputPre.textContent], { type: 'application/json' });
  const a = document.createElement('a');
  const id = document.getElementById('id').value.trim() || 'scenario';
  a.href = URL.createObjectURL(blob);
  a.download = `${id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

builderForm.addEventListener('input', updateOutput);
builderForm.addEventListener('change', updateOutput);

addCode();
addNode();
addHint(globalHintsDiv);
updateOutput();

