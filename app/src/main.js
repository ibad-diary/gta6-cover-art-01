// Vice Coast Cover Studio: the editor. Pick photos, choose a layout and a grade,
// drag any panel to reposition its photo, write the caption, export a PNG.
// Photos are read on this machine with FileReader and never leave it.
import { SIZES, LAYOUTS, GRADES, PANEL_COUNT, defaultState, layoutPanels, renderCover } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');
const state = defaultState();

// Loaded photos: { img, name } per slot. Samples ship with the app; uploads replace a slot.
const photos = [];
let history = [];
let future = [];

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  return { img, name };
}

/** Pushes the current state onto the undo stack and clears redo. */
export function commitHistory(label) {
  history.push(JSON.stringify(state));
  if (history.length > 60) history.shift();
  future = [];
  refreshUndoButtons();
}

/** Restores a serialised state snapshot into the live state object. */
export function applySnapshot(json) {
  const snap = JSON.parse(json);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, snap);
}

export function undoCover() {
  if (!history.length) return;
  future.push(JSON.stringify(state));
  applySnapshot(history.pop());
  syncControls();
  redraw();
  refreshUndoButtons();
}

export function redoCover() {
  if (!future.length) return;
  history.push(JSON.stringify(state));
  applySnapshot(future.pop());
  syncControls();
  redraw();
  refreshUndoButtons();
}

function refreshUndoButtons() {
  $('undo').disabled = !history.length;
  $('redo').disabled = !future.length;
}

function redraw() {
  const images = photos.map((p) => (p ? p.img : null));
  renderCover(canvas, images, state);
  highlightSelectedPanel();
}

/** Draws the selection outline around the chosen panel on the preview canvas. */
export function highlightSelectedPanel() {
  // The outline lives on the overlay canvas, stacked over the preview.
  const overlay = $('overlay');
  const rect = canvas.getBoundingClientRect();
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const i = Math.min(state.selected, panels.length - 1);
  const p = panels[i];
  ctx.save();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = Math.max(3, canvas.width * 0.004);
  ctx.setLineDash([14, 8]);
  ctx.strokeRect(p.x * canvas.width, p.y * canvas.height, p.w * canvas.width, p.h * canvas.height);
  ctx.restore();
}

/** Builds the layout picker buttons from the engine's LAYOUTS table. */
export function buildLayoutPicker() {
  const box = $('layouts');
  box.innerHTML = '';
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.layout = key;
    b.textContent = def.label;
    b.title = def.blurb;
    b.addEventListener('click', () => {
      if (state.layout === key) return;
      commitHistory('layout');
      state.layout = key;
      state.selected = 0;
      syncControls();
      redraw();
    });
    box.appendChild(b);
  }
}

/** Builds the grade swatch buttons from the engine's GRADES table. */
export function buildGradePicker() {
  const box = $('grades');
  box.innerHTML = '';
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.grade = key;
    b.style.background = `linear-gradient(135deg, ${def.sky[0]}, ${def.sky[1]})`;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      if (state.grade === key) return;
      commitHistory('grade');
      state.grade = key;
      syncControls();
      redraw();
    });
    box.appendChild(b);
  }
}

/** Builds the three export-size buttons from the engine's SIZES table. */
export function buildSizePicker() {
  const box = $('sizes');
  box.innerHTML = '';
  for (const [key, def] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.size = key;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      commitHistory('size');
      state.size = key;
      syncControls();
      redraw();
      exportCover();
    });
    box.appendChild(b);
  }
}

/** Builds the per-panel photo slot buttons (sample or uploaded photo per panel). */
export function buildPanelList() {
  const box = $('panels');
  box.innerHTML = '';
  const count = layoutPanels(state.layout, 1, 1).length;
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'panel-row';
    const label = document.createElement('span');
    label.textContent = `Panel ${i + 1}`;
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    photos.forEach((p, pi) => {
      const opt = document.createElement('option');
      opt.value = String(pi);
      opt.textContent = p ? p.name : `Photo ${pi + 1}`;
      sel.appendChild(opt);
    });
    sel.value = String(state.panels[i].photo);
    sel.addEventListener('change', () => {
      commitHistory('panel photo');
      state.panels[i].photo = Number(sel.value);
      state.selected = i;
      redraw();
    });
    row.appendChild(label);
    row.appendChild(sel);
    const use = document.createElement('button');
    use.type = 'button';
    use.textContent = 'Select';
    use.addEventListener('click', () => {
      state.selected = i;
      syncControls();
      redraw();
    });
    row.appendChild(use);
    box.appendChild(row);
  }
}

/** Copies the live state into every control so undo/redo and shots stay in sync. */
export function syncControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('badge').value = state.badge;
  $('stars').value = String(state.stars);
  $('frame').checked = state.frame;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('halftone').checked = state.halftone;
  $('ribbon').checked = state.ribbon;
  document.querySelectorAll('#layouts .pick').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades .swatch').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizes .pick').forEach((b) => b.classList.toggle('on', b.dataset.size === state.size));
  const panel = state.panels[state.selected] || { zoom: 1, ox: 0, oy: 0 };
  $('zoom').value = String(panel.zoom);
  $('panx').value = String(panel.ox);
  $('pany').value = String(panel.oy);
  $('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  buildPanelList();
}

