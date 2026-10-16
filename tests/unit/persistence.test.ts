import { describe, expect, it } from 'vitest';
import { createNewClub } from '../../src/domain/club';
import { buyAndPlace } from '../../src/domain/economy';
import { startSet } from '../../src/domain/dj';
import { LocalSaveRepository, MemoryStore, SAVE_KEY } from '../../src/persistence/localSaveRepository';
import { migrate } from '../../src/persistence/migrations';

describe('save / load', () => {
  it('round-trips cash, appearance, layout, staff, stock, DJ and progression', () => {
    const store = new MemoryStore();
    const repo = new LocalSaveRepository(store, () => 42);
    let s = { ...createNewClub(0), level: 1 };
    const b = buyAndPlace(s, 'sofa_red', 7, 7);
    if (!b.ok) throw new Error(b.reason);
    s = b.state;
    const p = startSet(s, 'hiphop', 1000);
    if (!p.ok) throw new Error();
    s = { ...p.state, xp: 1234, level: 1, stock: { drinks: 77 }, appearance: { ...s.appearance, hairStyle: 'afro' }, tutorialDismissed: true };
    repo.save(s);
    const loaded = repo.load();
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state).toEqual({ ...s, savedAt: 42 });
  });

  it('empty storage reports empty', () => {
    expect(new LocalSaveRepository(new MemoryStore()).load()).toEqual({ status: 'empty' });
  });

  it.each([
    ['not json', '{oops'],
    ['wrong shape', '[1,2,3]'],
    ['no version', '{"cash":5}'],
    ['future version', JSON.stringify({ ...createNewClub(0), schemaVersion: 99 })],
    ['negative cash', JSON.stringify({ ...createNewClub(0), cash: -5 })],
    ['furniture overlap', JSON.stringify({ ...createNewClub(0), furniture: [
      { id: 'a', catalogId: 'sofa_red', col: 1, row: 1, facing: 0 },
      { id: 'b', catalogId: 'plant_palm', col: 2, row: 1, facing: 0 },
    ], staff: [] })],
    ['unknown furniture', JSON.stringify({ ...createNewClub(0), furniture: [{ id: 'a', catalogId: 'x', col: 1, row: 1, facing: 0 }], staff: [] })],
  ])('corrupt save (%s) is backed up and reported, never thrown', (_name, json) => {
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, json);
    const repo = new LocalSaveRepository(store, () => 7);
    const r = repo.load();
    expect(r.status).toBe('corrupt');
    if (r.status !== 'corrupt') return;
    expect(r.backupKey).toBe(`${SAVE_KEY}.corrupt.7`);
    expect(store.getItem(r.backupKey!)).toBe(json);
    expect(store.getItem(SAVE_KEY)).toBe(null);
  });

  it('storage that throws is handled', () => {
    const repo = new LocalSaveRepository({
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {},
      removeItem: () => {},
    });
    expect(repo.load().status).toBe('corrupt');
  });
});

describe('v1 -> v2 migration', () => {
  const v1 = {
    schemaVersion: 1,
    cash: 1000,
    totalEarned: 0,
    xp: 0,
    level: 1,
    popularity: 0,
    room: { cols: 12, rows: 12 },
    furniture: [
      { id: 'f1', catalogId: 'bar_basic', col: 5, row: 0, facing: 0 }, // covers (6,0): the new door
      { id: 'f2', catalogId: 'stool_basic', col: 2, row: 8, facing: 0 },
      { id: 'f3', catalogId: 'dj_starter', col: 0, row: 4, facing: 0 },
    ],
    staff: [{ id: 's1', role: 'bartender', name: 'Rico', barId: 'f1' }],
    appearance: { skin: '#e8b48a', hairStyle: 'spiky', hairColor: '#b5651d', top: '#00e5ff', bottom: '#1f2a44' },
    dj: { genre: 'pop', setStartedAt: null, setEndsAt: null, lastDropBassAt: null, lastDedicateAt: null },
    stock: { drinks: 50 },
    stats: { drinksSold: 0, guestsVisited: 0, tipsEarned: 0 },
    tutorialDismissed: true,
    nextId: 4,
    savedAt: 0,
  };

  it('loads a real v1 save: palettes remapped, gender/shoes added, door cleared with refund', () => {
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, JSON.stringify(v1));
    const r = new LocalSaveRepository(store).load();
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.state.schemaVersion).toBe(5);
    expect(r.state.appearance).toEqual({ gender: 'm', shoes: '#ffffff', skin: '#f2c9a0', hairStyle: 'spiky', hairColor: '#a0522d', top: '#00c8ff', bottom: '#1f2a44' });
    expect(r.state.furniture.map((f) => f.catalogId)).toEqual(['stool_red', 'dj_starter']);
    expect(r.state.cash).toBe(1000 + 600);
    expect(r.state.staff[0].barId).toBe(null);
  });
});

describe('migrations', () => {
  it('runs migrations in order up to the target version', () => {
    const r = migrate(
      { schemaVersion: 1, money: 5 },
      {
        1: (d) => ({ ...d, cash: d.money }),
        2: (d) => ({ ...d, cash: (d.cash as number) * 2 }),
      },
      3,
    );
    expect(r).toEqual({ ok: true, data: { schemaVersion: 3, money: 5, cash: 10 } });
  });

  it('fails cleanly when a migration step is missing', () => {
    expect(migrate({ schemaVersion: 1 }, {}, 2)).toEqual({ ok: false, reason: 'No migration from version 1' });
  });
});
