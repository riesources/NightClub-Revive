/**
 * Furniture catalogue.
 *
 * Calibration: the starter club totals 116 luxury, matching the level-0 HUD in
 * the tutorial screenshots (CONFIRMED value; per-item split PROPOSED).
 * "Red Sectional Chair - $4,000 - Luxury: 60" is CONFIRMED from the Gamezebo
 * build-mode screenshot; the other chairs in that row are CONFIRMED at $3,000,
 * $6,000 and $7,500 (their luxury values are PROPOSED). Everything else PROPOSED.
 *
 * `art.style` selects a procedural drawing in render/furnitureArt.ts. All art is
 * original replacement art, not original game sprites.
 */
export type FurnitureKind = 'dancefloor' | 'bar' | 'seat' | 'dj' | 'speaker' | 'decor' | 'tank';
export type FurnitureCategory = 'floor' | 'dj' | 'bar' | 'seating' | 'decor';
export type ArtStyle =
  | 'tile'
  | 'djbooth'
  | 'speaker'
  | 'bar'
  | 'stool'
  | 'sofa'
  | 'sectional'
  | 'lounge'
  | 'eggchair'
  | 'booth'
  | 'plant'
  | 'pillar'
  | 'tank'
  | 'diamondtile'
  | 'rope'
  | 'statue'
  | 'gogo'
  | 'aquarium'
  | 'fountain'
  | 'buddha'
  | 'podium';

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
  luxury: number;
  /** Walkable objects (dance tiles) do not block guests. */
  walkable: boolean;
  /** DJ booths only: set length. */
  djSetMs?: number;
  art: { style: ArtStyle; top: number; side: number; height: number; glow?: number };
}

const f = (d: FurnitureDef) => d;