/** Renders the cover at full export size and downloads it as a PNG. */
export function exportCover() {
  const off = document.createElement('canvas');
  const images = photos.map((p) => (p ? p.img : null));
  const { w, h } = renderCover(off, images, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) {
        statusEl.textContent = 'Export failed in this browser.';
        resolve(null);
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-coast-cover-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      statusEl.textContent = `Saved vice-coast-cover-${w}x${h}.png (${(blob.size / 1024).toFixed(0)} KB)`;
      resolve(blob);
    }, 'image/png');
  });
}

/** Fills every panel with the selected photo slot, in one step. */
export function fillAllPanels(photoIndex) {
  commitHistory('fill all');
  for (let i = 0; i < PANEL_COUNT; i++) state.panels[i].photo = photoIndex;
  redraw();
}

function bindControls() {
  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('title').addEventListener('change', () => commitHistory('title'));
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('subtitle').addEventListener('change', () => commitHistory('subtitle'));
  $('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
  $('badge').addEventListener('change', () => commitHistory('badge'));
  $('stars').addEventListener('change', (e) => { commitHistory('stars'); state.stars = Number(e.target.value); redraw(); });
  for (const id of ['frame', 'grain', 'vignette', 'halftone', 'ribbon']) {
    $(id).addEventListener('change', (e) => { commitHistory(id); state[id] = e.target.checked; redraw(); });
  }
  $('zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value);
    $('zoomVal').textContent = `${Math.round(Number(e.target.value) * 100)}%`;
    redraw();
  });
  $('zoom').addEventListener('change', () => commitHistory('zoom'));
  $('panx').addEventListener('input', (e) => { state.panels[state.selected].ox = Number(e.target.value); redraw(); });
  $('panx').addEventListener('change', () => commitHistory('pan x'));
  $('pany').addEventListener('input', (e) => { state.panels[state.selected].oy = Number(e.target.value); redraw(); });
  $('pany').addEventListener('change', () => commitHistory('pan y'));
  $('resetPanel').addEventListener('click', () => {
    commitHistory('reset panel');
    state.panels[state.selected] = { photo: state.panels[state.selected].photo, zoom: 1, ox: 0, oy: 0 };
    syncControls();
    redraw();
  });
  $('fillAll').addEventListener('click', () => fillAllPanels(state.panels[state.selected].photo));
  $('undo').addEventListener('click', undoCover);
  $('redo').addEventListener('click', redoCover);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undoCover(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redoCover(); }
  });
  $('export').addEventListener('click', exportCover);
  $('upload').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, 3);
    for (const file of files) {
      const img = await loadImage(URL.createObjectURL(file));
      const slot = photos.findIndex((p) => p && p.name.startsWith('Upload'));
      const at = slot === -1 ? photos.length : slot;
      photos[at] = { img, name: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Upload' };
    }
    commitHistory('upload');
    syncControls();
    redraw();
    statusEl.textContent = `${files.length} photo${files.length > 1 ? 's' : ''} loaded — kept on this machine.`;
  });
  $('sampleBoulevard').addEventListener('click', async () => {
    photos[0] = await loadSample('boulevard');
    commitHistory('sample');
    syncControls();
    redraw();
  });
  $('samplePier').addEventListener('click', async () => {
    photos[1] = await loadSample('pier');
    commitHistory('sample');
    syncControls();
    redraw();
  });
}

/** Pointer drag on the preview: click picks a panel, drag pans its photo, wheel zooms it. */
function bindPreview() {
  let drag = null;
  const toCover = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * canvas.width, y: (e.clientY - r.top) / r.height * canvas.height };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCover(e);
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    const hit = panels.findIndex((r) => p.x >= r.x * canvas.width && p.x <= (r.x + r.w) * canvas.width && p.y >= r.y * canvas.height && p.y <= (r.y + r.h) * canvas.height);
    if (hit === -1) return;
    state.selected = hit;
    syncControls();
    drag = { x: p.x, y: p.y, ox: state.panels[hit].ox, oy: state.panels[hit].oy, moved: false };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toCover(e);
    const panel = state.panels[state.selected];
    const rect = layoutPanels(state.layout, canvas.width, canvas.height)[state.selected];
    panel.ox = drag.ox + (p.x - drag.x) / (rect.w * canvas.width);
    panel.oy = drag.oy + (p.y - drag.y) / (rect.h * canvas.height);
    drag.moved = true;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved) commitHistory('drag pan');
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[state.selected];
    panel.zoom = Math.max(0.6, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    syncControls();
    redraw();
  }, { passive: false });
  window.addEventListener('resize', highlightSelectedPanel);
}

async function init() {
  buildLayoutPicker();
  buildGradePicker();
  buildSizePicker();
  bindControls();
  bindPreview();
  photos[0] = await loadSample('boulevard');
  photos[1] = await loadSample('pier');
  syncControls();
  refreshUndoButtons();
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runShot(query.get('shot'), query, state, photos, { redraw, syncControls, commitHistory, loadSample });
  } else {
    redraw();
  }
}

init();
