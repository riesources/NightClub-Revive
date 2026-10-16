import { describe, expect, it } from 'vitest';
import { createNewClub } from '../../src/domain/club';
import { buyAndPlace, placeFromInventory, storeAll, storeFurniture } from '../../src/domain/economy';
import { stockCapacity } from '../../src/domain/bar';
import { SCHEMA_VERSION } from '../../src/domain/types';
import { LocalSaveRepository, MemoryStore, SAVE_KEY } from '../../src/persistence/localSaveRepository';
import { validateState } from '../../src/persistence/validate';

const must = <T extends { ok: boolean }>(r: T) => {
  if (!r.ok) throw new Error((r as unknown as { reason: string }).reason);
  return (r as unknown as { state: ReturnType<typeof createNewClub> }).state;
};

describe('storing furniture', () => {
  it('moves an item to the inventory with no refund', () => {
    const s = createNewClub(0);
    const speaker = s.furniture.find((f) => f.catalogId === 'speaker_basic')!;
    const t = must(storeFurniture(s, speaker.id));
    expect(t.cash).toBe(s.cash);
    expect(t.furniture.some((f) => f.id === speaker.id)).toBe(false);
    expect(t.inventory).toEqual({ speaker_basic: 1 });
  });

  it('storing a bar frees its bartender; storing a tank trims extra drinks', () => {
    let s = { ...createNewClub(0), level: 2, cash: 10_000 };
    const bar = s.furniture.find((f) => f.catalogId === 'bar_basic')!;
    expect(must(storeFurniture(s, bar.id)).staff[0].barId).toBe(null);
    s = must(buyAndPlace(s, 'drink_tank', 5, 7));
    s = { ...s, stock: { drinks: stockCapacity(s) } };
    const tank = s.furniture.find((f) => f.catalogId === 'drink_tank')!;
    const t = must(storeFurniture(s, tank.id));
    expect(t.stock.drinks).toBe(stockCapacity(t));
  });

  it('Clear Club stores everything', () => {
    const s = createNewClub(0);
    const t = must(storeAll(s));
    expect(t.furniture).toHaveLength(0);
    expect(Object.values(t.inventory).reduce((a, b) => a + b, 0)).toBe(s.furniture.length);
    expect(t.inventory.floor_neon_blue).toBe(12);
    expect(storeAll(t).ok).toBe(false);
  });
});

describe('placing from the inventory', () => {
  it('is free, counts down, and removes the entry at zero', () => {
    const s = must(storeAll(createNewClub(0)));
    const cash = s.cash;
    let t = must(placeFromInventory(s, 'speaker_basic', 2, 5));
    expect(t.cash).toBe(cash);
    expect(t.inventory.speaker_basic).toBe(1);
    t = must(placeFromInventory(t, 'speaker_basic', 4, 5));
    expect('speaker_basic' in t.inventory).toBe(false);
    expect(placeFromInventory(t, 'speaker_basic', 6, 5).ok).toBe(false);
  });

  it('works even above your level, but not on a bad tile, and leaves state untouched on failure', () => {
    const s = { ...createNewClub(0), level: 0, inventory: { buddha_gold: 1 } };
    expect(placeFromInventory(s, 'buddha_gold', -1, 0).ok).toBe(false);
    expect(s.inventory.buddha_gold).toBe(1);
    expect(placeFromInventory(s, 'buddha_gold', 5, 6).ok).toBe(true);
  });
});

describe('v7 -> v8 migration and validation', () => {
  it('adds an empty inventory', () => {
    const { inventory: _i, ...rest } = createNewClub(0);
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, JSON.stringify({ ...rest, schemaVersion: 7 }));
    const r = new LocalSaveRepository(store).load();
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(r.state.inventory).toEqual({});
    }
  });

  it('rejects unknown items and bad counts', () => {
    expect(validateState({ ...createNewClub(0), inventory: { nope: 1 } }).ok).toBe(false);
    expect(validateState({ ...createNewClub(0), inventory: { plant_palm: 0 } }).ok).toBe(false);
    expect(validateState({ ...createNewClub(0), inventory: { plant_palm: 2 } }).ok).toBe(true);
  });
});
