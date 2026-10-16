/**
 * PROPOSED level curve: cumulative XP needed to reach each level.
 * GameYum confirms the club expands automatically on level-up; the thresholds
 * and room sizes below are not historical values.
 */
export const LEVEL_XP: readonly number[] = [0, 0, 1500, 4000, 8000, 14000, 22000, 32000, 45000, 60000, 80000];

/** PROPOSED: room size (cols x rows) unlocked at each level. */
export const ROOM_SIZE_BY_LEVEL: readonly { cols: number; rows: number }[] = [
  { cols: 12, rows: 12 },
  { cols: 12, rows: 12 },
  { cols: 13, rows: 13 },
  { cols: 14, rows: 14 },
  { cols: 15, rows: 15 },
  { cols: 16, rows: 16 },
];

export const MAX_LEVEL = LEVEL_XP.length - 1;
