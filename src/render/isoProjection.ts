/**
 * Isometric projection. A classic 2:1 diamond is the INFERRED starting hypothesis;
 * tile size is configurable so it can be tuned against reference screenshots.
 *
 * World/grid space: (col, row), continuous. Screen space: pixels relative to the
 * room origin (the top corner of cell 0,0). Cols run down-right, rows down-left.
 */
export interface IsoConfig {
  tileW: number;
  tileH: number;
}

/** PROPOSED tile size, pending screenshot measurement. */
export const DEFAULT_ISO: IsoConfig = { tileW: 64, tileH: 32 };

export function gridToScreen(col: number, row: number, cfg: IsoConfig = DEFAULT_ISO): { x: number; y: number } {
  return { x: (col - row) * (cfg.tileW / 2), y: (col + row) * (cfg.tileH / 2) };
}

/** Inverse projection: continuous grid coordinates. */
export function screenToGridFloat(x: number, y: number, cfg: IsoConfig = DEFAULT_ISO): { col: number; row: number } {
  const a = x / (cfg.tileW / 2);
  const b = y / (cfg.tileH / 2);
  return { col: (a + b) / 2, row: (b - a) / 2 };
}

/** The tile containing a screen point. */
export function screenToGrid(x: number, y: number, cfg: IsoConfig = DEFAULT_ISO): { col: number; row: number } {
  const f = screenToGridFloat(x, y, cfg);
  return { col: Math.floor(f.col), row: Math.floor(f.row) };
}

/** Painter's-order depth for an object whose footprint's far-front corner is (col+w, row+h). */
export function depthFor(col: number, row: number, w = 1, h = 1): number {
  return (col + w) + (row + h);
}
