/**
 * Party types. Hosting parties is a feature of the original (blueprint brief;
 * the specific theme names in old descriptions are UNVERIFIED), so every party
 * here is ORIGINAL with PROPOSED numbers.
 */
export interface PartyDef {
  id: string;
  name: string;
  blurb: string;
  requiredLevel: number;
  cost: number;
  durationMs: number;
  /** Guests arrive this many times faster during the party. */
  rush: number;
  /** Cover charge multiplier during the party. */
  coverMultiplier: number;
  /** Guests that must arrive during the party to earn the rewards. */
  goalGuests: number;
  rewardCash: number;
  rewardPopularity: number;
  /** Colours of the sweeping party lights. */
  lights: number[];
}

export const PARTIES: readonly PartyDef[] = [
  { id: 'neon_night', name: 'Neon Night', blurb: 'Glow paint and good vibes.', requiredLevel: 1, cost: 500, durationMs: 180_000, rush: 2, coverMultiplier: 1, goalGuests: 15, rewardCash: 900, rewardPopularity: 10, lights: [0x00e5ff, 0xff3df2] },
  { id: 'retro_roller', name: 'Retro Roller Disco', blurb: 'Bring back the classics.', requiredLevel: 2, cost: 1500, durationMs: 240_000, rush: 2.5, coverMultiplier: 1.5, goalGuests: 25, rewardCash: 2800, rewardPopularity: 20, lights: [0xffd23f, 0xff6b3d, 0x9b59ff] },
  { id: 'velvet_vip', name: 'Velvet Rope VIP Night', blurb: 'Exclusive list, premium cover.', requiredLevel: 4, cost: 4000, durationMs: 300_000, rush: 2, coverMultiplier: 3, goalGuests: 30, rewardCash: 7000, rewardPopularity: 40, lights: [0xe0102a, 0xffd23f] },
  { id: 'foam_frenzy', name: 'Foam Frenzy', blurb: 'The whole city wants in.', requiredLevel: 6, cost: 9000, durationMs: 300_000, rush: 3, coverMultiplier: 2, goalGuests: 45, rewardCash: 15000, rewardPopularity: 70, lights: [0xffffff, 0x7df9ff, 0x3fa0ff] },
];

export const getParty = (id: string) => PARTIES.find((p) => p.id === id);
