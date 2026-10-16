import { SCHEMA_VERSION } from '../domain/types';

/** A migration upgrades raw save data from version `n` to `n + 1`. */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Registry keyed by the version being migrated *from*. v1 is the first released
 * schema, so the registry is empty; add `1: (raw) => {...}` when v2 ships.
 */
export const MIGRATIONS: Record<number, Migration> = {};

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
