import type { ClubState } from '../domain/types';

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: ClubState }
  /** The save could not be read. The raw data was copied to `backupKey` before anything else happens. */
  | { status: 'corrupt'; reason: string; backupKey: string | null };

/** Storage boundary, so cloud saves can be added later without touching the game. */
export interface SaveRepository {
  load(): LoadResult;
  save(state: ClubState): void;
  clear(): void;
  exportJson(state: ClubState): string;
  /** Parse + migrate + validate an imported save without persisting it. */
  parse(json: string): LoadResult;
}
