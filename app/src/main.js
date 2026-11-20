// Vice Coast — Cover Studio: editor wiring (ES module).
import {
  SIZES,
  LAYOUTS,
  GRADES,
  PANEL_COUNT,
  defaultState,
  layoutPanels,
  renderCover,
} from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);

const canvas = $('cover');
const statusEl = $('status');
const state = defaultState();

// Photo slots: { img, name }. Slot index is what state.panels[i].photo
// points at. Slots 0 and 1 start as the two bundled samples.
const photos = [];
const history = [];
const future = [];

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${url}`));
    img.src = url;
  });
}

export async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  return { img, name };
}

export function refreshUndoButtons() {
  $('undo').disabled = !history.length;
  $('redo').disabled = !future.length;
}

export function commitHistory(label) {
  // Label is documentation only; only the snapshot is stored.
  history.push(JSON.stringify(state));
  if (history.length > 60) history.shift();
  future.length = 0;
  refreshUndoButtons();
}

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

export function highlightSelectedPanel() {
  const overlay = $('overlay');
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  const shown = canvas.getBoundingClientRect();
  overlay.style.width = `${shown.width}px`;
  overlay.style.height = `${shown.height}px`;
  const octx = overlay.getContext('2d');
  octx.clearRect(0, 0, overlay.width, overlay.height);
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const i = Math.min(state.selected, panels.length - 1);
  const p = panels[i];
  octx.save();
  octx.strokeStyle = '#ffd166';
  octx.lineWidth = Math.max(3, canvas.width * 0.004);
  octx.setLineDash([14, 8]);
  octx.strokeRect(p.x * canvas.width, p.y * canvas.height, p.w * canvas.width, p.h * canvas.height);
  octx.restore();
}

export function redraw() {
  const images = photos.map((p) => (p ? p.img : null));
  renderCover(canvas, images, state);
  highlightSelectedPanel();
}

export function buildLayoutPicker() {
  const box = $('layouts');
  box.innerHTML = '';
  for (const [key, entry] of Object.entries(LAYOUTS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick';
    btn.dataset.layout = key;
    btn.title = entry.blurb;
    btn.textContent = entry.label;
    btn.addEventListener('click', () => {
      if (state.layout === key) return;
      commitHistory('layout');
      state.layout = key;
      state.selected = 0;
      syncControls();
      redraw();
    });
    box.appendChild(btn);
  }
}

export function buildGradePicker() {
  const box = $('grades');
  box.innerHTML = '';
  for (const [key, entry] of Object.entries(GRADES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.dataset.grade = key;
    btn.style.background = `linear-gradient(135deg, ${entry.sky[0]}, ${entry.sky[1]})`;
    btn.textContent = entry.label;
    btn.addEventListener('click', () => {
      if (state.grade === key) return;
      commitHistory('grade');
      state.grade = key;
      syncControls();
      redraw();
    });
    box.appendChild(btn);
  }
}

export function buildSizePicker() {
  const box = $('sizes');
  box.innerHTML = '';
  for (const [key, entry] of Object.entries(SIZES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick';
    btn.dataset.size = key;
    btn.textContent = entry.label;
    btn.addEventListener('click', async () => {
      if (state.size === key) return;
      commitHistory('size');
      state.size = key;
      syncControls();
      redraw();
      // Picking a size exports the cover at that size right away.
      await exportCover();
    });
    box.appendChild(btn);
  }
}

export function buildPanelList() {
  const box = $('panels');
  box.innerHTML = '';
  const count = layoutPanels(state.layout, 1, 1).length;
  for (let i = 0; i < count; i += 1) {
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
    const pickBtn = document.createElement('button');
    pickBtn.type = 'button';
    pickBtn.className = 'ghost';
    pickBtn.textContent = 'Select';
    pickBtn.addEventListener('click', () => {
      state.selected = i;
      syncControls();
      redraw();
    });
    row.appendChild(label);
    row.appendChild(sel);
    row.appendChild(pickBtn);
    box.appendChild(row);
  }
}

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
  for (const [key, group] of [['layout', 'layouts'], ['grade', 'grades'], ['size', 'sizes']]) {
    document.querySelectorAll(`#${group} .pick, #${group} .swatch`).forEach((btn) => {
      btn.classList.toggle('on', btn.dataset[key] === state[key]);
    });
  }
  const panel = state.panels[state.selected] || { zoom: 1, ox: 0, oy: 0 };
  $('zoom').value = String(panel.zoom);
  $('panx').value = String(panel.ox);
  $('pany').value = String(panel.oy);
  $('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  buildPanelList();
}

