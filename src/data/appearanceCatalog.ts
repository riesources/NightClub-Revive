/**
 * Avatar appearance options. Categories follow the original dressing room
 * screenshot (Gamezebo walkthrough, CONFIRMED): gender, skin color, head colors,
 * then hair / face / tops / bottoms / shoes tabs, plus a randomize dice.
 * Every individual option below is PROPOSED replacement content.
 */
export const GENDERS = ['m', 'f'] as const;
export const SKIN_TONES = ['#fbe0c8', '#f2c9a0', '#e3ac7c', '#c98b5e', '#a8693f', '#7f4a2a', '#5c331c', '#3d2212'] as const;
export const HAIR_COLORS = ['#1b1b1b', '#5a3416', '#a0522d', '#e8b830', '#f2e2a0', '#c0c0c8', '#d63b3b', '#8a4cff', '#3fa0ff', '#ff7ac8'] as const;
export const HAIR_STYLES = ['short', 'spiky', 'swoop', 'afro', 'mohawk', 'long', 'bob', 'ponytail', 'bun', 'beret', 'fedora', 'beanie'] as const;
export const TOP_COLORS = ['#ff3df2', '#00c8ff', '#ffd23f', '#ffffff', '#262a36', '#3ddc84', '#ff6b3d', '#9b59ff', '#e0344a'] as const;
export const BOTTOM_COLORS = ['#1f2a44', '#222222', '#3a6ea5', '#6b4e9e', '#c0c6d0', '#7a2f2f', '#2f6b3a'] as const;
export const SHOE_COLORS = ['#ffffff', '#1b1b1b', '#e0344a', '#ffd23f', '#3fa0ff', '#ff3df2'] as const;

export type Gender = (typeof GENDERS)[number];
export type HairStyle = (typeof HAIR_STYLES)[number];

export interface AvatarAppearance {
  gender: Gender;
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  top: string;
  bottom: string;
  shoes: string;
}

export const DEFAULT_APPEARANCE: AvatarAppearance = {
  gender: 'm',
  skin: SKIN_TONES[1],
  hairStyle: 'swoop',
  hairColor: HAIR_COLORS[1],
  top: TOP_COLORS[5],
  bottom: BOTTOM_COLORS[0],
  shoes: SHOE_COLORS[0],
};

const has = (arr: readonly string[], v: unknown) => typeof v === 'string' && arr.includes(v);

export function isValidAppearance(a: unknown): a is AvatarAppearance {
  if (!a || typeof a !== 'object') return false;
  const o = a as Record<string, unknown>;
  return (
    has(GENDERS, o.gender) &&
    has(SKIN_TONES, o.skin) &&
    has(HAIR_STYLES, o.hairStyle) &&
    has(HAIR_COLORS, o.hairColor) &&
    has(TOP_COLORS, o.top) &&
    has(BOTTOM_COLORS, o.bottom) &&
    has(SHOE_COLORS, o.shoes)
  );
}

const MALE_HAIR: HairStyle[] = ['short', 'spiky', 'swoop', 'afro', 'mohawk', 'beret', 'fedora', 'beanie'];
const FEMALE_HAIR: HairStyle[] = ['long', 'bob', 'ponytail', 'bun', 'afro', 'swoop', 'beret', 'beanie'];

/** Deterministic appearance from a seed, used for guests and the dice button. */
export function appearanceFromSeed(seed: number): AvatarAppearance {
  let x = seed >>> 0 || 1;
  const next = () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x;
  };
  const pick = <T,>(arr: readonly T[]): T => arr[next() % arr.length];
  const gender = pick(GENDERS);
  return {
    gender,
    skin: pick(SKIN_TONES),
    hairStyle: pick(gender === 'm' ? MALE_HAIR : FEMALE_HAIR),
    hairColor: pick(HAIR_COLORS),
    top: pick(TOP_COLORS),
    bottom: pick(BOTTOM_COLORS),
    shoes: pick(SHOE_COLORS),
  };
}
