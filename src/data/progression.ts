/**
 * Level curve: cumulative XP needed for each level (index = level).
 * Players start at level 0 and reach level 1 almost immediately; the original
 * level-up screen reads "YOU REACHED LEVEL 1! Radiophonic Rookie - $500 more to
 * spend! Congratulations! Your club's open for business!" (Pixnet screenshot,
 * CONFIRMED). All other thresholds, titles and rewards are PROPOSED.
 */
export const LEVEL_XP: readonly number[] = [
  0, 30, 1500, 4000, 8000, 14000, 22000, 32000, 45000, 60000, 80000, 105000, 135000, 170000, 210000,
  // Levels 15-21: the Workers panel shows slots unlocking at 17 and 21, so the
  // original went at least that far (CONFIRMED). Thresholds PROPOSED.
  255000, 305000, 360000, 420000, 485000, 555000, 630000,
];

export const LEVEL_TITLES: readonly string[] = [
  'Opening Night',
  'Radiophonic Rookie', // CONFIRMED
  'Turntable Tinkerer',
  'Beat Dropper',
  'Groove Merchant',
  'Velvet Roper',
  'Bass Baron',
  'Neon Night Owl',
  'Floor Filler',
  'Headliner',
  'Club Mogul',
  'Afterparty Legend',
  'Mixmaster',
  'Nightlife Icon',
  'City Superstar',
  'Platinum Spinner',
  'Main Stage Maestro',
  'Velvet Empire',
  'Sound System Sultan',
  'Downtown Dynasty',
  'World Tour Titan',
  'Nightclub Legend',
];

/** Cash awarded on reaching a level. Level 1 = $500 is CONFIRMED; the rest PROPOSED. */
export function levelReward(level: number): number {
  return level === 1 ? 500 : 250 * level;
}

/** PROPOSED: room size unlocked at each level (GameYum: the club expands on level-up). */
export const ROOM_SIZE_BY_LEVEL: readonly { cols: number; rows: number }[] = [
  { cols: 10, rows: 10 },
  { cols: 10, rows: 10 },
  { cols: 11, rows: 11 },
  { cols: 12, rows: 12 },
  { cols: 13, rows: 13 },
  { cols: 14, rows: 14 },
  { cols: 15, rows: 15 },
  { cols: 16, rows: 16 },
];

/** Worker slots unlock at these levels (Workers panel screenshot, CONFIRMED: 2 open, then 9, 13, 17, 21). */
export const WORKER_SLOT_LEVELS: readonly number[] = [0, 0, 9, 13, 17, 21];

export const MAX_LEVEL = LEVEL_XP.length - 1;
