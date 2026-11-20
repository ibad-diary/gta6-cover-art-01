// Vice Coast — Cover Studio: scripted screenshot scenes + probes.
// Called from main.js init() when the page is opened with ?shot=...
import { renderCover } from './cover.js';

// Per-panel crop variation so the nine-panel grid does not look like nine
// copies of the same framing.
const zoomByPanel = [1.0, 1.18, 1.32, 1.10, 1.26, 1.06, 1.22, 1.14, 1.38];
const oxByPanel = [0, 0.06, -0.06, -0.05, 0.07, 0, -0.07, 0.05, 0];

export async function runShot(shot, query, state, photos, helpers) {
  const { redraw, syncControls, loadSample } = helpers;

  // 1. Query params override the state (an empty value means empty string).
  if (query.get('layout') !== null) state.layout = query.get('layout');
  if (query.get('grade') !== null) state.grade = query.get('grade');
  if (query.get('size') !== null) state.size = query.get('size');
  if (query.get('title') !== null) state.title = query.get('title');
  if (query.get('subtitle') !== null) state.subtitle = query.get('subtitle');
  if (query.get('badge') !== null) state.badge = query.get('badge');
  if (query.get('stars') !== null) state.stars = Number(query.get('stars'));

  // 2. Optional sample swaps.
  if (query.get('photo') !== null) photos[0] = await loadSample(query.get('photo'));
  if (query.get('photo2') !== null) photos[1] = await loadSample(query.get('photo2'));

  // 3. Assign a photo to every panel.
  const only = query.get('only');
  for (let i = 0; i < state.panels.length; i += 1) {
    state.panels[i].photo = only !== null ? Number(only) : i % 2;
  }

  // 4. Vary the crop per panel.
  const grid = state.layout === 'grid9' || state.layout === 'grid4';
  for (let i = 0; i < state.panels.length; i += 1) {
    const p = state.panels[i];
    if (grid) {
      p.zoom = zoomByPanel[i];
      p.ox = oxByPanel[i];
      p.oy = 0.10 + (zoomByPanel[i] - 1) * 0.3;
    } else {
      p.zoom = Math.min(zoomByPanel[i], 1.12);
      p.ox = oxByPanel[i];
      // Boulevard (slot 0, portrait) leans up hard; pier (slot 1) less so.
      p.oy = p.photo === 0 ? 0.62 : 0.38;
    }
  }

  // 5. Cover-only mode hides the editor chrome (see body.shot-cover).
  if (shot === 'cover') document.body.classList.add('shot-cover');

  // 6. Wait for the OFL fonts so lettering renders in the right typeface.
  try {
    await document.fonts.ready;
  } catch {
    // Fall back to system sans; the shot still renders.
  }

  // 7. Draw.
  syncControls();
  redraw();

  // 8. Probes write their result into document.title.
  if (query.get('probe') === 'layout') {
    const cover = document.getElementById('cover');
    const cr = cover.getBoundingClientRect();
    const wr = cover.parentElement.getBoundingClientRect();
    document.title = `layout-ok vw=${window.innerWidth} vh=${window.innerHeight} cover=${cr.width}x${cr.height}@${cr.x},${cr.y} wrap=${wr.width}x${wr.height} canvas=${cover.width}x${cover.height}`;
  } else if (query.get('probe') === 'export') {
    const off = document.createElement('canvas');
    const images = photos.map((p) => (p ? p.img : null));
    const { w, h } = renderCover(off, images, state);
    const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
    if (blob) {
      document.title = `export-ok ${blob.size} ${w}x${h}`;
      window.__exportBytes = blob.size;
    } else {
      document.title = 'export-failed';
      window.__exportBytes = 0;
    }
  }

  // 9. Two frames settle, then signal the shooter.
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  window.__shotReady = true;
}
