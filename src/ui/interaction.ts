import type { Facing } from '../domain/types';

/** What a click on the club currently means. Shared between the scene and the DOM UI. */
export type Mode =
  | { kind: 'normal' }
  | { kind: 'place'; catalogId: string; facing: Facing; fromInventory?: boolean }
  | { kind: 'move'; furnitureId: string; facing: Facing }
  | { kind: 'dedicate' }
  | { kind: 'post'; staffId: string };

export type Selection = { kind: 'furniture'; id: string } | { kind: 'guest'; id: string } | null;

type Listener = () => void;

export class Interaction {
  mode: Mode = { kind: 'normal' };
  selection: Selection = null;
  debug = false;
  /** Set by the scene so DOM zoom buttons can drive the camera. */
  zoomBy?: (factor: number) => void;
  private listeners = new Set<Listener>();

  setMode(mode: Mode): void {
    this.mode = mode;
    this.notify();
  }

  select(sel: Selection): void {
    this.selection = sel;
    this.notify();
  }

  toggleDebug(): void {
    this.debug = !this.debug;
    this.notify();
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}
