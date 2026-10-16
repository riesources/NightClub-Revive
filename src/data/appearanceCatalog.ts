/**
 * Avatar appearance options. Categories follow the historical dressing-room
 * screenshot leads (skin, hair, clothing - INFERRED); every individual option is
 * PROPOSED replacement content.
 */
export const SKIN_TONES = ['#f8d5b5', '#e8b48a', '#c98b5e', '#9c6440', '#6b4126', '#3f2615'] as const;
export const HAIR_COLORS = ['#1b1b1b', '#5a3416', '#b5651d', '#e8c15a', '#d63b3b', '#7a4cff', '#3fd0ff'] as const;
export const HAIR_STYLES = ['short', 'spiky', 'long', 'afro', 'mohawk', 'bun'] as const;
export const TOP_COLORS = ['#ff3df2', '#00e5ff', '#ffd23f', '#ffffff', '#222631', '#3ddc84', '#ff6b3d'] as const;
export const BOTTOM_COLORS = ['#1f2a44', '#222222', '#6b4e9e', '#c0c6d0', '#7a2f2f'] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];

export interface AvatarAppearance {
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  top: string;
  bottom: string;
}

export const DEFAULT_APPEARANCE: AvatarAppearance = {
  skin: SKIN_TONES[1],
  hairStyle: 'spiky',
  hairColor: HAIR_COLORS[0],
  top: TOP_COLORS[1],
  bottom: BOTTOM_COLORS[0],
};

export function isValidAppearance(a: unknown): a is AvatarAppearance {
  if (!a || typeof a !== 'object') return false;
  const o = a as Record<string, unknown>;
  return (
    (SKIN_TONES as readonly string[]).includes(o.skin as string) &&
    (HAIR_STYLES as readonly string[]).includes(o.hairStyle as string) &&
    (HAIR_COLORS as readonly string[]).includes(o.hairColor as string) &&
    (TOP_COLORS as readonly string[]).includes(o.top as string) &&
    (BOTTOM_COLORS as readonly string[]).includes(o.bottom as string)
  );
}

/** Deterministic appearance from a seed, used for guests. */
export function appearanceFromSeed(seed: number): AvatarAppearance {
  const pick = <T,>(arr: readonly T[], salt: number): T => arr[Math.abs((seed * 2654435761 + salt * 40503) >>> 0) % arr.length];
  return {
    skin: pick(SKIN_TONES, 1),
    hairStyle: pick(HAIR_STYLES, 2),
    hairColor: pick(HAIR_COLORS, 3),
    top: pick(TOP_COLORS, 4),
    bottom: pick(BOTTOM_COLORS, 5),
  };
}
