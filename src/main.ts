import Phaser from 'phaser';
import { tuning } from './data/tuning';
import { createNewClub } from './domain/club';
import { Game } from './domain/game';
import { LocalSaveRepository, MemoryStore, type KeyValueStore } from './persistence/localSaveRepository';
import { ClubScene } from './scenes/ClubScene';
import { Interaction } from './ui/interaction';
import { UI } from './ui/UI';
import './style.css';

function storage(): KeyValueStore {
  try {
    const k = '__ncr_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    return new MemoryStore();
  }
}

function boot(): void {
  const store = storage();
  const persistent = store !== undefined && !(store instanceof MemoryStore);
  const repo = new LocalSaveRepository(store);
  const loaded = repo.load();
  const state = loaded.status === 'ok' ? loaded.state : createNewClub();
  const game = new Game(state);
  const ix = new Interaction();

  // Autosave: debounced on every change, immediately when the tab is hidden or closed.
  let timer: number | undefined;
  const saveNow = () => {
    window.clearTimeout(timer);
    try {
      repo.save(game.state);
    } catch (err) {
      console.warn('Save failed', err);
    }
  };
  game.on((e) => {
    if (e.type !== 'stateChanged') return;
    window.clearTimeout(timer);
    timer = window.setTimeout(saveNow, tuning.saveDebounceMs);
  });
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && saveNow());
  window.addEventListener('pagehide', saveNow);
  if (loaded.status !== 'ok') saveNow();

  const ui = new UI(game, ix, repo, document.getElementById('ui')!);
  const scene = new ClubScene(game, ix, {
    onSelectGuest: (id) => ui.selectGuest(id),
    onSelectFurniture: (id) => ui.selectFurniture(id),
    onClickEmpty: () => ix.select(null),
    onPlaced: () => {},
  });

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#07081a',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    render: { antialias: true },
    scene: [scene],
    callbacks: { postBoot: () => document.getElementById('loading')?.remove() },
  });

  if (loaded.status === 'corrupt') {
    ui.notice(
      'Your save could not be loaded',
      `${loaded.reason}. A fresh club was started.${loaded.backupKey ? ` The old data was kept in browser storage under "${loaded.backupKey}".` : ''}`,
    );
  }
  if (!persistent) ui.toast('Browser storage is unavailable - progress will not be saved.', 'error', 6000);

  // Dev/test hook for automated smoke tests.
  (window as unknown as { __ncr: unknown }).__ncr = { game, ix, repo };
}

boot();
