import type { AvatarAppearance } from '../data/appearanceCatalog';
import type { FurnitureDef } from '../data/furnitureCatalog';
import { drawAvatar } from '../render/avatarArt';
import { CanvasGfx } from '../render/canvasGraphics';
import { drawFurniture } from '../render/furnitureArt';
import { CanvasPainter } from '../render/painter';

/** Head-and-shoulders (or full body) portrait of an avatar on a canvas. */
export function portrait(a: AvatarAppearance, size: number, opts: { full?: boolean; headphones?: boolean } = {}): HTMLCanvasElement {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = size * dpr;
  c.height = size * dpr;
  c.style.width = `${size}px`;
  c.style.height = `${size}px`;
  c.className = 'portrait';
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.scale(dpr, dpr);
  if (opts.full) {
    const scale = size / 82;
    drawAvatar(new CanvasPainter(ctx), a, size / 2, size - 3 * scale, scale, { phase: 0.25, dancing: false, walking: false, arms: 'down', headphones: opts.headphones });
  } else {
    const scale = size / 50;
    drawAvatar(new CanvasPainter(ctx), a, size / 2, size * 1.68, scale, { phase: 0.25, dancing: false, walking: false, arms: 'down', headphones: opts.headphones });
  }
  return c;
}

/** Catalogue thumbnail: the real in-game furniture art drawn on a canvas. */
export function furnitureThumb(def: FurnitureDef, size = 72): HTMLCanvasElement {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = size * dpr;
  c.height = size * dpr;
  c.style.width = `${size}px`;
  c.style.height = `${size}px`;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const cfg = { tileW: 40, tileH: 20 };
  const span = def.w + def.h;
  const k = Math.min(1.4, 2.4 / span);
  ctx.scale(dpr * k, dpr * k);
  // centre the footprint: footprint centre in iso space
  const cx = ((def.w - def.h) * cfg.tileW) / 4;
  const cy = ((def.w + def.h) * cfg.tileH) / 4;
  ctx.translate(size / (2 * k) - cx, size / (2 * k) - cy + Math.min(def.art.height, 40) * 0.45);
  drawFurniture(new CanvasGfx(ctx), def, 0, 0, def.w, def.h, cfg, { pulse: 0.8 });
  return c;
}
