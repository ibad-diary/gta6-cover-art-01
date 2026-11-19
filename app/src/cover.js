// Vice Coast cover engine: draws a multi-panel GTA-poster-style cover on a 2D canvas.
// Every panel is one photo, cropped and positioned by its own panel state; a colour
// grade, a halftone title block, a badge ribbon, film grain and a vignette finish it.
// Nothing here touches the network: photos are Image objects handed in by the editor.

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
  sunset: { label: 'Vice Sunset', filter: 'saturate(1.3) contrast(1.08) brightness(1.03) sepia(0.18)', sky: ['#ff7a3d', '#ff2e88'], ink: '#fff7e8' },
  neon: { label: 'Neon Nights', filter: 'saturate(1.45) contrast(1.15) brightness(0.98) hue-rotate(-12deg)', sky: ['#ff2ea6', '#22d3ee'], ink: '#f2fbff' },
  miami: { label: 'Miami Heat', filter: 'saturate(1.5) contrast(1.1) brightness(1.05) sepia(0.28)', sky: ['#ffb347', '#ff4d6d'], ink: '#fff3d6' },
  ocean: { label: 'Ocean Drive', filter: 'saturate(1.2) contrast(1.06) brightness(1.02) hue-rotate(14deg)', sky: ['#2dd4bf', '#2563eb'], ink: '#eefcff' },
  noir: { label: 'After Dark', filter: 'saturate(0.15) contrast(1.25) brightness(0.95)', sky: ['#e5e7eb', '#6b7280'], ink: '#f8fafc' },
};

export const PANEL_COUNT = 9;

/** Default cover state: one fresh object per call so undo snapshots stay independent. */
export function defaultState() {
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
    panels: Array.from({ length: PANEL_COUNT }, (_, i) => ({
      photo: i % 2,
      zoom: 1,
      ox: 0,
      oy: 0,
    })),
  };
}

/** Panel rectangles for a layout, as fractions of the cover, with a gutter between them. */
export function layoutPanels(layout, w, h) {
  const g = 0.012; // gutter, fraction of width
  const inset = (x, y, pw, ph) => ({ x: x + g / 2, y: y + g / 2, w: pw - g, h: ph - g, rot: 0 });
  switch (layout) {
    case 'grid4':
      return [inset(0, 0, 0.5, 0.5), inset(0.5, 0, 0.5, 0.5), inset(0, 0.5, 0.5, 0.5), inset(0.5, 0.5, 0.5, 0.5)];
    case 'grid9': {
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(inset(c / 3, r / 3, 1 / 3, 1 / 3));
      return out;
    }
    case 'fullbleed':
      return [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }];
    case 'tilted':
      return [
        { x: 0.03, y: 0.30, w: 0.44, h: 0.46, rot: -0.10 },
        { x: 0.28, y: 0.05, w: 0.46, h: 0.58, rot: 0.03 },
        { x: 0.55, y: 0.30, w: 0.44, h: 0.46, rot: 0.09 },
      ];
    case 'triptych':
      return [inset(0, 0, 1 / 3, 1), inset(1 / 3, 0, 1 / 3, 1), inset(2 / 3, 0, 1 / 3, 1)];
    case 'strip':
      return [inset(0, 0, 1, 0.60), inset(0, 0.60, 1 / 3, 0.40), inset(1 / 3, 0.60, 1 / 3, 0.40), inset(2 / 3, 0.60, 1 / 3, 0.40)];
    case 'hero':
    default:
      return [inset(0, 0, 0.62, 1), inset(0.62, 0, 0.38, 0.34), inset(0.62, 0.34, 0.38, 0.33), inset(0.62, 0.67, 0.38, 0.33)];
  }
}

/** Where the title block sits for a layout: bottom band, except the strip's top band. */
export function titleZone(layout, w, h) {
  if (layout === 'strip') return { x: 0, y: 0, w, h: h * 0.30, align: 'left' };
  if (layout === 'tilted') return { x: 0, y: h * 0.74, w, h: h * 0.26, align: 'center' };
  return { x: 0, y: h * 0.72, w, h: h * 0.28, align: 'center' };
}

