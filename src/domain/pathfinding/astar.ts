import { cellKey, inBounds } from '../grid';
import type { GridPoint } from '../types';

/**
 * 4-directional A* on the tile grid. Returns the path excluding the start cell,
 * or null when unreachable. The start cell is always allowed (a guest may be
 * standing where furniture was just placed). `maxNodes` bounds the search cost.
 */
export function findPath(
  room: { cols: number; rows: number },
  blocked: Set<string>,
  start: GridPoint,
  goal: GridPoint,
  maxNodes = 4000,
): GridPoint[] | null {
  if (!inBounds(room, goal) || blocked.has(cellKey(goal.col, goal.row))) return null;
  if (start.col === goal.col && start.row === goal.row) return [];
  const h = (p: GridPoint) => Math.abs(p.col - goal.col) + Math.abs(p.row - goal.row);
  const startK = cellKey(start.col, start.row);
  const open: { p: GridPoint; f: number; g: number }[] = [{ p: start, f: h(start), g: 0 }];
  const came = new Map<string, string>();
  const gScore = new Map<string, number>([[startK, 0]]);
  const closed = new Set<string>();
  let expanded = 0;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = cellKey(cur.p.col, cur.p.row);
    if (closed.has(ck)) continue;
    if (cur.p.col === goal.col && cur.p.row === goal.row) {
      const path: GridPoint[] = [];
      let k: string | undefined = ck;
      while (k && k !== startK) {
        const [c, r] = k.split(',').map(Number);
        path.push({ col: c, row: r });
        k = came.get(k);
      }
      return path.reverse();
    }
    closed.add(ck);
    if (++expanded > maxNodes) return null;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { col: cur.p.col + dc, row: cur.p.row + dr };
      const nk = cellKey(n.col, n.row);
      if (!inBounds(room, n) || blocked.has(nk) || closed.has(nk)) continue;
      const g = cur.g + 1;
      if (g < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, g);
        came.set(nk, ck);
        open.push({ p: n, f: g + h(n), g });
      }
    }
  }
  return null;
}
