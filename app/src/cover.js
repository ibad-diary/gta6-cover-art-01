// Vice Coast — Cover Studio: cover rendering engine.
// Pure canvas drawing (no DOM except the lazy grain tile). All sizes are
// export-canvas pixels; panel rectangles are fractions (0-1) of the canvas.

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

export const LAYOUTS = {
  hero: { label: 'Hero + Three', panels: 4, blurb: 'One big hero shot, three stacked beside it' },
  grid4: { label: 'Four Panel Grid', panels: 4, blurb: 'Classic 2 x 2 poster grid' },
  grid9: { label: 'Nine Panel Grid', panels: 9, blurb: 'The full 3 x 3 cover grid' },
  fullbleed: { label: 'Full Bleed', panels: 1, blurb: 'One photo edge to edge, title over it' },
  tilted: { label: 'Tilted Snapshots', panels: 3, blurb: 'Three overlapping tilted snapshots' },
  triptych: { label: 'Triptych', panels: 3, blurb: 'Three tall panels side by side' },
  strip: { label: 'Hero + Strip', panels: 4, blurb: 'Wide hero over a three-photo strip' },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.3) contrast(1.08) brightness(1.03) sepia(0.18)',
    sky: ['#ff7a3d', '#ff2e88'],
    ink: '#fff7e8',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.45) contrast(1.15) brightness(0.98) hue-rotate(-12deg)',
    sky: ['#ff2ea6', '#22d3ee'],
    ink: '#f2fbff',
  },
  miami: {
    label: 'Miami Heat',
    filter: 'saturate(1.5) contrast(1.1) brightness(1.05) sepia(0.28)',
    sky: ['#ffb347', '#ff4d6d'],
    ink: '#fff3d6',
  },
  ocean: {
    label: 'Ocean Drive',
    filter: 'saturate(1.2) contrast(1.06) brightness(1.02) hue-rotate(14deg)',
    sky: ['#2dd4bf', '#2563eb'],
    ink: '#eefcff',
  },
  noir: {
    label: 'After Dark',
    filter: 'saturate(0.15) contrast(1.25) brightness(0.95)',
    sky: ['#e5e7eb', '#6b7280'],
    ink: '#f8fafc',
  },
};

export const PANEL_COUNT = 9;

export function defaultState() {
  const panels = [];
  for (let i = 0; i < PANEL_COUNT; i += 1) {
    // Default pan leans upward (oy 0.45) so portrait photos keep heads
    // inside short panels; coverFitRect clamps it away when a photo has
    // no vertical slack.
    panels.push({ photo: i % 2, zoom: 1, ox: 0, oy: 0.45 });
  }
  return {
    layout: 'hero',
    grade: 'sunset',
    size: 'square',
    title: 'NEON SHORE',
    subtitle: 'a vice city story',
    badge: 'VICE COAST',
    stars: 4,
    frame: true,
    grain: true,
    vignette: true,
    halftone: true,
    ribbon: true,
    selected: 0,
    panels,
  };
}

export function layoutPanels(layout, w, h) {
  const g = 0.012;
  const inset = (x, y, pw, ph) => ({ x: x + g / 2, y: y + g / 2, w: pw - g, h: ph - g, rot: 0 });
  switch (layout) {
    case 'grid4':
      return [
        inset(0, 0, 0.5, 0.5),
        inset(0.5, 0, 0.5, 0.5),
        inset(0, 0.5, 0.5, 0.5),
        inset(0.5, 0.5, 0.5, 0.5),
      ];
    case 'grid9': {
      const cells = [];
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          cells.push(inset(col / 3, row / 3, 1 / 3, 1 / 3));
        }
      }
      return cells;
    }
    case 'fullbleed':
      return [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }];
    case 'tilted':
      // Small tilts only: the middle snapshot is biggest and on top.
      return [
        { x: 0.03, y: 0.30, w: 0.44, h: 0.46, rot: -0.06 },
        { x: 0.28, y: 0.05, w: 0.46, h: 0.58, rot: 0.02 },
        { x: 0.55, y: 0.30, w: 0.44, h: 0.46, rot: 0.06 },
      ];
    case 'triptych':
      return [
        inset(0, 0, 1 / 3, 1),
        inset(1 / 3, 0, 1 / 3, 1),
        inset(2 / 3, 0, 1 / 3, 1),
      ];
    case 'strip':
      return [
        inset(0, 0, 1, 0.60),
        inset(0, 0.60, 1 / 3, 0.40),
        inset(1 / 3, 0.60, 1 / 3, 0.40),
        inset(2 / 3, 0.60, 1 / 3, 0.40),
      ];
    case 'hero':
    default:
      return [
        inset(0, 0, 0.62, 1),
        inset(0.62, 0, 0.38, 0.34),
        inset(0.62, 0.34, 0.38, 0.33),
        inset(0.62, 0.67, 0.38, 0.33),
      ];
  }
}

