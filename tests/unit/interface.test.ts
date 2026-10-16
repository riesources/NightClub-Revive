import { describe, expect, it } from 'vitest';
import { CLUB_NAME_MAX, cleanClubName, createNewClub } from '../../src/domain/club';
import { Game } from '../../src/domain/game';
import { moodWord } from '../../src/domain/guests/guest';
import { createRng } from '../../src/domain/rng';
import { LocalSaveRepository, MemoryStore, SAVE_KEY } from '../../src/persistence/localSaveRepository';
import { validateState } from '../../src/persistence/validate';

describe('club name', () => {
  it('trims, collapses spaces and enforces 1..24 characters', () => {
    expect(cleanClubName("  Aaron's   Club ")).toBe("Aaron's Club");
    expect(cleanClubName('   ')).toBe(null);
    expect(cleanClubName('x'.repeat(CLUB_NAME_MAX + 1))).toBe(null);
  });

  it('rename saves a clean name and refuses a bad one without changing state', () => {
    const game = new Game(createNewClub(0), createRng(1));
    expect(game.state.clubName).toBe('My Club');
    expect(game.renameClub('  Neon  Palace ').ok).toBe(true);
    expect(game.state.clubName).toBe('Neon Palace');
    expect(game.renameClub('').ok).toBe(false);
    expect(game.state.clubName).toBe('Neon Palace');
  });
});

describe('celebrity wishes', () => {
  it('toggles on and off and rejects unknown celebrities', () => {
    const game = new Game(createNewClub(0), createRng(1));
    game.toggleCelebWish('dj_nova');
    expect(game.state.celebWishes).toEqual(['dj_nova']);
    game.toggleCelebWish('dj_nova');
    expect(game.state.celebWishes).toEqual([]);
    expect(game.toggleCelebWish('nobody').ok).toBe(false);
  });
});

describe('guest mood word', () => {
  it('follows happiness, and troublemakers are Rowdy', () => {
    expect(moodWord({ state: 'DANCING', happiness: 90 })).toBe('Enthusiastic');
    expect(moodWord({ state: 'DANCING', happiness: 70 })).toBe('Happy');
    expect(moodWord({ state: 'DANCING', happiness: 50 })).toBe('Content');
    expect(moodWord({ state: 'DANCING', happiness: 30 })).toBe('Bored');
    expect(moodWord({ state: 'DANCING', happiness: 10 })).toBe('Upset');
    expect(moodWord({ state: 'TROUBLEMAKER', happiness: 90 })).toBe('Rowdy');
  });
});

describe('v6 -> v7 migration and validation', () => {
  it('adds a default club name and an empty wish list', () => {
    const { clubName: _n, celebWishes: _w, ...rest } = createNewClub(0);
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, JSON.stringify({ ...rest, schemaVersion: 6 }));
    const r = new LocalSaveRepository(store).load();
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.state.schemaVersion).toBe(7);
      expect(r.state.clubName).toBe('My Club');
      expect(r.state.celebWishes).toEqual([]);
    }
  });

  it('rejects a bad club name or wish list', () => {
    expect(validateState({ ...createNewClub(0), clubName: '' }).ok).toBe(false);
    expect(validateState({ ...createNewClub(0), celebWishes: ['nobody'] }).ok).toBe(false);
    expect(validateState({ ...createNewClub(0), celebWishes: ['dj_nova', 'dj_nova'] }).ok).toBe(false);
  });
});
