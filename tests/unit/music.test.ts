import { describe, expect, it } from 'vitest';
import { MIX_LABELS, PLAYLISTS } from '../../src/audio/music';
import { GENRES } from '../../src/domain/types';

describe('music playlists', () => {
  it('every mix has a label and at least three well-formed tracks', () => {
    for (const g of GENRES) {
      expect(MIX_LABELS[g]).toBeTruthy();
      expect(PLAYLISTS[g].length).toBeGreaterThanOrEqual(3);
      for (const t of PLAYLISTS[g]) {
        for (const p of [t.kick, t.snare, t.hat, t.bass]) expect(p).toHaveLength(16);
        if (t.perc) expect(t.perc).toHaveLength(16);
        expect(t.chords).toHaveLength(4);
        expect(t.bpm).toBeGreaterThanOrEqual(80);
        expect(t.bpm).toBeLessThanOrEqual(140);
      }
    }
  });

  it('track names are unique across all mixes', () => {
    const names = GENRES.flatMap((g) => PLAYLISTS[g].map((t) => t.name));
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(18);
  });
});