export function titleZone(layout, w, h) {
  if (layout === 'strip') return { x: 0, y: 0, w, h: h * 0.30, align: 'left' };
  if (layout === 'tilted') return { x: 0, y: h * 0.74, w, h: h * 0.26, align: 'center' };
  return { x: 0, y: h * 0.72, w, h: h * 0.28, align: 'center' };
}

// Cover-fit a photo into a panel rect, clamping the pan so the photo can
// never be dragged out of its panel (no background gaps).
export function coverFitRect(img, rect, panel) {
  const zoom = panel.zoom || 1;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const maxOx = Math.max(0, (pw - rect.w) / 2 / rect.w);
  const maxOy = Math.max(0, (ph - rect.h) / 2 / rect.h);
  const ox = Math.max(-maxOx, Math.min(maxOx, panel.ox || 0));
  const oy = Math.max(-maxOy, Math.min(maxOy, panel.oy || 0));
  const cx = rect.x + rect.w / 2 + ox * rect.w;
  const cy = rect.y + rect.h / 2 + oy * rect.h;
  return { x: cx - pw / 2, y: cy - ph / 2, w: pw, h: ph };
}

export function drawPanelPhoto(ctx, img, rect, panel, grade, frame) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (img) {
    ctx.filter = grade.filter;
    const fit = coverFitRect(img, rect, panel);
    ctx.drawImage(img, fit.x, fit.y, fit.w, fit.h);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = '#3b2b4d';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
  if (frame) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, rect.w * 0.012);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
}

