import { describe, expect, it } from 'vitest';
import { depthFor, gridToScreen, screenToGrid, screenToGridFloat } from '../../src/render/isoProjection';

describe('iso projection', () => {
  it('maps origin and axes as a 2:1 diamond', () => {
    expect(gridToScreen(0, 0)).toEqual({ x: 0, y: 0 });
    expect(gridToScreen(1, 0)).toEqual({ x: 32, y: 16 });
    expect(gridToScreen(0, 1)).toEqual({ x: -32, y: 16 });
  });

  it('round-trips continuous coordinates', () => {
    for (let c = -3; c < 15; c += 0.37) {
      for (let r = -2; r < 15; r += 0.41) {
        const s = gridToScreen(c, r);
        const back = screenToGridFloat(s.x, s.y);
        expect(back.col).toBeCloseTo(c, 9);
        expect(back.row).toBeCloseTo(r, 9);
      }
    }
  });

  it('picks the right tile at every tile centre and near all four corners', () => {
    const eps = 0.02;
    for (let c = 0; c < 12; c++) {
      for (let r = 0; r < 12; r++) {
        for (const [dc, dr] of [[0.5, 0.5], [eps, eps], [1 - eps, eps], [eps, 1 - eps], [1 - eps, 1 - eps]]) {
          const s = gridToScreen(c + dc, r + dr);
          expect(screenToGrid(s.x, s.y)).toEqual({ col: c, row: r });
        }
      }
    }
  });

  it('respects custom tile sizes', () => {
    const cfg = { tileW: 100, tileH: 60 };
    const s = gridToScreen(3.25, 7.5, cfg);
    const back = screenToGridFloat(s.x, s.y, cfg);
    expect(back.col).toBeCloseTo(3.25);
    expect(back.row).toBeCloseTo(7.5);
  });

  it('sorts objects nearer the viewer later', () => {
    expect(depthFor(2, 2)).toBeGreaterThan(depthFor(1, 1));
    expect(depthFor(0, 5, 2, 1)).toBeGreaterThan(depthFor(0, 4, 1, 1));
  });
});
