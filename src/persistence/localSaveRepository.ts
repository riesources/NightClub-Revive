import type { ClubState } from '../domain/types';
import { migrate } from './migrations';
import type { LoadResult, SaveRepository } from './SaveRepository';
import { validateState } from './validate';

/** Minimal subset of the Web Storage API, so tests can inject an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'nightclub-revive.save';

export class LocalSaveRepository implements SaveRepository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly now: () => number = Date.now,
  ) {}

  parse(json: string): LoadResult {
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      return { status: 'corrupt', reason: 'Save is not valid JSON', backupKey: null };
    }
    const m = migrate(raw);
    if (!m.ok) return { status: 'corrupt', reason: m.reason, backupKey: null };
    const v = validateState(m.data);
    if (!v.ok) return { status: 'corrupt', reason: v.reason, backupKey: null };
    return { status: 'ok', state: v.state };
  }

  load(): LoadResult {
    let json: string | null;
    try {
      json = this.store.getItem(SAVE_KEY);
    } catch {
      return { status: 'corrupt', reason: 'Storage is unavailable', backupKey: null };
    }
    if (json === null) return { status: 'empty' };
    const result = this.parse(json);
    if (result.status !== 'corrupt') return result;
    // Keep the unreadable save so nothing is silently lost.
    const backupKey = `${SAVE_KEY}.corrupt.${this.now()}`;
    try {
      this.store.setItem(backupKey, json);
      this.store.removeItem(SAVE_KEY);
      return { ...result, backupKey };
    } catch {
      return { ...result, backupKey: null };
    }
  }

  save(state: ClubState): void {
    const data: ClubState = { ...state, savedAt: this.now() };
    this.store.setItem(SAVE_KEY, JSON.stringify(data));
  }

  clear(): void {
    this.store.removeItem(SAVE_KEY);
  }

  exportJson(state: ClubState): string {
    return JSON.stringify({ ...state, savedAt: this.now() }, null, 2);
  }
}

export class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}
