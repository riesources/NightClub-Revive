import type Phaser from 'phaser';
import type { FurnitureDef } from '../data/furnitureCatalog';
import { gridToScreen, type IsoConfig } from './isoProjection';
import { shade } from './painter';

/**
 * REPLACEMENT ART: furniture is drawn as procedural isometric prisms with a few
 * kind-specific details. This is placeholder-grade art, not original sprites.
 * Coordinates are relative to the room origin.
 */
export interface PrismOpts {
  alpha?: number;
  tint?: number;
  pulse?: number;
}

type Pt = { x: number; y: number };

function corners(col: number, row: number, w: number, h: number, cfg: IsoConfig): [Pt, Pt, Pt, Pt] {
  return [gridToScreen(col, row, cfg), gridToScreen(col + w, row, cfg), gridToScreen(col + w, row + h, cfg), gridToScreen(col, row + h, cfg)];
}

const up = (p: Pt, z: number): Pt => ({ x: p.x, y: p.y - z });

export function drawPrism(
  g: Phaser.GameObjects.Graphics,
  col: number,
  row: number,
  w: number,
  h: number,
  z0: number,
  height: number,
  top: number,
  side: number,
  cfg: IsoConfig,
  alpha = 1,
): void {
  const [a, b, c, d] = corners(col, row, w, h, cfg).map((p) => up(p, z0)) as [Pt, Pt, Pt, Pt];
  // left face (d-c edge), right face (b-c edge)
  g.fillStyle(shade(side, 0.8), alpha);
  g.fillPoints([d, c, up(c, height), up(d, height)], true);
  g.fillStyle(side, alpha);
  g.fillPoints([b, c, up(c, height), up(b, height)], true);
  g.fillStyle(top, alpha);
  g.fillPoints([up(a, height), up(b, height), up(c, height), up(d, height)], true);
  g.lineStyle(1, 0x000000, 0.45 * alpha);
  g.strokePoints([up(a, height), up(b, height), up(c, height), up(d, height)], true);
  g.strokePoints([d, c, b], false);
  g.lineBetween(c.x, c.y, c.x, c.y - height);
}

export function drawFurniture(
  g: Phaser.GameObjects.Graphics,
  def: FurnitureDef,
  col: number,
  row: number,
  w: number,
  h: number,
  cfg: IsoConfig,
  opts: PrismOpts = {},
): void {
  const alpha = opts.alpha ?? 1;
  const top = opts.tint ?? def.art.top;
  const side = opts.tint ? shade(opts.tint, 0.6) : def.art.side;
  const H = def.art.height;
  const centre = gridToScreen(col + w / 2, row + h / 2, cfg);

  switch (def.kind) {
    case 'dancefloor': {
      drawPrism(g, col, row, w, h, 0, H, top, side, cfg, alpha);
      const pulse = opts.pulse ?? 0.5;
      const inset = 0.18;
      const [a, b, c, d] = corners(col + inset, row + inset, w - 2 * inset, h - 2 * inset, cfg).map((p) => up(p, H));
      g.fillStyle(def.art.glow ?? 0xffffff, (0.25 + 0.5 * pulse) * alpha);
      g.fillPoints([a, b, c, d], true);
      break;
    }
    case 'seat': {
      // seat base + backrest along the back (row) edge
      drawPrism(g, col, row, w, h, 0, H * 0.6, top, side, cfg, alpha);
      drawPrism(g, col, row, w, Math.min(0.3, h), H * 0.6, H * 0.9, shade(top, 1.15), side, cfg, alpha);
      if (def.id === 'stool_basic') {
        g.fillStyle(0xcccccc, alpha);
        g.fillEllipse(centre.x, centre.y - H * 0.6, 18, 8);
      }
      break;
    }
    case 'bar': {
      drawPrism(g, col, row, w, h, 0, H, top, side, cfg, alpha);
      // counter top + bottles
      const colors = [0x3ddc84, 0xffd23f, 0xff6b3d, 0x7df9ff, 0xb04cff];
      const n = (w + h) * 2;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const p = gridToScreen(col + (w === 1 ? 0.5 : w * t), row + (h === 1 ? 0.5 : h * t), cfg);
        g.fillStyle(colors[i % colors.length], alpha);
        g.fillRect(p.x - 2, p.y - H - 12, 4, 10);
        g.fillRect(p.x - 1, p.y - H - 15, 2, 4);
      }
      if (def.art.glow) {
        g.lineStyle(2, def.art.glow, 0.8 * alpha);
        const [, b, c, d] = corners(col, row, w, h, cfg);
        g.strokePoints([up(d, 6), up(c, 6), up(b, 6)], false);
      }
      break;
    }
    case 'dj': {
      drawPrism(g, col, row, w, h, 0, H, top, side, cfg, alpha);
      // turntables
      for (const f of [0.28, 0.72]) {
        const p = gridToScreen(col + w * f, row + h * 0.5, cfg);
        g.fillStyle(0x0b0b0f, alpha);
        g.fillEllipse(p.x, p.y - H, 18, 9);
        g.fillStyle(def.art.glow ?? 0x00e5ff, (0.5 + 0.5 * (opts.pulse ?? 0.5)) * alpha);
        g.fillEllipse(p.x, p.y - H, 6, 3);
      }
      g.lineStyle(2, def.art.glow ?? 0x00e5ff, 0.9 * alpha);
      const [, b, c, d] = corners(col, row, w, h, cfg);
      g.strokePoints([up(d, H * 0.5), up(c, H * 0.5), up(b, H * 0.5)], false);
      break;
    }
    case 'speaker': {
      drawPrism(g, col + 0.15, row + 0.15, w - 0.3, h - 0.3, 0, H, top, side, cfg, alpha);
      const p = gridToScreen(col + w - 0.15, row + h / 2, cfg);
      g.fillStyle(0x50535e, alpha);
      g.fillEllipse(p.x - 6, p.y - H * 0.65, 10, 12);
      g.fillEllipse(p.x - 6, p.y - H * 0.28, 8, 9);
      break;
    }
    case 'decor': {
      if (def.id === 'plant_palm') {
        drawPrism(g, col + 0.25, row + 0.25, 0.5, 0.5, 0, 12, 0x8a5a3c, 0x5a3520, cfg, alpha);
        g.fillStyle(def.art.top, alpha);
        for (const [dx, dy, r] of [[0, -30, 10], [-9, -24, 8], [9, -24, 8], [-5, -36, 7], [6, -36, 7]] as const) g.fillCircle(centre.x + dx, centre.y + dy, r);
      } else {
        drawPrism(g, col + 0.3, row + 0.3, 0.4, 0.4, 0, H, top, side, cfg, alpha);
        const pulse = opts.pulse ?? 0.5;
        g.fillStyle(def.art.glow ?? top, (0.15 + 0.35 * pulse) * alpha);
        g.fillCircle(centre.x, centre.y - H - 4, 10 + pulse * 6);
      }
      break;
    }
  }
}

/** A flat diamond outline/fill for one or more tiles. */
export function drawTileDiamond(g: Phaser.GameObjects.Graphics, col: number, row: number, w: number, h: number, cfg: IsoConfig, fill: number | null, fillAlpha: number, line: number | null, lineAlpha = 1): void {
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
