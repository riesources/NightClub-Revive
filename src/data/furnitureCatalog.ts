/**
 * Furniture catalogue. Categories follow the walkthroughs (floor tiles, DJ, bars,
 * seating, decor - INFERRED). Every name, price, level and stat here is PROPOSED:
 * no original catalogue values have been recovered.
 *
 * `art` describes the placeholder primitive the renderer draws. It is gray-box /
 * replacement art, not original artwork.
 */
export type FurnitureKind = 'dancefloor' | 'bar' | 'seat' | 'dj' | 'speaker' | 'decor';
export type FurnitureCategory = 'floor' | 'dj' | 'bar' | 'seating' | 'decor';

export interface FurnitureDef {
  id: string;
  name: string;
  category: FurnitureCategory;
  kind: FurnitureKind;
  price: number;
  requiredLevel: number;
  /** Footprint in tiles (cols x rows). */
  w: number;
  h: number;
  /** Contribution to the club's luxury score. */
  luxury: number;
  /** Walkable objects (dance tiles) do not block guests. */
  walkable: boolean;
  /** DJ booths only: set length. */
  djSetMs?: number;
  art: { top: number; side: number; height: number; glow?: number };
}

export const FURNITURE: readonly FurnitureDef[] = [
  {
    id: 'floor_neon_blue', name: 'Neon Dance Tile (Blue)', category: 'floor', kind: 'dancefloor',
    price: 50, requiredLevel: 1, w: 1, h: 1, luxury: 1, walkable: true,
    art: { top: 0x1fb6ff, side: 0x0b4d8c, height: 2, glow: 0x6fe3ff },
  },
  {
    id: 'floor_neon_purple', name: 'Neon Dance Tile (Purple)', category: 'floor', kind: 'dancefloor',
    price: 60, requiredLevel: 1, w: 1, h: 1, luxury: 1, walkable: true,
    art: { top: 0xb04cff, side: 0x4a1a7a, height: 2, glow: 0xe0a8ff },
  },
  {
    id: 'floor_disco_gold', name: 'Disco Tile (Gold)', category: 'floor', kind: 'dancefloor',
    price: 150, requiredLevel: 2, w: 1, h: 1, luxury: 3, walkable: true,
    art: { top: 0xffc93c, side: 0x8a5a00, height: 2, glow: 0xfff1a8 },
  },
  {
    id: 'dj_starter', name: 'Starter DJ Booth', category: 'dj', kind: 'dj',
    price: 400, requiredLevel: 1, w: 2, h: 1, luxury: 4, walkable: false, djSetMs: 15 * 60_000,
    art: { top: 0x2b2f3a, side: 0x14161c, height: 26, glow: 0x00e5ff },
  },
  {
    id: 'dj_pro', name: 'Pro DJ Booth', category: 'dj', kind: 'dj',
    price: 2500, requiredLevel: 3, w: 2, h: 1, luxury: 12, walkable: false, djSetMs: 30 * 60_000,
    art: { top: 0x3a3f52, side: 0x1b1e29, height: 30, glow: 0xff3df2 },
  },
  {
    id: 'speaker_basic', name: 'Floor Speaker', category: 'dj', kind: 'speaker',
    price: 200, requiredLevel: 1, w: 1, h: 1, luxury: 3, walkable: false,
    art: { top: 0x23252b, side: 0x0e0f12, height: 40 },
  },
  {
    id: 'bar_basic', name: 'Basic Bar', category: 'bar', kind: 'bar',
    price: 600, requiredLevel: 1, w: 2, h: 1, luxury: 5, walkable: false,
    art: { top: 0x9a5b2e, side: 0x4e2a12, height: 24, glow: 0xffb347 },
  },
  {
    id: 'bar_chrome', name: 'Chrome Bar', category: 'bar', kind: 'bar',
    price: 1800, requiredLevel: 2, w: 2, h: 1, luxury: 14, walkable: false,
    art: { top: 0xc7d3e0, side: 0x5b6878, height: 24, glow: 0x7df9ff },
  },
  {
    id: 'stool_basic', name: 'Bar Stool', category: 'seating', kind: 'seat',
    price: 80, requiredLevel: 1, w: 1, h: 1, luxury: 1, walkable: false,
    art: { top: 0xd23a3a, side: 0x6e1414, height: 14 },
  },
  {
    id: 'sofa_red', name: 'Velvet Sofa', category: 'seating', kind: 'seat',
    price: 350, requiredLevel: 1, w: 2, h: 1, luxury: 6, walkable: false,
    art: { top: 0xb3123f, side: 0x5a0820, height: 16 },
  },
  {
    id: 'booth_lounge', name: 'Lounge Booth', category: 'seating', kind: 'seat',
    price: 900, requiredLevel: 2, w: 2, h: 2, luxury: 10, walkable: false,
    art: { top: 0x3b2a6b, side: 0x1c1236, height: 18 },
  },
  {
    id: 'plant_palm', name: 'Potted Palm', category: 'decor', kind: 'decor',
    price: 120, requiredLevel: 1, w: 1, h: 1, luxury: 2, walkable: false,
    art: { top: 0x2fa84f, side: 0x175227, height: 34 },
  },
  {
    id: 'light_pillar', name: 'Light Pillar', category: 'decor', kind: 'decor',
    price: 300, requiredLevel: 2, w: 1, h: 1, luxury: 5, walkable: false,
    art: { top: 0xff3df2, side: 0x6a0d64, height: 48, glow: 0xff9cf7 },
  },
];

const BY_ID = new Map(FURNITURE.map((f) => [f.id, f]));

export function getFurnitureDef(id: string): FurnitureDef | undefined {
  return BY_ID.get(id);
}

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  floor: 'Floors',
  dj: 'DJ & Sound',
  bar: 'Bars',
  seating: 'Seating',
  decor: 'Decor',
};
