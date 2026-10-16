import type { IsoGfx } from './canvasGraphics';
import type { FurnitureDef } from '../data/furnitureCatalog';
import { gridToScreen, type IsoConfig } from './isoProjection';
import { shade } from './painter';

/**
 * REPLACEMENT ART: furniture drawn procedurally in an isometric style modelled
 * on the reference screenshots (glossy light tiles, tall black tower speakers,
 * orange-and-blue bar, chrome stools...). Not original sprites.
 * Coordinates are relative to the room origin.
 */
export interface DrawOpts {
  alpha?: number;
  tint?: number;
  pulse?: number;
}

type G = IsoGfx;
type Pt = { x: number; y: number };

const OUT = 0x101014;

function corners(col: number, row: number, w: number, h: number, cfg: IsoConfig): [Pt, Pt, Pt, Pt] {
  return [gridToScreen(col, row, cfg), gridToScreen(col + w, row, cfg), gridToScreen(col + w, row + h, cfg), gridToScreen(col, row + h, cfg)];
}

const up = (p: Pt, z: number): Pt => ({ x: p.x, y: p.y - z });
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Box with top colour, two shaded side faces and a dark outline. */
export function drawPrism(g: G, col: number, row: number, w: number, h: number, z0: number, height: number, top: number, side: number, cfg: IsoConfig, alpha = 1, outline = true): void {
  const [a, b, c, d] = corners(col, row, w, h, cfg).map((p) => up(p, z0)) as [Pt, Pt, Pt, Pt];
  g.fillStyle(shade(side, 0.78), alpha);
  g.fillPoints([d, c, up(c, height), up(d, height)], true);
  g.fillStyle(side, alpha);
  g.fillPoints([b, c, up(c, height), up(b, height)], true);
  g.fillStyle(top, alpha);
  g.fillPoints([up(a, height), up(b, height), up(c, height), up(d, height)], true);
  if (outline) {
    g.lineStyle(1.2, OUT, 0.7 * alpha);
    g.strokePoints([up(a, height), up(b, height), up(c, height), up(d, height)], true);
    g.strokePoints([up(d, height), d, c, b, up(b, height)], false);
    g.lineBetween(c.x, c.y, c.x, c.y - height);
  }
}

/** Front faces of a box as quads, for painting details onto. */
function faces(col: number, row: number, w: number, h: number, z0: number, height: number, cfg: IsoConfig) {
  const [, b, c, d] = corners(col, row, w, h, cfg).map((p) => up(p, z0));
  return {
    // left-front face runs d -> c, right-front face runs c -> b
    left: (u: number, v: number) => lerp(up(d, v * height), up(c, v * height), u),
    right: (u: number, v: number) => lerp(up(c, v * height), up(b, v * height), u),
  };
}