export function exportCover() {
  return new Promise((resolve) => {
    const off = document.createElement('canvas');
    const images = photos.map((p) => (p ? p.img : null));
    const { w, h } = renderCover(off, images, state);
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

export function fillAllPanels(photoIndex) {
  commitHistory('fill all');
  for (let i = 0; i < PANEL_COUNT; i += 1) {
    state.panels[i].photo = photoIndex;
  }
  redraw();
}

function bindControls() {
  const textField = (id, key, label) => {
    $(id).addEventListener('input', (e) => {
      state[key] = e.target.value;
      redraw();
    });
    $(id).addEventListener('change', () => commitHistory(label));
  };
  textField('title', 'title', 'title');
  textField('subtitle', 'subtitle', 'subtitle');
  textField('badge', 'badge', 'badge');

  $('stars').addEventListener('change', (e) => {
    commitHistory('stars');
    state.stars = Number(e.target.value);
    redraw();
  });

  for (const id of ['frame', 'grain', 'vignette', 'halftone', 'ribbon']) {
    $(id).addEventListener('change', (e) => {
      commitHistory(id);
      state[id] = e.target.checked;
      redraw();
    });
  }

  const selectedPanel = () => state.panels[state.selected];
  $('zoom').addEventListener('input', (e) => {
    selectedPanel().zoom = Number(e.target.value);
    $('zoomVal').textContent = `${Math.round(Number(e.target.value) * 100)}%`;
    redraw();
  });
  $('zoom').addEventListener('change', () => commitHistory('zoom'));
  $('panx').addEventListener('input', (e) => {
    selectedPanel().ox = Number(e.target.value);
    redraw();
  });
  $('panx').addEventListener('change', () => commitHistory('pan x'));
  $('pany').addEventListener('input', (e) => {
    selectedPanel().oy = Number(e.target.value);
    redraw();
  });
  $('pany').addEventListener('change', () => commitHistory('pan y'));

  $('resetPanel').addEventListener('click', () => {
    commitHistory('reset panel');
    const panel = selectedPanel();
    const keep = panel.photo;
    state.panels[state.selected] = { photo: keep, zoom: 1, ox: 0, oy: 0.45 };
    syncControls();
    redraw();
  });

  $('fillAll').addEventListener('click', () => {
    fillAllPanels(state.panels[state.selected].photo);
  });

  $('undo').addEventListener('click', undoCover);
  $('redo').addEventListener('click', redoCover);
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.key.toLowerCase() !== 'z' && e.key.toLowerCase() !== 'y') return;
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undoCover();
    } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
      e.preventDefault();
      redoCover();
    }
  });

  $('export').addEventListener('click', () => exportCover());

  $('upload').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, 9);
    const written = [];
    for (const file of files) {
      const img = await loadImage(URL.createObjectURL(file));
      let slot = photos.findIndex((p) => p && p.name.startsWith('Upload'));
      if (slot < 0) slot = photos.length;
      const base = file.name.replace(/\.[^.]*$/, '').slice(0, 18) || 'Upload';
      photos[slot] = { img, name: base };
      written.push(slot);
    }
    if (written.length) {
      for (let i = 0; i < PANEL_COUNT; i += 1) {
        state.panels[i].photo = written[i % written.length];
      }
    }
    // Note: history is committed after the panels change (kept as-is).
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

function bindPreview() {
  const toCanvas = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * canvas.width,
      y: (e.clientY - rect.top) / rect.height * canvas.height,
    };
  };
  const hitPanel = (p) => {
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    for (let i = 0; i < panels.length; i += 1) {
      const r = panels[i];
      if (
        p.x >= r.x * canvas.width && p.x < (r.x + r.w) * canvas.width &&
        p.y >= r.y * canvas.height && p.y < (r.y + r.h) * canvas.height
      ) return i;
    }
    return -1;
  };
  let drag = null;

  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const hit = hitPanel(p);
    if (hit < 0) return;
    state.selected = hit;
    syncControls();
    const panel = state.panels[hit];
    drag = { x: p.x, y: p.y, ox: panel.ox, oy: panel.oy, moved: false };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toCanvas(e);
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    const r = panels[state.selected];
    const rect = { w: r.w * canvas.width, h: r.h * canvas.height };
    const panel = state.panels[state.selected];
    panel.ox = drag.ox + (p.x - drag.x) / rect.w;
    panel.oy = drag.oy + (p.y - drag.y) / rect.h;
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
    await runShot(query.get('shot'), query, state, photos, {
      redraw,
      syncControls,
      commitHistory,
      loadSample,
    });
  } else {
    redraw();
  }
}

init();