export function applyGradeOverlay(ctx, w, h, grade) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const top = ctx.createLinearGradient(0, 0, w, h * 0.55);
  top.addColorStop(0, grade.sky[1] + '30');
  top.addColorStop(1, grade.sky[1] + '00');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h);
  const bottom = ctx.createLinearGradient(0, h * 0.45, 0, h);
  bottom.addColorStop(0, grade.sky[0] + '00');
  bottom.addColorStop(1, grade.sky[0] + '55');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawHalftoneDots(ctx, zone, w, h, color) {
  ctx.save();
  const step = Math.max(10, w * 0.016);
  ctx.fillStyle = color;
  for (let y = zone.y + step; y < zone.y + zone.h; y += step) {
    const t = 1 - (y - zone.y) / zone.h;
    const r = step * 0.16 * (0.4 + 0.6 * t);
    ctx.globalAlpha = 0.10 + 0.22 * t;
    for (let x = step / 2; x < zone.x + zone.w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function fitTitleText(ctx, text, maxWidth, startSize, font) {
  let size = startSize;
  ctx.font = font(size);
  while (size > 16 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = font(size);
  }
  return size;
}

export function drawTitleBlock(ctx, w, h, state, grade) {
  const zone = titleZone(state.layout, w, h);
  // Dense grids get a smaller title and a lighter scrim so the photos
  // underneath stay readable.
  const titleScale = state.layout === 'grid9' ? 0.50 : state.layout === 'grid4' ? 0.78 : 1;
  const scrimScale = state.layout === 'grid9' ? 0.62 : state.layout === 'grid4' ? 0.80 : 1;
  const scrimMid = (0.55 * scrimScale).toFixed(2);
  const scrimEnd = (0.82 * scrimScale).toFixed(2);

  const scrim = ctx.createLinearGradient(0, zone.y - h * 0.06, 0, zone.y + zone.h);
  scrim.addColorStop(0, 'rgba(10,6,18,0)');
  scrim.addColorStop(0.45, `rgba(10,6,18,${scrimMid})`);
  scrim.addColorStop(1, `rgba(10,6,18,${scrimEnd})`);
  ctx.fillStyle = scrim;
  ctx.fillRect(zone.x, zone.y - h * 0.06, zone.w, zone.h + h * 0.06);

  if (state.halftone) drawHalftoneDots(ctx, zone, w, h, '#ffffff');

  const pad = w * 0.045;
  const cx = zone.align === 'left' ? zone.x + pad : zone.x + zone.w / 2;
  ctx.textAlign = zone.align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'alphabetic';

  const title = (state.title || 'UNTITLED').toUpperCase();
  const titleSize = fitTitleText(
    ctx,
    title,
    zone.w - pad * 2,
    zone.h * 0.52 * titleScale,
    (s) => `${s}px Anton, "Arial Black", sans-serif`,
  );
  const titleGrad = ctx.createLinearGradient(0, zone.y + zone.h * 0.08, 0, zone.y + zone.h * 0.62);
  titleGrad.addColorStop(0, '#ffffff');
  titleGrad.addColorStop(0.55, grade.sky[0]);
  titleGrad.addColorStop(1, grade.sky[1]);
  const titleY = zone.y + zone.h * 0.58;
  ctx.save();
  try {
    ctx.letterSpacing = `${Math.max(1, titleSize * 0.03)}px`;
  } catch {
    // Older canvases ignore letterSpacing; the title still draws fine.
  }
  ctx.font = `${titleSize}px Anton, "Arial Black", sans-serif`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,8,28,0.9)';
  ctx.lineWidth = Math.max(2, titleSize * 0.07);
  ctx.strokeText(title, cx, titleY);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, cx, titleY);
  ctx.restore();

  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    const subSize = Math.max(14, zone.h * 0.17 * titleScale);
    ctx.save();
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.ink;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(subtitle, cx, zone.y + zone.h * 0.82);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  const starSize = Math.max(12, zone.h * 0.13 * titleScale);
  ctx.save();
  ctx.font = `${starSize}px sans-serif`;
  ctx.textAlign = 'left';
  const full = '★★★★★';
  const lit = '★'.repeat(Math.max(0, Math.min(5, state.stars || 0)));
  let sx = zone.x + pad;
  if (zone.align !== 'left') {
    sx = zone.x + zone.w / 2 - ctx.measureText(full).width / 2;
  }
  const sy = zone.y + zone.h * 0.97;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(full, sx, sy);
  ctx.fillStyle = '#ffd166';
  ctx.fillText(lit, sx, sy);
  ctx.restore();
}

export function drawBadgeRibbon(ctx, w, h, state, grade) {
  const text = (state.badge || '').trim().toUpperCase();
  if (!state.ribbon || !text) return;
  const s = Math.min(w, h);
  const bandH = s * 0.045;
  // Short band: it must stay inside the corner triangle and never cross
  // a face in the top-right photo.
  const bandW = s * 0.40;
  const bandY = s * 0.16;
  ctx.save();
  ctx.translate(w, 0);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = grade.sky[1];
  ctx.fillRect(-bandW / 2, -bandH / 2 + bandY, bandW, bandH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(12, bandH * 0.52)}px "Bebas Neue", "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try {
    ctx.letterSpacing = '2px';
  } catch {
    // Ignore; ribbon text still draws.
  }
  ctx.fillText(text, 0, -bandH / 2 + bandY + bandH / 2);
  ctx.restore();
}

let grainPattern = null;

export function drawFilmGrain(ctx, w, h) {
  if (!grainPattern) {
    const tile = document.createElement('canvas');
    tile.width = 140;
    tile.height = 140;
    const tctx = tile.getContext('2d');
    const data = tctx.createImageData(140, 140);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 96 + Math.floor(Math.random() * 64);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    tctx.putImageData(data, 0, 0);
    grainPattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export function renderCover(canvas, images, state) {
  const size = SIZES[state.size] || SIZES.square;
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const w = size.w;
  const h = size.h;
  const grade = GRADES[state.grade] || GRADES.sunset;

  ctx.fillStyle = '#140a1e';
  ctx.fillRect(0, 0, w, h);

  const panels = layoutPanels(state.layout, w, h);
  // Tilted: the middle snapshot draws last so it sits on top.
  const order = state.layout === 'tilted' ? [0, 2, 1] : panels.map((_, i) => i);
  for (const i of order) {
    const p = panels[i];
    const rect = { x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h };
    const panel = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = images[panel.photo] || null;
    if (p.rot) {
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(p.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      drawPanelPhoto(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, panel, grade, state.frame);
      ctx.restore();
    } else {
      drawPanelPhoto(ctx, img, rect, panel, grade, state.frame);
    }
  }

  applyGradeOverlay(ctx, w, h, grade);
  drawTitleBlock(ctx, w, h, state, grade);
  drawBadgeRibbon(ctx, w, h, state, grade);
  if (state.grain) drawFilmGrain(ctx, w, h);
  if (state.vignette) drawVignette(ctx, w, h);
  if (state.frame) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    const lw = Math.max(3, w * 0.006);
    ctx.lineWidth = lw;
    ctx.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    ctx.restore();
  }
  return { w, h };
}
