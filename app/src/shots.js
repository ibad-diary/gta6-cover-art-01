// Fixed scenes for screenshots: ?shot=editor shows the studio with sample photos
// loaded; ?shot=cover shows one exported cover alone, drawn by the app itself at
// export size. Query keys: layout, grade, size, title, subtitle, badge, stars,
// photo (first sample), photo2 (second sample). window.__shotReady fires once painted.
import { renderCover } from './cover.js';

export async function runShot(shot, query, state, photos, helpers) {
  const { redraw, syncControls, loadSample } = helpers;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size')) state.size = query.get('size');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle') !== null) state.subtitle = query.get('subtitle') || '';
  if (query.get('badge')) state.badge = query.get('badge');
  if (query.get('stars')) state.stars = Number(query.get('stars'));
  if (query.get('photo')) photos[0] = await loadSample(query.get('photo'));
  if (query.get('photo2')) photos[1] = await loadSample(query.get('photo2'));
  // Every panel uses the two loaded photos, alternating, unless the query names one.
  const only = query.get('only');
  state.panels.forEach((p, i) => { p.photo = only !== null ? Number(only) : i % 2; });
  // Staged shots: vary the crop per panel so the two sample photos read as
  // different shots, with an upward bias that keeps faces in frame (the fit
  // clamps the pan, so no gap can open). Grid layouts can zoom further; the
  // hero's short side panels stay near 1:1 or heads get cropped.
  const zoomByPanel = [1.0, 1.18, 1.32, 1.10, 1.26, 1.06, 1.22, 1.14, 1.38];
  const oxByPanel = [0, 0.06, -0.06, -0.05, 0.07, 0, -0.07, 0.05, 0];
  const grid = state.layout === 'grid9' || state.layout === 'grid4';
  state.panels.forEach((p, i) => {
    if (grid) {
      const z = zoomByPanel[i];
      p.zoom = z;
      p.ox = oxByPanel[i];
      p.oy = 0.10 + (z - 1) * 0.3;
    } else {
      // Short/wide panels slice a portrait photo horizontally: bias hard to
      // the top (boulevard is portrait, pier is square) or heads get cropped.
      p.zoom = Math.min(zoomByPanel[i], 1.12);
      p.ox = oxByPanel[i];
      p.oy = p.photo === 0 ? 0.62 : 0.38;
    }
  });

  if (shot === 'cover') document.body.classList.add('shot-cover');
  try { await document.fonts.ready; } catch { /* fonts fall back to system sans */ }
  syncControls();
  redraw();

  if (query.get('probe') === 'layout') {
    const cover = document.getElementById('cover');
    const wrap = cover.parentElement;
    const cr = cover.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    document.title = `layout-ok vw=${window.innerWidth} vh=${window.innerHeight} cover=${cr.width}x${cr.height}@${cr.x},${cr.y} wrap=${wr.width}x${wr.height} canvas=${cover.width}x${cover.height}`;
  }
  if (query.get('probe') === 'export') {
    // Proof the PNG export path works: render offscreen and measure the blob.
    const off = document.createElement('canvas');
    const images = photos.map((p) => (p ? p.img : null));
    const { w, h } = renderCover(off, images, state);
    await new Promise((resolve) => {
      off.toBlob((blob) => {
        document.title = blob ? `export-ok ${blob.size} ${w}x${h}` : 'export-failed';
        window.__exportBytes = blob ? blob.size : 0;
        resolve();
      }, 'image/png');
    });
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
