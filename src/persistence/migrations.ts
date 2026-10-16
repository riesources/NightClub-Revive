import { SCHEMA_VERSION } from '../domain/types';

/** A migration upgrades raw save data from version `n` to `n + 1`. */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

const V1_COLOR_MAP: Record<string, string> = {
  // skin
  '#f8d5b5': '#fbe0c8', '#e8b48a': '#f2c9a0', '#9c6440': '#a8693f', '#6b4126': '#7f4a2a', '#3f2615': '#3d2212',
  // hair
  '#b5651d': '#a0522d', '#e8c15a': '#e8b830', '#7a4cff': '#8a4cff', '#3fd0ff': '#3fa0ff',
  // tops
  '#00e5ff': '#00c8ff', '#222631': '#262a36',
};

/** v1 entrance was on the front edge; v2 moves it to the back wall at (6,0)-(6,1). */
const V2_RESERVED = new Set(['6,0', '6,1']);
const V1_PRICES: Record<string, number> = {
  floor_neon_blue: 50, floor_neon_purple: 60, floor_disco_gold: 150, dj_starter: 400, dj_pro: 2500,
  speaker_basic: 200, bar_basic: 600, bar_chrome: 1800, stool_basic: 80, sofa_red: 350, booth_lounge: 900,
  plant_palm: 120, light_pillar: 300,
};
const V1_SIZE: Record<string, [number, number]> = {
  dj_starter: [2, 1], dj_pro: [2, 1], bar_basic: [2, 1], bar_chrome: [2, 1], sofa_red: [2, 1], booth_lounge: [2, 2],
};

type V1Furniture = { id: string; catalogId: string; col: number; row: number; facing: number };

/**
 * Registry keyed by the version being migrated *from*.
 * v1 -> v2: appearance gains gender + shoes and moves to the screenshot-matched
 * palettes; `stool_basic` becomes `stool_red`; furniture on the new entrance is
 * removed and refunded at full v1 price.
 */
export const MIGRATIONS: Record<number, Migration> = {
  1: (raw) => {
    const d = structuredClone(raw) as Record<string, unknown>;
    const a = (d.appearance ?? {}) as Record<string, unknown>;
    const remap = (v: unknown) => (typeof v === 'string' && V1_COLOR_MAP[v]) || v;
    d.appearance = { gender: 'm', shoes: '#ffffff', ...a, skin: remap(a.skin), hairColor: remap(a.hairColor), top: remap(a.top) };
    const furniture = Array.isArray(d.furniture) ? (d.furniture as V1Furniture[]) : [];
    const kept: V1Furniture[] = [];
    const removed = new Set<string>();
    let refund = 0;
    for (const f of furniture) {
      const [w0, h0] = V1_SIZE[f.catalogId] ?? [1, 1];
      const [w, h] = f.facing === 1 ? [h0, w0] : [w0, h0];
      let blocksDoor = false;
      for (let c = 0; c < w; c++) for (let r = 0; r < h; r++) if (V2_RESERVED.has(`${f.col + c},${f.row + r}`)) blocksDoor = true;
      if (blocksDoor) {
        removed.add(f.id);
        refund += V1_PRICES[f.catalogId] ?? 0;
      } else {
        kept.push({ ...f, catalogId: f.catalogId === 'stool_basic' ? 'stool_red' : f.catalogId });
      }
    }
    d.furniture = kept;
    if (typeof d.cash === 'number') d.cash += refund;
    if (Array.isArray(d.staff)) {
      d.staff = (d.staff as { barId: string | null }[]).map((s) => (s.barId && removed.has(s.barId) ? { ...s, barId: null } : s));
    }
    return d;
  },
  /** v2 -> v3: staff gain a `post` (bouncer position); everyone hired so far is a bartender. */
  2: (raw) => {
    const d = structuredClone(raw) as Record<string, unknown>;
    if (Array.isArray(d.staff)) d.staff = (d.staff as Record<string, unknown>[]).map((s) => ({ ...s, post: null }));
    return d;
  },
};

export type MigrateResult = { ok: true; data: Record<string, unknown> } | { ok: false; reason: string };

export function migrate(raw: unknown, migrations: Record<number, Migration> = MIGRATIONS, target = SCHEMA_VERSION): MigrateResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'Save is not an object' };
  let data = { ...(raw as Record<string, unknown>) };
  let v = data.schemaVersion;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) return { ok: false, reason: 'Missing schema version' };
  if (v > target) return { ok: false, reason: `Save is from a newer version (${v})` };
  while (v < target) {
    const m = migrations[v];
    if (!m) return { ok: false, reason: `No migration from version ${v}` };
    data = m(data);
    v += 1;
    data.schemaVersion = v;
  }
  return { ok: true, data };
}