export const FURNITURE: readonly FurnitureDef[] = [
  // Floors
  f({ id: 'floor_neon_blue', name: 'Cyan Light Tile', category: 'floor', kind: 'dancefloor', price: 50, requiredLevel: 0, w: 1, h: 1, luxury: 4, walkable: true, art: { style: 'tile', top: 0x14b8e6, side: 0x0a4d73, height: 2, glow: 0xbff6ff } }),
  f({ id: 'floor_neon_purple', name: 'Violet Light Tile', category: 'floor', kind: 'dancefloor', price: 75, requiredLevel: 1, w: 1, h: 1, luxury: 5, walkable: true, art: { style: 'tile', top: 0x9b4dff, side: 0x40196e, height: 2, glow: 0xf0d0ff } }),
  f({ id: 'floor_neon_pink', name: 'Pink Light Tile', category: 'floor', kind: 'dancefloor', price: 75, requiredLevel: 1, w: 1, h: 1, luxury: 5, walkable: true, art: { style: 'tile', top: 0xff4fc8, side: 0x7a1460, height: 2, glow: 0xffd6f3 } }),
  f({ id: 'floor_teal_glass', name: 'Teal Glass Tile', category: 'floor', kind: 'dancefloor', price: 150, requiredLevel: 2, w: 1, h: 1, luxury: 7, walkable: true, art: { style: 'tile', top: 0x1fb5a8, side: 0x0b5a52, height: 2, glow: 0xc8fff6 } }),
  f({ id: 'floor_diamond', name: 'Diamond Light Tile', category: 'floor', kind: 'dancefloor', price: 600, requiredLevel: 4, w: 1, h: 1, luxury: 15, walkable: true, art: { style: 'diamondtile', top: 0xfff1dc, side: 0x8a5a2b, height: 2, glow: 0xff9a2e } }),
  f({ id: 'floor_disco_gold', name: 'Gold Disco Tile', category: 'floor', kind: 'dancefloor', price: 400, requiredLevel: 3, w: 1, h: 1, luxury: 12, walkable: true, art: { style: 'tile', top: 0xffc93c, side: 0x8a5a00, height: 2, glow: 0xfff6c8 } }),
  // DJ & sound
  f({ id: 'dj_starter', name: 'Starter DJ Booth', category: 'dj', kind: 'dj', price: 500, requiredLevel: 0, w: 2, h: 1, luxury: 30, walkable: false, djSetMs: 15 * 60_000, art: { style: 'djbooth', top: 0x3a3d47, side: 0x1d1f26, height: 24, glow: 0x00e5ff } }),
  f({ id: 'dj_pro', name: 'Pro DJ Booth', category: 'dj', kind: 'dj', price: 6000, requiredLevel: 4, w: 2, h: 1, luxury: 120, walkable: false, djSetMs: 30 * 60_000, art: { style: 'djbooth', top: 0xd8dde6, side: 0x7a8494, height: 26, glow: 0xff3df2 } }),
  f({ id: 'dj_podium', name: 'Podium DJ Booth', category: 'dj', kind: 'dj', price: 15000, requiredLevel: 6, w: 2, h: 1, luxury: 220, walkable: false, djSetMs: 45 * 60_000, art: { style: 'podium', top: 0x2a2c33, side: 0x15161b, height: 26, glow: 0x7df9ff } }),
  f({ id: 'speaker_basic', name: 'Tower Speaker', category: 'dj', kind: 'speaker', price: 300, requiredLevel: 0, w: 1, h: 1, luxury: 10, walkable: false, art: { style: 'speaker', top: 0x2a2c33, side: 0x15161b, height: 46 } }),
  f({ id: 'speaker_white', name: 'White Club Speaker', category: 'dj', kind: 'speaker', price: 1200, requiredLevel: 2, w: 1, h: 1, luxury: 30, walkable: false, art: { style: 'speaker', top: 0xf2f4f8, side: 0xb5bcc8, height: 46 } }),
  // Bars
  f({ id: 'bar_basic', name: 'Blue Top Bar', category: 'bar', kind: 'bar', price: 800, requiredLevel: 0, w: 2, h: 1, luxury: 18, walkable: false, art: { style: 'bar', top: 0x3a6ee8, side: 0xd27a3c, height: 22, glow: 0x9fd8ff } }),
  f({ id: 'drink_tank', name: 'Drink Tank', category: 'bar', kind: 'tank', price: 1500, requiredLevel: 2, w: 1, h: 1, luxury: 5, walkable: false, art: { style: 'tank', top: 0xc8ced8, side: 0x7a8494, height: 34, glow: 0xb04cff } }),
  f({ id: 'bar_chrome', name: 'Chrome Bar', category: 'bar', kind: 'bar', price: 3500, requiredLevel: 3, w: 2, h: 1, luxury: 70, walkable: false, art: { style: 'bar', top: 0xe8eef6, side: 0x6c7a8c, height: 22, glow: 0x7df9ff } }),
  // Seating
  f({ id: 'stool_red', name: 'Red Bar Stool', category: 'seating', kind: 'seat', price: 150, requiredLevel: 1, w: 1, h: 1, luxury: 6, walkable: false, art: { style: 'stool', top: 0xd8202f, side: 0x7a0e17, height: 16 } }),
  f({ id: 'sofa_red', name: 'Red Velvet Sofa', category: 'seating', kind: 'seat', price: 1200, requiredLevel: 1, w: 2, h: 1, luxury: 30, walkable: false, art: { style: 'sofa', top: 0xd11f2f, side: 0x6e0a14, height: 16 } }),
  f({ id: 'lounge_black', name: 'Black Lounge Chair', category: 'seating', kind: 'seat', price: 3000, requiredLevel: 2, w: 1, h: 1, luxury: 45, walkable: false, art: { style: 'lounge', top: 0x24262c, side: 0x0e0f12, height: 16 } }),
  f({ id: 'sectional_red', name: 'Red Sectional Chair', category: 'seating', kind: 'seat', price: 4000, requiredLevel: 3, w: 1, h: 1, luxury: 60, walkable: false, art: { style: 'sectional', top: 0xe0202e, side: 0x7a0e17, height: 16 } }),
  f({ id: 'chair_blue', name: 'Ice Blue Chair', category: 'seating', kind: 'seat', price: 6000, requiredLevel: 4, w: 1, h: 1, luxury: 85, walkable: false, art: { style: 'sectional', top: 0x48b8ff, side: 0x1d5f99, height: 16 } }),
  f({ id: 'egg_chair', name: 'Rattan Egg Chair', category: 'seating', kind: 'seat', price: 7500, requiredLevel: 5, w: 1, h: 1, luxury: 105, walkable: false, art: { style: 'eggchair', top: 0xd9893b, side: 0x8a4f1c, height: 30 } }),
  f({ id: 'sofa_white', name: 'White Leather Sofa', category: 'seating', kind: 'seat', price: 2000, requiredLevel: 3, w: 2, h: 1, luxury: 40, walkable: false, art: { style: 'sofa', top: 0xf4f1ea, side: 0xb9b2a4, height: 16 } }),
  f({ id: 'booth_lounge', name: 'Purple Lounge Booth', category: 'seating', kind: 'seat', price: 2500, requiredLevel: 2, w: 2, h: 2, luxury: 50, walkable: false, art: { style: 'booth', top: 0x6a3bc8, side: 0x2c1462, height: 18 } }),
  // Decor
  f({ id: 'plant_palm', name: 'Potted Palm', category: 'decor', kind: 'decor', price: 250, requiredLevel: 1, w: 1, h: 1, luxury: 10, walkable: false, art: { style: 'plant', top: 0x2fa84f, side: 0x175227, height: 34 } }),
  f({ id: 'rope_velvet', name: 'Velvet Rope', category: 'decor', kind: 'decor', price: 600, requiredLevel: 2, w: 2, h: 1, luxury: 20, walkable: false, art: { style: 'rope', top: 0xd8dde6, side: 0x7a8494, height: 26, glow: 0xc0102a } }),
  f({ id: 'statue_gold', name: 'Gold Dancer Statue', category: 'decor', kind: 'decor', price: 5000, requiredLevel: 4, w: 1, h: 1, luxury: 90, walkable: false, art: { style: 'statue', top: 0xffc93c, side: 0x9a6a10, height: 50 } }),
  f({ id: 'gogo_tube', name: 'Go-Go Dancer Tube', category: 'decor', kind: 'decor', price: 9000, requiredLevel: 5, w: 1, h: 1, luxury: 140, walkable: false, art: { style: 'gogo', top: 0x7df9ff, side: 0x2a2c33, height: 84, glow: 0x00e5ff } }),
  f({ id: 'aquarium_wall', name: 'Aquarium Wall', category: 'decor', kind: 'decor', price: 14000, requiredLevel: 6, w: 2, h: 1, luxury: 200, walkable: false, art: { style: 'aquarium', top: 0x1e8fe0, side: 0x2a2c33, height: 50, glow: 0x7df9ff } }),
  f({ id: 'fountain_petals', name: 'Rose Petal Fountain', category: 'decor', kind: 'decor', price: 20000, requiredLevel: 7, w: 2, h: 2, luxury: 260, walkable: false, art: { style: 'fountain', top: 0x3fc8ff, side: 0xd8d2c4, height: 10, glow: 0xe0102a } }),
  f({ id: 'buddha_gold', name: 'Golden Buddha', category: 'decor', kind: 'decor', price: 30000, requiredLevel: 8, w: 1, h: 1, luxury: 350, walkable: false, art: { style: 'buddha', top: 0xffc93c, side: 0x9a6a10, height: 44 } }),
  f({ id: 'light_pillar', name: 'Light Pillar', category: 'decor', kind: 'decor', price: 900, requiredLevel: 2, w: 1, h: 1, luxury: 30, walkable: false, art: { style: 'pillar', top: 0xff3df2, side: 0x6a0d64, height: 52, glow: 0xff9cf7 } }),
];

const BY_ID = new Map(FURNITURE.map((x) => [x.id, x]));

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
