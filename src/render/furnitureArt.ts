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

function drawBooth(g: G, def: FurnitureDef, col: number, row: number, w: number, h: number, cfg: IsoConfig, A: number, pulse: number, z0: number, top: number, side: number): void {
  const H = def.art.height;
  const upZ = (p: Pt, z: number): Pt => ({ x: p.x, y: p.y - z });
  drawPrism(g, col, row, w, h, z0, H, top, side, cfg, A);
  const f = faces(col, row, w, h, z0, H, cfg);
  // neon strip across both front faces
  g.lineStyle(2.5, def.art.glow ?? 0x00e5ff, (0.6 + 0.4 * pulse) * A);
  g.lineBetween(f.left(0, 0.55).x, f.left(0, 0.55).y, f.left(1, 0.55).x, f.left(1, 0.55).y);
  g.lineBetween(f.right(0, 0.55).x, f.right(0, 0.55).y, f.right(1, 0.55).x, f.right(1, 0.55).y);
  // mixer in the middle, turntables either side
  const along = w >= h;
  const at = (t: number) => upZ(gridToScreen(col + (along ? w * t : w / 2), row + (along ? h / 2 : h * t), cfg), z0);
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
      drawBooth(g, def, col, row, w, h, cfg, A, pulse, 0, top, side);
      break;
    }
    case 'podium': {
      // raised stage with a glowing lip, booth on top (S10 podium booths)
      drawPrism(g, col - 0.08, row - 0.08, w + 0.16, h + 0.16, 0, 12, 0x3a3d47, 0x1d1f26, cfg, A);
      const lip = corners(col - 0.08, row - 0.08, w + 0.16, h + 0.16, cfg).map((p) => up(p, 12));
      g.lineStyle(2, def.art.glow ?? 0x7df9ff, (0.5 + 0.5 * pulse) * A);
      g.strokePoints(lip, true);
      drawBooth(g, def, col, row, w, h, cfg, A, pulse, 12, top, side);
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
    case 'tank': {
      // steel drink keg with a purple level window (matches the HUD drink tube)
      g.fillStyle(0x000000, 0.25 * A);
      g.fillEllipse(centre.x, centre.y, 30, 13);
      g.fillStyle(side, A);
      g.fillRect(centre.x - 12, centre.y - H, 24, H);
      g.fillEllipse(centre.x, centre.y, 24, 10);
      g.fillStyle(top, A);
      g.fillEllipse(centre.x, centre.y - H, 24, 10);
      g.lineStyle(1.2, OUT, 0.7 * A);
      g.strokeEllipse(centre.x, centre.y - H, 24, 10);
      g.lineBetween(centre.x - 12, centre.y - H, centre.x - 12, centre.y);
      g.lineBetween(centre.x + 12, centre.y - H, centre.x + 12, centre.y);
      g.fillStyle(shade(side, 0.8), A);
      g.fillRect(centre.x - 12, centre.y - H * 0.7, 24, 2);
      g.fillRect(centre.x - 12, centre.y - H * 0.3, 24, 2);
      g.fillStyle(def.art.glow ?? 0xb04cff, (0.7 + 0.3 * pulse) * A);
      g.fillRect(centre.x - 3, centre.y - H * 0.65, 6, H * 0.4);
      g.fillStyle(0xffffff, 0.35 * A);
      g.fillRect(centre.x - 9, centre.y - H + 4, 3, H - 8);
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
    case 'diamondtile': {
      // white light tile with an orange diamond inlay (S10 patterned floors)
      drawPrism(g, col, row, w, h, 0, H, shade(top, 0.85), side, cfg, A);
      const T = corners(col, row, w, h, cfg).map((p) => up(p, H));
      g.fillStyle(top, A);
      g.fillPoints(corners(col + 0.04, row + 0.04, w - 0.08, h - 0.08, cfg).map((p) => up(p, H)), true);
      const mid = (p: Pt, q: Pt) => lerp(p, q, 0.5);
      const glow = def.art.glow ?? 0xff9a2e;
      g.fillStyle(glow, (0.55 + 0.45 * pulse) * A);
      g.fillPoints([mid(T[0], T[1]), mid(T[1], T[2]), mid(T[2], T[3]), mid(T[3], T[0])], true);
      g.fillStyle(shade(glow, 1.5), (0.4 + 0.5 * pulse) * A);
      g.fillPoints(corners(col + 0.38, row + 0.38, w - 0.76, h - 0.76, cfg).map((p) => up(p, H)), true);
      g.lineStyle(1, shade(side, 0.8), 0.8 * A);
      g.strokePoints(T, true);
      break;
    }
    case 'rope': {
      // two chrome stanchions with a sagging red velvet rope
      const along = w >= h;
      const at = (t: number) => gridToScreen(col + (along ? w * t : w / 2), row + (along ? h / 2 : h * t), cfg);
      const posts = [at(0.2), at(0.8)];
      g.lineStyle(3, def.art.glow ?? 0xc0102a, A);
      const p0 = up(posts[0], H - 4);
      const p1 = up(posts[1], H - 4);
      const sag = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 + 9 };
      const curve: Pt[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        curve.push({ x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * sag.x + t * t * p1.x, y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * sag.y + t * t * p1.y });
      }
      g.strokePoints(curve, false);
      for (const p of posts) {
        g.fillStyle(0x000000, 0.25 * A);
        g.fillEllipse(p.x, p.y, 16, 7);
        g.fillStyle(side, A);
        g.fillEllipse(p.x, p.y - 1, 13, 6);
        g.fillStyle(top, A);
        g.fillRect(p.x - 2, p.y - H, 4, H);
        g.fillStyle(0xffffff, 0.7 * A);
        g.fillRect(p.x - 1, p.y - H, 1, H);
        g.fillStyle(0xffd23f, A);
        g.fillCircle(p.x, p.y - H - 2, 3.5);
      }
      break;
    }
    case 'statue': {
      // gold dancer on a marble plinth, arms raised
      drawPrism(g, col + 0.22, row + 0.22, 0.56, 0.56, 0, 12, 0xf2f2f2, 0xc8ccd4, cfg, A);
      const b = up(centre, 12);
      const sway = (pulse - 0.5) * 2;
      g.fillStyle(side, A);
      g.fillPoints([{ x: b.x - 5, y: b.y }, { x: b.x - 1, y: b.y - 16 }, { x: b.x + 1, y: b.y - 16 }, { x: b.x + 6, y: b.y }], true);
      g.fillStyle(top, A);
      g.fillPoints([{ x: b.x - 5, y: b.y - 15 }, { x: b.x + 5, y: b.y - 15 }, { x: b.x + 4, y: b.y - 28 }, { x: b.x - 4, y: b.y - 28 }], true);
      g.lineStyle(3, top, A);
      g.lineBetween(b.x - 4, b.y - 27, b.x - 9 + sway, b.y - 38);
      g.lineBetween(b.x + 4, b.y - 27, b.x + 8 + sway, b.y - 36);
      g.fillCircle(b.x, b.y - 33, 5);
      g.fillStyle(0xffffff, 0.55 * A);
      g.fillRect(b.x - 3, b.y - 26, 1.5, 9);
      g.fillCircle(b.x - 2, b.y - 35, 1.5);
      break;
    }
    case 'gogo': {
      // glass tube on a lit base with a dancer inside (S10)
      const r = 13;
      const base = 8;
      const tubeH = H - base - 6;
      g.fillStyle(0x000000, 0.3 * A);
      g.fillEllipse(centre.x, centre.y, 36, 16);
      g.fillStyle(side, A);
      g.fillRect(centre.x - r - 3, centre.y - base, (r + 3) * 2, base);
      g.fillEllipse(centre.x, centre.y, (r + 3) * 2, 12);
      g.fillStyle(def.art.glow ?? 0x00e5ff, (0.5 + 0.5 * pulse) * A);
      g.fillEllipse(centre.x, centre.y - base, (r + 3) * 2, 12);
      const fb = { x: centre.x, y: centre.y - base };
      const sw = (pulse - 0.5) * 4;
      g.fillStyle(0x8a5a3c, A);
      g.lineStyle(2.5, 0x8a5a3c, A);
      g.lineBetween(fb.x - 2, fb.y - 2, fb.x - 3 - sw, fb.y - 14);
      g.lineBetween(fb.x + 2, fb.y - 2, fb.x + 3 - sw, fb.y - 14);
      g.fillStyle(0xff3df2, A);
      g.fillRect(fb.x - 5 + sw * 0.5, fb.y - 26, 10, 13);
      g.lineStyle(2, 0x8a5a3c, A);
      g.lineBetween(fb.x - 4 + sw * 0.5, fb.y - 24, fb.x - 9 + sw, fb.y - 34);
      g.lineBetween(fb.x + 4 + sw * 0.5, fb.y - 24, fb.x + 9 + sw, fb.y - 33);
      g.fillCircle(fb.x + sw * 0.5, fb.y - 31, 4.5);
      g.fillStyle(0x1b1b1b, A);
      g.fillEllipse(fb.x + sw * 0.5, fb.y - 34, 10, 6);
      g.fillStyle(top, 0.22 * A);
      g.fillRect(centre.x - r, centre.y - base - tubeH, r * 2, tubeH);
      g.fillStyle(0xffffff, 0.45 * A);
      g.fillRect(centre.x - r + 3, centre.y - base - tubeH + 4, 2.5, tubeH - 8);
      g.fillRect(centre.x + r - 6, centre.y - base - tubeH + 6, 1.5, tubeH - 14);
      g.lineStyle(1.2, shade(top, 0.7), 0.9 * A);
      g.lineBetween(centre.x - r, centre.y - base, centre.x - r, centre.y - base - tubeH);
      g.lineBetween(centre.x + r, centre.y - base, centre.x + r, centre.y - base - tubeH);
      g.fillStyle(side, A);
      g.fillEllipse(centre.x, centre.y - base - tubeH, (r + 2) * 2, 10);
      g.fillStyle(def.art.glow ?? 0x00e5ff, (0.4 + 0.6 * pulse) * A);
      g.fillEllipse(centre.x, centre.y - base - tubeH + 1, r * 2 - 4, 5);
      break;
    }
    case 'aquarium': {
      // tall glass tank with swimming fish (S10 aquarium wall)
      drawPrism(g, col + 0.1, row + 0.3, w - 0.2, h - 0.6, 0, 8, side, shade(side, 0.8), cfg, A);
      const f = faces(col + 0.1, row + 0.3, w - 0.2, h - 0.6, 8, H - 12, cfg);
      const face = (u0: number, u1: number, v0: number, v1: number, which: 'left' | 'right') => [f[which](u0, v0), f[which](u1, v0), f[which](u1, v1), f[which](u0, v1)];
      g.fillStyle(top, 0.85 * A);
      g.fillPoints(face(0, 1, 0, 1, 'left'), true);
      g.fillStyle(shade(top, 0.8), 0.85 * A);
      g.fillPoints(face(0, 1, 0, 1, 'right'), true);
      const t = Date.now() / 1000;
      const fish: [number, number, number][] = [[0.15, 0.7, 0xff8a00], [0.55, 0.45, 0xffd23f], [0.3, 0.25, 0xff3df2], [0.75, 0.62, 0x7df9ff]];
      fish.forEach(([u, v, c], i) => {
        const uu = (u + ((t * (0.05 + i * 0.015)) % 1)) % 1;
        const p = f.left(0.08 + uu * 0.84, v);
        g.fillStyle(c, A);
        g.fillEllipse(p.x, p.y, 7, 4);
        g.fillTriangle(p.x - 3.5, p.y, p.x - 7, p.y - 2.5, p.x - 7, p.y + 2.5);
      });
      g.fillStyle(0x2fa84f, 0.9 * A);
      for (const u of [0.1, 0.42, 0.85]) {
        const p = f.left(u, 0);
        g.fillTriangle(p.x - 3, p.y, p.x + 3, p.y, p.x, p.y - 14);
      }
      g.fillStyle(0xffffff, 0.3 * A);
      g.fillPoints(face(0.05, 0.12, 0.1, 0.9, 'left'), true);
      g.fillStyle(def.art.glow ?? 0x7df9ff, (0.25 + 0.3 * pulse) * A);
      g.fillPoints(face(0, 1, 0.9, 1, 'left'), true);
      g.lineStyle(2, side, A);
      g.strokePoints(face(0, 1, 0, 1, 'left'), true);
      g.strokePoints(face(0, 1, 0, 1, 'right'), true);
      break;
    }
    case 'fountain': {
      // stone pool, rippling water, floating rose petals, centre spout (S10)
      drawPrism(g, col + 0.05, row + 0.05, w - 0.1, h - 0.1, 0, H, side, shade(side, 0.75), cfg, A);
      const water = corners(col + 0.2, row + 0.2, w - 0.4, h - 0.4, cfg).map((p) => up(p, H));
      g.fillStyle(top, A);
      g.fillPoints(water, true);
      const t = Date.now() / 1000;
      g.lineStyle(1, 0xffffff, 0.5 * A);
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.6 + k / 3) % 1;
        g.strokeEllipse(centre.x, centre.y - H, 14 + ph * 40, (14 + ph * 40) / 2);
      }
      g.fillStyle(def.art.glow ?? 0xe0102a, A);
      for (const [u, v] of [[0.3, 0.35], [0.65, 0.3], [0.4, 0.7], [0.72, 0.62], [0.25, 0.55], [0.55, 0.8]] as const) {
        const p = up(gridToScreen(col + w * u, row + h * v, cfg), H);
        g.fillEllipse(p.x + Math.sin(t + u * 9) * 1.5, p.y, 5, 3);
      }
      g.fillStyle(0xf2f2f2, A);
      g.fillRect(centre.x - 3, centre.y - H - 14, 6, 14);
      g.fillStyle(0xbff6ff, (0.6 + 0.4 * pulse) * A);
      g.fillEllipse(centre.x, centre.y - H - 18, 10 + pulse * 4, 6);
      break;
    }
    case 'buddha': {
      // seated, round, gold, on a red cushion (S10)
      g.fillStyle(0x000000, 0.25 * A);
      g.fillEllipse(centre.x, centre.y, 40, 17);
      g.fillStyle(0xc0102a, A);
      g.fillEllipse(centre.x, centre.y - 4, 38, 15);
      g.fillStyle(0x8a0a1d, A);
      g.fillRect(centre.x - 19, centre.y - 4, 38, 4);
      const b = { x: centre.x, y: centre.y - 8 };
      g.fillStyle(side, A);
      g.fillEllipse(b.x, b.y - 3, 34, 14);
      g.fillStyle(top, A);
      g.fillEllipse(b.x, b.y - 15, 28, 26);
      g.fillStyle(shade(top, 1.15), A);
      g.fillEllipse(b.x, b.y - 12, 14, 12);
      g.fillStyle(top, A);
      g.fillCircle(b.x, b.y - 33, 9);
      g.fillStyle(side, A);
      g.fillCircle(b.x - 9, b.y - 31, 3);
      g.fillCircle(b.x + 9, b.y - 31, 3);
      g.lineStyle(1.4, side, A);
      g.lineBetween(b.x - 4, b.y - 34, b.x - 1.5, b.y - 34);
      g.lineBetween(b.x + 1.5, b.y - 34, b.x + 4, b.y - 34);
      g.strokeEllipse(b.x, b.y - 29, 5, 2);
      g.fillStyle(0xffffff, 0.5 * A);
      g.fillCircle(b.x - 4, b.y - 37, 2);
      g.fillEllipse(b.x - 7, b.y - 20, 4, 8);
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