/** Cover-fit rectangle for an image inside a panel, with the panel's zoom and pan. */
export function coverFitRect(img, rect, panel) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * (panel.zoom || 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + (panel.ox || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (panel.oy || 0) * rect.h;
  return { x: cx - pw / 2, y: cy - ph / 2, w: pw, h: ph };
}

/** Draws one photo into one panel rect, clipped, graded and framed. */
export function drawPanelPhoto(ctx, img, rect, panel, grade, frame) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (img) {
    ctx.filter = grade.filter;
    const r = coverFitRect(img, rect, panel);
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
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

/** Sunset / neon wash over the whole cover: two soft-light gradients. */
export function applyGradeOverlay(ctx, w, h, grade) {
  const top = ctx.createLinearGradient(0, 0, w, h * 0.55);
  top.addColorStop(0, grade.sky[1] + '30');
  top.addColorStop(1, grade.sky[1] + '00');
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h);
  const bottom = ctx.createLinearGradient(0, h * 0.45, 0, h);
  bottom.addColorStop(0, grade.sky[0] + '00');
  bottom.addColorStop(1, grade.sky[0] + '55');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Halftone dot field behind the title: rows of dots that shrink toward the top. */
export function drawHalftoneDots(ctx, zone, w, h, color) {
  const step = Math.max(10, w * 0.016);
  ctx.save();
  ctx.fillStyle = color;
  for (let y = zone.y + step; y < zone.y + zone.h; y += step) {
    const t = 1 - (y - zone.y) / zone.h;
    for (let x = step / 2; x < zone.x + zone.w; x += step) {
      const r = step * 0.16 * (0.4 + 0.6 * t);
      ctx.globalAlpha = 0.10 + 0.22 * t;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Shrinks text until it fits maxWidth, returning the size to draw at. */
export function fitTitleText(ctx, text, maxWidth, startSize, font) {
  let size = startSize;
  ctx.font = font(size);
  while (size > 16 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = font(size);
  }
  return size;
}

/** The title block: scrim, halftone, big Anton title with a sunset gradient, script subtitle, stars. */
export function drawTitleBlock(ctx, w, h, state, grade) {
  const zone = titleZone(state.layout, w, h);
  const scrim = ctx.createLinearGradient(0, zone.y - h * 0.06, 0, zone.y + zone.h);
  scrim.addColorStop(0, 'rgba(10,6,18,0)');
  scrim.addColorStop(0.45, 'rgba(10,6,18,0.55)');
  scrim.addColorStop(1, 'rgba(10,6,18,0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(zone.x, zone.y - h * 0.06, zone.w, zone.h + h * 0.06);
  if (state.halftone) drawHalftoneDots(ctx, zone, w, h, '#ffffff');

  const pad = w * 0.045;
  const cx = zone.align === 'left' ? zone.x + pad : zone.x + zone.w / 2;
  ctx.textAlign = zone.align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'alphabetic';

  const title = (state.title || 'UNTITLED').toUpperCase();
  const titleSize = fitTitleText(ctx, title, zone.w - pad * 2, zone.h * 0.52, (s) => `${s}px Anton, "Arial Black", sans-serif`);
  const titleGrad = ctx.createLinearGradient(0, zone.y + zone.h * 0.08, 0, zone.y + zone.h * 0.62);
  titleGrad.addColorStop(0, '#ffffff');
  titleGrad.addColorStop(0.55, grade.sky[0]);
  titleGrad.addColorStop(1, grade.sky[1]);
  ctx.save();
  try { ctx.letterSpacing = `${Math.max(1, titleSize * 0.03)}px`; } catch { /* older canvas: ignore */ }
  ctx.font = `${titleSize}px Anton, "Arial Black", sans-serif`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,8,28,0.9)';
  ctx.lineWidth = Math.max(2, titleSize * 0.07);
  const titleY = zone.y + zone.h * 0.58;
  ctx.strokeText(title, cx, titleY);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, cx, titleY);
  ctx.restore();

  const sub = (state.subtitle || '').trim();
  if (sub) {
    const subSize = Math.max(14, zone.h * 0.17);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.ink;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(sub, cx, zone.y + zone.h * 0.82);
    ctx.shadowBlur = 0;
  }

  // Heat meter: filled stars for the rating, dim stars for the rest.
  const starSize = Math.max(12, zone.h * 0.13);
  ctx.font = `${starSize}px sans-serif`;
  ctx.textAlign = 'left';
  const stars = '★★★★★';
  const starW = ctx.measureText(stars).width;
  const sx = zone.align === 'left' ? zone.x + pad : zone.x + zone.w / 2 - starW / 2;
  const sy = zone.y + zone.h * 0.97;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(stars, sx, sy);
  ctx.fillStyle = '#ffd166';
  ctx.fillText('★'.repeat(Math.max(0, Math.min(5, state.stars || 0))), sx, sy);
}

/** Diagonal badge ribbon across the top-right corner. */
export function drawBadgeRibbon(ctx, w, h, state, grade) {
  if (!state.ribbon) return;
  const text = (state.badge || '').trim().toUpperCase();
  if (!text) return;
  const s = Math.min(w, h);
  ctx.save();
  ctx.translate(w, 0);
  ctx.rotate(Math.PI / 4);
  const bandH = s * 0.055;
  const bandW = s * 0.62;
  ctx.fillStyle = grade.sky[1];
  ctx.fillRect(-bandW / 2, -bandH / 2 + s * 0.16, bandW, bandH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(12, bandH * 0.52)}px "Bebas Neue", "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = '2px'; } catch { /* ignore */ }
  ctx.fillText(text, 0, -bandH / 2 + s * 0.16 + bandH / 2);
  ctx.restore();
}

let grainPattern = null;
/** Film grain: a tiled random-noise pattern at low alpha. */
export function drawFilmGrain(ctx, w, h) {
  if (!grainPattern) {
    const n = document.createElement('canvas');
    n.width = 140;
    n.height = 140;
    const nctx = n.getContext('2d');
    const data = nctx.createImageData(140, 140);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 96 + Math.floor(Math.random() * 64);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    nctx.putImageData(data, 0, 0);
    grainPattern = ctx.createPattern(n, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Darkened corners so the middle of the cover pops. */
export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Renders the whole cover onto canvas at the state's size. images[i] is the photo for photos[i]. */
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
  const order = state.layout === 'tilted' ? [0, 2, 1] : panels.map((_, i) => i);
  for (const i of order) {
    const rect = {
      x: panels[i].x * w,
      y: panels[i].y * h,
      w: panels[i].w * w,
      h: panels[i].h * h,
    };
    const panel = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = images[panel.photo] || null;
    ctx.save();
    if (panels[i].rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(panels[i].rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      drawPanelPhoto(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, panel, grade, state.frame);
      ctx.restore();
    } else {
      ctx.restore();
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
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    ctx.restore();
  }
  return { w, h };
}
