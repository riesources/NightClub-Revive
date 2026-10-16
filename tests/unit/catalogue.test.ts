import { describe, expect, it } from 'vitest';
import { FURNITURE } from '../../src/data/furnitureCatalog';
import { createNewClub } from '../../src/domain/club';
import { buyAndPlace } from '../../src/domain/economy';
import { blockedCells, footprintSize } from '../../src/domain/grid';
import { drawFurniture } from '../../src/render/furnitureArt';
import type { IsoGfx } from '../../src/render/canvasGraphics';
import { DEFAULT_ISO } from '../../src/render/isoProjection';

/** Counts draw calls and fails on any non-finite coordinate. */
function recorder() {
  let calls = 0;
  const check = (...n: unknown[]) => {
    for (const v of n.flat(2)) {
      const nums = typeof v === 'object' && v ? Object.values(v as object) : [v];
      for (const x of nums) if (typeof x === 'number' && !Number.isFinite(x)) throw new Error('non-finite coordinate');
    }
    calls++;
  };
  const g: IsoGfx = {
    fillStyle: () => undefined,
    lineStyle: () => undefined,
    fillPoints: (p) => check(p),
    strokePoints: (p) => check(p),
    lineBetween: (...a) => check(a),
    fillRect: (...a) => check(a),
    fillEllipse: (...a) => check(a),
    strokeEllipse: (...a) => check(a),
    fillCircle: (...a) => check(a),
    strokeCircle: (...a) => check(a),
    fillTriangle: (...a) => check(a),
  };
  return { g, calls: () => calls };
}

describe('furniture catalogue', () => {
  it('has unique ids, positive prices and luxury, and only floors are walkable', () => {
    expect(new Set(FURNITURE.map((f) => f.id)).size).toBe(FURNITURE.length);
    for (const f of FURNITURE) {
      expect(f.price).toBeGreaterThan(0);
      expect(f.luxury).toBeGreaterThan(0);
      expect(f.walkable).toBe(f.kind === 'dancefloor');
      if (f.kind === 'dj') expect(f.djSetMs).toBeGreaterThan(0);
    }
  });

  it('every item draws finite shapes in all four directions', () => {
    for (const f of FURNITURE) {
      for (const facing of [0, 1, 2, 3] as const) {
        const { w, h } = footprintSize(f.id, facing);
        const r = recorder();
        drawFurniture(r.g, f, 2, 3, w, h, DEFAULT_ISO, { pulse: 0.7, facing });
        expect(r.calls(), `${f.id} facing ${facing}`).toBeGreaterThan(2);
      }
    }
  });

  it('the video-inspired pack can be bought and placed, and blocks the right cells', () => {
    let s = { ...createNewClub(0), level: 10, cash: 1_000_000, room: { cols: 16, rows: 16 } };
    const pack: [string, number, number][] = [
      ['gogo_tube', 5, 6], ['statue_gold', 7, 6], ['aquarium_wall', 9, 6], ['fountain_petals', 5, 9], ['buddha_gold', 9, 9],
      ['rope_velvet', 11, 9], ['dj_podium', 12, 12], ['sofa_white', 2, 12], ['floor_diamond', 2, 9], ['floor_teal_glass', 3, 9],
    ];
    for (const [id, c, r] of pack) {
      const res = buyAndPlace(s, id, c, r);
      expect(res.ok, id).toBe(true);
      if (res.ok) s = res.state;
    }
    const blocked = blockedCells(s);
    for (const k of ['5,9', '6,9', '5,10', '6,10']) expect(blocked.has(k)).toBe(true); // 2x2 fountain
    expect(blocked.has('2,9')).toBe(false); // light tiles stay walkable
  });
});