export function drawFurniture(g: G, def: FurnitureDef, col: number, row: number, w: number, h: number, cfg: IsoConfig, opts: DrawOpts = {}): void {
  const A = opts.alpha ?? 1;
  const top = opts.tint ?? def.art.top;
  const side = opts.tint ? shade(opts.tint, 0.6) : def.art.side;
  const H = def.art.height;
  const centre = gridToScreen(col + w / 2, row + h / 2, cfg);
  const pulse = opts.pulse ?? 0.5;

  switch (def.art.style) {
    case 'tile': {
      drawPrism(g, col, row, w, h, 0, H, shade(top, 0.75), side, cfg, A);
      // glossy light square: nested diamonds brightening to a white-hot centre
      const steps: [number, number][] = [[0.06, 0.95], [0.16, 1.15], [0.28, 1.4], [0.38, 1.8]];
      for (const [inset, k] of steps) {
        const pts = corners(col + inset, row + inset, w - 2 * inset, h - 2 * inset, cfg).map((p) => up(p, H));
        g.fillStyle(shade(top, k), (0.55 + 0.45 * pulse) * A);
        g.fillPoints(pts, true);
      }
      g.fillStyle(def.art.glow ?? 0xffffff, (0.2 + 0.6 * pulse) * A);
      g.fillEllipse(centre.x, centre.y - H, 14, 7);
      g.lineStyle(1, shade(top, 0.5), 0.8 * A);
      g.strokePoints(corners(col, row, w, h, cfg).map((p) => up(p, H)), true);
      break;
    }
    case 'speaker': {
      const i = 0.14;
      drawPrism(g, col + i, row + i, w - 2 * i, h - 2 * i, 0, H, shade(top, 1.25), top, cfg, A);
      const f = faces(col + i, row + i, w - 2 * i, h - 2 * i, 0, H, cfg);
      const light = top > 0x808080;
      // woofers on the left-front face, tweeter above
      for (const [v, r] of [[0.28, 7], [0.62, 5.5]] as const) {
        const p = f.left(0.5, v);
        g.fillStyle(light ? 0xc8ced8 : 0x3a3d45, A);
        g.fillEllipse(p.x, p.y, r * 2.1, r * 2.4);
        g.fillStyle(light ? 0x8890a0 : 0x0c0c10, A);
        g.fillEllipse(p.x, p.y, r * 1.3, r * 1.5);
        g.fillStyle(0x6a6f7c, A);
        g.fillEllipse(p.x, p.y, r * 0.5, r * 0.6);
      }
      const tw = f.left(0.5, 0.86);
      g.fillStyle(0x6a6f7c, A);
      g.fillEllipse(tw.x, tw.y, 5, 5);
      // grille dots on the right face
      g.fillStyle(light ? 0xa0a8b6 : 0x2a2c33, A);
      for (let v = 0.15; v < 0.95; v += 0.12) for (let u = 0.2; u < 0.9; u += 0.2) {
        const p = f.right(u, v);
        g.fillRect(p.x - 0.6, p.y - 0.6, 1.2, 1.2);
      }
      break;
    }
    case 'djbooth': {
      drawPrism(g, col, row, w, h, 0, H, top, side, cfg, A);
      const f = faces(col, row, w, h, 0, H, cfg);
      // neon strip across both front faces
      g.lineStyle(2.5, def.art.glow ?? 0x00e5ff, (0.6 + 0.4 * pulse) * A);
      g.lineBetween(f.left(0, 0.55).x, f.left(0, 0.55).y, f.left(1, 0.55).x, f.left(1, 0.55).y);
      g.lineBetween(f.right(0, 0.55).x, f.right(0, 0.55).y, f.right(1, 0.55).x, f.right(1, 0.55).y);
      // mixer in the middle, turntables either side
      const along = w >= h;
      const at = (t: number) => gridToScreen(col + (along ? w * t : w / 2), row + (along ? h / 2 : h * t), cfg);
      for (const t of [0.22, 0.78]) {
        const p = at(t);
        g.fillStyle(0xc8ced8, A);
        g.fillEllipse(p.x, p.y - H - 1, 22, 12);
        g.fillStyle(0x111114, A);
        g.fillEllipse(p.x, p.y - H - 2, 17, 9);
        g.fillStyle(def.art.glow ?? 0x00e5ff, (0.5 + 0.5 * pulse) * A);
        g.fillEllipse(p.x, p.y - H - 2, 5, 2.6);
      }
      const m = at(0.5);
      g.fillStyle(0x9aa2b0, A);
      g.fillRect(m.x - 7, m.y - H - 7, 14, 7);
      g.fillStyle(0x1b1d22, A);
      g.fillRect(m.x - 6, m.y - H - 6, 12, 2);
      for (let k = 0; k < 4; k++) {
        g.fillStyle([0xff3d3d, 0x3ddc84, 0xffd23f, 0x00e5ff][k], A);
        g.fillRect(m.x - 5 + k * 3, m.y - H - 3, 1.6, 1.6);
      }
      break;
    }
    case 'bar': {
      // orange-wood front, blue (or chrome) top, bottles along the back edge
      drawPrism(g, col, row, w, h, 0, H, top, side, cfg, A);
      const f = faces(col, row, w, h, 0, H, cfg);
      g.lineStyle(1, shade(side, 0.7), 0.7 * A);
      for (const u of [0.25, 0.5, 0.75]) {
        g.lineBetween(f.left(u, 0.05).x, f.left(u, 0.05).y, f.left(u, 0.9).x, f.left(u, 0.9).y);
        g.lineBetween(f.right(u, 0.05).x, f.right(u, 0.05).y, f.right(u, 0.9).x, f.right(u, 0.9).y);
      }
      const colors = [0x3ddc84, 0xffd23f, 0xd23a3a, 0x7df9ff, 0xb04cff, 0xf2f2f2, 0x8a5a2b];
      const n = Math.max(w, h) * 5;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const p = gridToScreen(col + (w >= h ? w * t : 0.25), row + (w >= h ? 0.25 : h * t), cfg);
        g.fillStyle(OUT, A);
        g.fillRect(p.x - 2.6, p.y - H - 15, 5.2, 13);
        g.fillStyle(colors[i % colors.length], A);
        g.fillRect(p.x - 2, p.y - H - 14, 4, 11);
        g.fillRect(p.x - 1, p.y - H - 18, 2, 5);
        g.fillStyle(0xffffff, 0.5 * A);
        g.fillRect(p.x - 1.4, p.y - H - 12, 1, 6);
      }
      if (def.art.glow) {
        g.lineStyle(2, def.art.glow, (0.5 + 0.4 * pulse) * A);
        g.lineBetween(f.left(0, 0.08).x, f.left(0, 0.08).y, f.left(1, 0.08).x, f.left(1, 0.08).y);
        g.lineBetween(f.right(0, 0.08).x, f.right(0, 0.08).y, f.right(1, 0.08).x, f.right(1, 0.08).y);
      }
      break;
    }
    case 'stool': {
      g.fillStyle(0x000000, 0.25 * A);
      g.fillEllipse(centre.x, centre.y, 22, 10);
      g.fillStyle(0xb8c0cc, A);
      g.fillEllipse(centre.x, centre.y - 1, 16, 7);
      g.fillRect(centre.x - 1.6, centre.y - H, 3.2, H);
      g.lineStyle(1.2, OUT, 0.8 * A);
      g.strokeEllipse(centre.x, centre.y - H, 20, 10);
      g.fillStyle(side, A);
      g.fillEllipse(centre.x, centre.y - H + 1.5, 20, 10);
      g.fillStyle(top, A);
      g.fillEllipse(centre.x, centre.y - H - 1, 19, 9);
      g.fillStyle(0xffffff, 0.35 * A);
      g.fillEllipse(centre.x - 3, centre.y - H - 2.5, 7, 3);
      break;
    }
    case 'sofa':
    case 'sectional':
    case 'booth': {
      const seatH = H * 0.55;
      drawPrism(g, col + 0.05, row + 0.05, w - 0.1, h - 0.1, 0, seatH, top, side, cfg, A);
      // backrest along the back (row) edge and arm along the left (col) edge
      drawPrism(g, col + 0.05, row + 0.05, w - 0.1, 0.28, seatH, H * 0.85, shade(top, 1.12), side, cfg, A);
      drawPrism(g, col + 0.05, row + 0.33, 0.24, h - 0.38, seatH, H * 0.35, shade(top, 1.05), side, cfg, A);
      if (def.art.style === 'booth') drawPrism(g, col + w - 0.29, row + 0.33, 0.24, h - 0.38, seatH, H * 0.35, shade(top, 1.05), side, cfg, A);
      // cushion seams
      const [a, b] = corners(col, row, w, h, cfg);
      g.lineStyle(1, shade(top, 0.6), 0.6 * A);
      for (let k = 1; k < w; k++) {
        const p = lerp(a, b, k / w);
        const q = gridToScreen(col + k, row + h, cfg);
        g.lineBetween(p.x, p.y - seatH, q.x, q.y - seatH);
      }
      break;
    }
    case 'lounge': {
      // low chrome-framed lounge chair with sloped back
      g.lineStyle(2, 0xc8ced8, A);
      const l = gridToScreen(col + 0.2, row + 0.8, cfg);
      const r = gridToScreen(col + 0.8, row + 0.8, cfg);
      g.lineBetween(l.x, l.y, l.x + 2, l.y - 9);
      g.lineBetween(r.x, r.y, r.x - 2, r.y - 9);
      drawPrism(g, col + 0.12, row + 0.3, 0.76, 0.6, 7, 4, top, side, cfg, A);
      drawPrism(g, col + 0.12, row + 0.1, 0.76, 0.22, 9, 16, shade(top, 1.3), side, cfg, A);
      g.lineStyle(1, 0x55585f, 0.8 * A);
      const s0 = gridToScreen(col + 0.5, row + 0.35, cfg);
      g.lineBetween(s0.x - 8, s0.y - 18, s0.x + 8, s0.y - 18);
      break;
    }
    case 'eggchair': {
      g.fillStyle(0x000000, 0.25 * A);
      g.fillEllipse(centre.x, centre.y, 26, 11);
      g.fillStyle(0x8a8f99, A);
      g.fillRect(centre.x - 1.5, centre.y - 10, 3, 10);
      g.fillEllipse(centre.x, centre.y - 1, 14, 6);
      g.lineStyle(1.4, OUT, 0.8 * A);
      g.fillStyle(top, A);
      g.fillEllipse(centre.x, centre.y - 26, 30, 36);
      g.strokeEllipse(centre.x, centre.y - 26, 30, 36);
      g.lineStyle(1, side, 0.7 * A);
      for (let k = -12; k <= 12; k += 4) g.lineBetween(centre.x + k, centre.y - 42, centre.x + k * 0.7, centre.y - 10);
      g.fillStyle(0xff6b3d, A);
      g.fillEllipse(centre.x + 2, centre.y - 22, 20, 22);
      g.fillStyle(0xffffff, 0.25 * A);
      g.fillEllipse(centre.x - 4, centre.y - 34, 8, 5);
      break;
    }
    case 'plant': {
      drawPrism(g, col + 0.27, row + 0.27, 0.46, 0.46, 0, 13, 0xf2f2f2, 0xc8ccd4, cfg, A);
      g.fillStyle(def.art.side, A);
      for (const [dx, dy, r] of [[0, -31, 11], [-10, -25, 9], [10, -25, 9], [-6, -38, 8], [7, -38, 8], [0, -44, 6]] as const) g.fillCircle(centre.x + dx, centre.y + dy, r);
      g.fillStyle(def.art.top, A);
      for (const [dx, dy, r] of [[-2, -33, 7], [-10, -27, 5], [8, -27, 5], [-5, -40, 5], [5, -40, 5]] as const) g.fillCircle(centre.x + dx, centre.y + dy, r);
      break;
    }
    case 'pillar': {
      drawPrism(g, col + 0.3, row + 0.3, 0.4, 0.4, 0, H, top, side, cfg, A);
      g.fillStyle(def.art.glow ?? top, (0.15 + 0.35 * pulse) * A);
      g.fillCircle(centre.x, centre.y - H - 4, 10 + pulse * 6);
      g.fillStyle(0xffffff, 0.6 * A);
      g.fillCircle(centre.x, centre.y - H - 4, 3);
      break;
    }
  }
}

/** A flat diamond outline/fill for one or more tiles. */
export function drawTileDiamond(g: G, col: number, row: number, w: number, h: number, cfg: IsoConfig, fill: number | null, fillAlpha: number, line: number | null, lineAlpha = 1): void {
  const pts = corners(col, row, w, h, cfg);
  if (fill !== null) {
    g.fillStyle(fill, fillAlpha);
    g.fillPoints(pts, true);
  }
  if (line !== null) {
    g.lineStyle(2, line, lineAlpha);
    g.strokePoints(pts, true);
  }
}
