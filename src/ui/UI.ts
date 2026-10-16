import { CATEGORY_LABELS, FURNITURE, getFurnitureDef, type FurnitureCategory, type FurnitureDef } from '../data/furnitureCatalog';
import { tuning } from '../data/tuning';
import { computeLuxury, guestCapacity } from '../domain/club';
import * as dj from '../domain/dj';
import { features, sellRefund } from '../domain/economy';
import type { Game, GameEvent } from '../domain/game';
import { moodOf } from '../domain/guests/guest';
import { xpProgress } from '../domain/progression';
import { bartenderForBar } from '../domain/staff';
import { GENRES, GENRE_LABELS } from '../domain/types';
import type { SaveRepository } from '../persistence/SaveRepository';
import { ICON, fmt, h, mmss } from './dom';
import { openDressingRoom } from './dressingRoom';
import type { Interaction } from './interaction';

type Panel = 'build' | 'dj' | 'staff' | null;

/**
 * Replace a container's children only if the resulting markup differs. Rebuilding
 * identical buttons mid-click would swallow the click, so unchanged UI is left alone.
 */
function swap(container: HTMLElement, nodes: (HTMLElement | null)[]): void {
  const tmp = document.createElement('div');
  const real = nodes.filter((n): n is HTMLElement => n !== null);
  for (const n of real) tmp.append(n.cloneNode(true));
  if (tmp.innerHTML === container.innerHTML) return;
  container.replaceChildren(...real);
}

const STATE_LABELS: Record<string, string> = {
  ENTERING: 'Arriving',
  CHOOSING_ACTIVITY: 'Looking around',
  WALKING_TO_DANCE_FLOOR: 'Heading to dance',
  DANCING: 'Dancing',
  THIRSTY: 'Going for a drink',
  QUEUING_FOR_BAR: 'Waiting at the bar',
  DRINKING: 'Drinking',
  SEEKING_SEAT: 'Finding a spot',
  SITTING_OR_SOCIALIZING: 'Hanging out',
  LEAVING: 'Leaving',
};

export class UI {
  private root: HTMLElement;
  private hud = h('div', { class: 'hud' });
  private dock = h('div', { class: 'dock' });
  private panel = h('div', { class: 'panel hidden' });
  private context = h('div', { class: 'context hidden' });
  private toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
  private modeBar = h('div', { class: 'mode-bar hidden' });
  private openPanel: Panel = null;
  private buildCategory: FurnitureCategory = 'floor';
  private recentToasts = new Map<string, number>();

  constructor(
    private readonly game: Game,
    private readonly ix: Interaction,
    private readonly repo: SaveRepository,
    mount: HTMLElement,
  ) {
    this.root = mount;
    this.root.append(this.hud, this.modeBar, this.context, this.panel, this.dock, this.toasts);
    this.buildDock();
    game.on((e) => this.onEvent(e));
    ix.on(() => {
      this.renderModeBar();
      this.renderContext();
    });
    this.renderAll();
    setInterval(() => this.refreshLive(), 250);
    if (!game.state.tutorialDismissed) this.showTutorial();
  }

  // ---- events ---------------------------------------------------------------
  private onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'stateChanged':
        this.renderHud();
        if (this.openPanel) this.renderPanel();
        this.renderContext();
        break;
      case 'notice':
        this.toast(e.message, e.tone);
        break;
      case 'levelUp':
        this.toast(`Level up! You reached level ${e.level} and your club expanded.`, 'good', 5000);
        break;
      case 'outOfDrinks':
        this.toast('The bar is out of drinks! Restock to keep guests happy.', 'error');
        break;
      case 'noBartender':
        this.toast('A guest wanted a drink but no bar is staffed.', 'error');
        break;
    }
  }

  toast(message: string, tone: 'info' | 'error' | 'good' = 'info', ms = 2600): void {
    const now = Date.now();
    if ((this.recentToasts.get(message) ?? 0) > now - 4000) return;
    this.recentToasts.set(message, now);
    const t = h('div', { class: `toast ${tone}` }, message);
    this.toasts.append(t);
    while (this.toasts.children.length > 4) this.toasts.firstElementChild?.remove();
    setTimeout(() => t.classList.add('fade'), ms);
    setTimeout(() => t.remove(), ms + 500);
  }

  private renderAll(): void {
    this.renderHud();
    this.renderPanel();
    this.renderContext();
    this.renderModeBar();
  }

  // ---- HUD ------------------------------------------------------------------
  /** HUD nodes are created once and updated in place, so clicks are never lost to a rebuild. */
  private hudRefs: Record<string, HTMLElement> | null = null;

  private buildHud(): Record<string, HTMLElement> {
    const r: Record<string, HTMLElement> = {
      lvl: h('span', { class: 'lvl' }),
      xpfill: h('div', { class: 'xpfill' }),
      xptext: h('span', {}),
      level: h('div', { class: 'hud-level' }),
      cash: h('b', {}),
      cashBox: h('div', { class: 'hud-stat cash' }),
      pop: h('b', {}),
      lux: h('b', {}),
      stockFill: h('div', { class: 'meter-fill' }),
      stockText: h('span', {}),
      drinks: h('div', { class: 'hud-stat drinks', title: 'Drink supply' }),
      djText: h('b', {}),
      dj: h('div', { class: 'hud-stat dj', title: 'DJ set - click to open', onclick: () => this.togglePanel('dj') }),
      guests: h('b', {}),
    };
    r.level.append(h('span', { class: 'icon', html: ICON.star }), r.lvl, h('div', { class: 'xpbar' }, r.xpfill, r.xptext));
    r.cashBox.append(h('span', { class: 'icon', html: ICON.cash }), r.cash);
    r.drinks.append(
      h('span', { class: 'icon', html: ICON.drink }),
      h('div', { class: 'meter' }, r.stockFill, r.stockText),
      h('button', { class: 'btn tiny', title: `Restock +${tuning.barRefillAmount} drinks for $${tuning.barRefillCost}`, onclick: () => this.game.refill() }, `+${tuning.barRefillAmount}`),
    );
    r.dj.append(h('span', { class: 'icon', html: ICON.note }), r.djText);
    this.hud.append(
      r.level,
      r.cashBox,
      h('div', { class: 'hud-stat', title: 'Popularity' }, h('span', { class: 'icon', html: ICON.pop }), r.pop),
      h('div', { class: 'hud-stat', title: 'Luxury' }, h('span', { class: 'icon', html: ICON.lux }), r.lux),
      r.drinks,
      r.dj,
      h('div', { class: 'hud-stat guests', title: 'Guests in club / capacity' }, r.guests),
    );
    return r;
  }

  renderHud(): void {
    const r = (this.hudRefs ??= this.buildHud());
    const s = this.game.state;
    const now = Date.now();
    const xp = xpProgress(s.xp);
    const playing = dj.isPlaying(s, now);
    r.lvl.textContent = String(s.level);
    r.level.title = `${fmt(s.xp)} XP total`;
    r.xpfill.style.width = `${Math.min(100, (xp.into / xp.needed) * 100)}%`;
    r.xptext.textContent = `${fmt(xp.into)} / ${fmt(xp.needed)} XP`;
    r.cash.textContent = `$${fmt(s.cash)}`;
    r.cashBox.title = `Cash (lifetime earnings $${fmt(s.totalEarned)})`;
    r.pop.textContent = fmt(s.popularity);
    r.lux.textContent = fmt(computeLuxury(s));
    r.stockFill.style.width = `${Math.round((s.stock.drinks / tuning.barStockCapacity) * 100)}%`;
    r.stockText.textContent = `${s.stock.drinks}/${tuning.barStockCapacity}`;
    r.drinks.classList.toggle('low', s.stock.drinks <= 20);
    r.dj.classList.toggle('on', playing);
    r.djText.textContent = playing ? `${GENRE_LABELS[s.dj.genre]} ${mmss(dj.timeRemaining(s, now))}` : 'Music off';
    r.guests.textContent = `${this.game.sim.guests.length}/${guestCapacity(s)} guests`;
  }

  /** Timer-driven refresh: text updates in place; structure rebuilds only when it changes. */
  private liveSig = '';
  private refreshLive(): void {
    this.renderHud();
    const s = this.game.state;
    const now = Date.now();
    if (this.openPanel === 'dj') {
      const sig = [
        dj.isPlaying(s, now),
        Math.ceil(dj.cooldownLeft(s.dj.lastDropBassAt, tuning.dropBassCooldownMs, now) / 1000),
        Math.ceil(dj.cooldownLeft(s.dj.lastDedicateAt, tuning.dedicateCooldownMs, now) / 1000),
      ].join('|');
      if (sig !== this.liveSig) {
        this.liveSig = sig;
        this.renderPanel();
      } else {
        const cd = this.panel.querySelector('.dj-countdown');
        if (cd) cd.textContent = mmss(dj.timeRemaining(s, now));
      }
    }
    if (this.ix.selection?.kind === 'guest') {
      const sel = this.ix.selection;
      const g = this.game.sim.guests.find((x) => x.id === sel.id);
      if (!g) return this.renderContext();
      const set = (sel_: string, v: string) => {
        const el = this.context.querySelector(sel_) as HTMLElement | null;
        if (el) el.textContent = v;
      };
      set('.ctx-state', STATE_LABELS[g.state] ?? g.state);
      set('.mood', moodOf(g.happiness, tuning.happyThreshold, tuning.unhappyThreshold));
      const fills = this.context.querySelectorAll<HTMLElement>('.ctx-bar .meter-fill');
      if (fills[0]) fills[0].style.width = `${Math.round(g.happiness)}%`;
      if (fills[1]) fills[1].style.width = `${Math.round(g.thirst)}%`;
    }
  }

  // ---- dock -----------------------------------------------------------------
  private buildDock(): void {
    const btn = (icon: string, label: string, onclick: () => void, id: string) =>
      h('button', { class: 'dock-btn', 'data-id': id, onclick, title: label }, h('span', { class: 'icon', html: icon }), h('span', { class: 'lbl' }, label));
    this.dock.append(
      btn(ICON.build, 'Build', () => this.togglePanel('build'), 'build'),
      btn(ICON.dj, 'DJ', () => this.togglePanel('dj'), 'dj'),
      btn(ICON.staff, 'Staff', () => this.togglePanel('staff'), 'staff'),
      btn(ICON.dress, 'Dress Up', () => this.openDressingRoom(), 'dress'),
      btn(ICON.gear, 'Settings', () => this.openSettings(), 'settings'),
      btn(ICON.bug, 'Debug', () => this.ix.toggleDebug(), 'debug'),
    );
  }

  togglePanel(p: Panel): void {
    this.openPanel = this.openPanel === p ? null : p;
    if (this.openPanel !== 'build' && this.ix.mode.kind === 'place') this.ix.setMode({ kind: 'normal' });
    this.renderPanel();
  }

  private renderPanel(): void {
    for (const b of this.dock.querySelectorAll('.dock-btn')) b.classList.toggle('active', (b as HTMLElement).dataset.id === this.openPanel);
    this.panel.classList.toggle('hidden', !this.openPanel);
    if (!this.openPanel) return;
    swap(this.panel, this.openPanel === 'build' ? this.buildPanel() : this.openPanel === 'dj' ? this.djPanel() : this.staffPanel());
  }

  private swatch(def: FurnitureDef): HTMLElement {
    const c = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
    const tall = Math.min(26, 6 + def.art.height * 0.5);
    const svg = `<svg viewBox="0 0 60 60"><polygon points="30,${30 - tall} 52,${40 - tall} 30,${50 - tall} 8,${40 - tall}" fill="${c(def.art.top)}" stroke="#000" stroke-opacity=".4"/><polygon points="8,${40 - tall} 30,${50 - tall} 30,50 8,40" fill="${c(def.art.side)}" opacity=".8"/><polygon points="52,${40 - tall} 30,${50 - tall} 30,50 52,40" fill="${c(def.art.side)}"/></svg>`;
    return h('div', { class: 'swatch', html: svg });
  }

  private buildPanel(): HTMLElement[] {
    const s = this.game.state;
    const cats = Object.keys(CATEGORY_LABELS) as FurnitureCategory[];
    const tabs = h(
      'div',
      { class: 'tabs' },
      ...cats.map((c) => h('button', { class: `tab${c === this.buildCategory ? ' active' : ''}`, onclick: () => ((this.buildCategory = c), this.renderPanel()) }, CATEGORY_LABELS[c])),
    );
    const items = FURNITURE.filter((f) => f.category === this.buildCategory).map((f) => {
      const locked = s.level < f.requiredLevel;
      const poor = s.cash < f.price;
      const selected = this.ix.mode.kind === 'place' && this.ix.mode.catalogId === f.id;
      return h(
        'button',
        {
          class: `card${locked ? ' locked' : ''}${selected ? ' selected' : ''}`,
          disabled: locked,
          title: locked ? `Unlocks at level ${f.requiredLevel}` : poor ? 'Not enough cash' : `Place ${f.name}`,
          onclick: () => {
            if (locked) return;
            this.ix.select(null);
            this.ix.setMode({ kind: 'place', catalogId: f.id, facing: 0 });
            this.renderPanel();
          },
        },
        this.swatch(f),
        h('div', { class: 'card-name' }, f.name),
        h('div', { class: `card-price${poor ? ' poor' : ''}` }, `$${fmt(f.price)}`),
        h('div', { class: 'card-meta' }, locked ? `Lv ${f.requiredLevel}` : `${f.w}×${f.h} · +${f.luxury} lux`),
      );
    });
    return [h('div', { class: 'panel-title' }, 'Build & Decorate', h('span', { class: 'placeholder-note' }, 'placeholder art')), tabs, h('div', { class: 'cards' }, ...items)];
  }

  private djPanel(): HTMLElement[] {
    const s = this.game.state;
    const now = Date.now();
    const playing = dj.isPlaying(s, now);
    const len = dj.djSetLength(s);
    const bassCd = dj.cooldownLeft(s.dj.lastDropBassAt, tuning.dropBassCooldownMs, now);
    const dedCd = dj.cooldownLeft(s.dj.lastDedicateAt, tuning.dedicateCooldownMs, now);
    const genres = h(
      'div',
      { class: 'genres' },
      ...GENRES.map((g) =>
        h('button', { class: `genre${s.dj.genre === g ? ' active' : ''}`, onclick: () => (playing ? this.game.changeGenre(g) : this.game.startSet(g)) }, GENRE_LABELS[g]),
      ),
    );
    const status: (string | HTMLElement)[] =
      len === null
        ? ['Place a DJ booth from the Build menu.']
        : playing
          ? [`Now playing ${GENRE_LABELS[s.dj.genre]} — `, h('span', { class: 'dj-countdown' }, mmss(dj.timeRemaining(s, now))), ' left']
          : s.dj.setEndsAt
            ? ['Your set has finished. Start a new one to keep guests dancing!']
            : [`Pick a genre to start a ${mmss(len)} set.`];
    return [
      h('div', { class: 'panel-title' }, 'DJ Booth'),
      h('div', { class: 'dj-status' }, ...status),
      genres,
      h(
        'div',
        { class: 'dj-actions' },
        h('button', { class: 'btn primary', disabled: playing || len === null, onclick: () => this.game.startSet(s.dj.genre) }, s.dj.setEndsAt ? 'Restart Set' : 'Start Set'),
        h('button', { class: 'btn', disabled: !playing || bassCd > 0, onclick: () => this.game.dropTheBass(), title: 'Sends guests to the bar' }, bassCd > 0 ? `Drop the Bass (${Math.ceil(bassCd / 1000)}s)` : 'Drop the Bass'),
        h(
          'button',
          {
            class: `btn${this.ix.mode.kind === 'dedicate' ? ' active' : ''}`,
            disabled: !playing || dedCd > 0,
            title: 'Click a guest to raise their happiness',
            onclick: () => this.ix.setMode(this.ix.mode.kind === 'dedicate' ? { kind: 'normal' } : { kind: 'dedicate' }),
          },
          dedCd > 0 ? `Dedicate Song (${Math.ceil(dedCd / 1000)}s)` : 'Dedicate Song',
        ),
      ),
      h('div', { class: 'placeholder-note' }, 'No music audio yet - original songs are not used.'),
    ];
  }

  private staffPanel(): HTMLElement[] {
    const s = this.game.state;
    const bars = s.furniture.filter((f) => getFurnitureDef(f.catalogId)?.kind === 'bar');
    const rows = s.staff.map((m) =>
      h(
        'div',
        { class: 'staff-row' },
        h('span', { class: 'icon', html: ICON.staff }),
        h('b', {}, m.name),
        h('span', { class: 'muted' }, 'Bartender'),
        h(
          'select',
          {
            'aria-label': `Assign ${m.name}`,
            onchange: (e: Event) => {
              const v = (e.target as HTMLSelectElement).value;
              this.game.assignBartender(m.id, v || null);
            },
          },
          h('option', { value: '', selected: m.barId === null }, '— Unassigned —'),
          ...bars.map((b) => h('option', { value: b.id, selected: m.barId === b.id }, `${getFurnitureDef(b.catalogId)!.name} (${b.col},${b.row})`)),
        ),
      ),
    );
    return [
      h('div', { class: 'panel-title' }, 'Staff'),
      h('div', { class: 'staff-list' }, ...rows),
      h('div', { class: 'dj-actions' }, h('button', { class: 'btn primary', onclick: () => this.game.hireBartender() }, `Hire Bartender ($${fmt(tuning.bartenderHireCost)})`)),
      h('div', { class: 'placeholder-note' }, 'Bouncers arrive in a later phase. The original hired Facebook friends; this build uses NPC staff.'),
    ];
  }

  // ---- context panel --------------------------------------------------------
  private renderContext(): void {
    const sel = this.ix.selection;
    const s = this.game.state;
    if (!sel || this.ix.mode.kind !== 'normal') {
      this.context.classList.add('hidden');
      return;
    }
    if (sel.kind === 'guest') {
      const g = this.game.sim.guests.find((x) => x.id === sel.id);
      if (!g) {
        this.context.classList.add('hidden');
        return;
      }
      const mood = moodOf(g.happiness, tuning.happyThreshold, tuning.unhappyThreshold);
      const playing = dj.isPlaying(s, Date.now());
      swap(this.context, [
        h('div', { class: 'ctx-title' }, `Guest ${g.id.slice(1)}`, h('span', { class: `mood ${mood}` }, mood)),
        h('div', { class: 'ctx-line ctx-state' }, STATE_LABELS[g.state] ?? g.state),
        h('div', { class: 'ctx-line' }, `Loves ${GENRE_LABELS[g.prefGenre]}`),
        this.bar('Happiness', g.happiness, '#7dffa0'),
        this.bar('Thirst', g.thirst, '#7df9ff'),
        h('div', { class: 'ctx-actions' }, h('button', { class: 'btn', disabled: !playing, onclick: () => this.game.dedicateSong(g.id) }, 'Dedicate Song')),
      ]);
      this.context.classList.remove('hidden');
      return;
    }
    const f = s.furniture.find((x) => x.id === sel.id);
    const def = f && getFurnitureDef(f.catalogId);
    if (!f || !def) {
      this.context.classList.add('hidden');
      return;
    }
    const extra: HTMLElement[] = [];
    if (def.kind === 'bar') {
      const bt = bartenderForBar(s, f.id);
      extra.push(h('div', { class: 'ctx-line' }, bt ? `Bartender: ${bt.name}` : 'No bartender! Assign one in Staff.'));
      extra.push(h('div', { class: 'ctx-line' }, `Queue: ${this.game.sim.queues.get(f.id)?.length ?? 0}`));
    }
    if (def.kind === 'dj') extra.push(h('div', { class: 'ctx-line' }, `Set length ${mmss(def.djSetMs ?? tuning.defaultDjSetMs)}`));
    swap(this.context, [
      h('div', { class: 'ctx-title' }, def.name),
      h('div', { class: 'ctx-line' }, `+${def.luxury} luxury · ${def.w}×${def.h}`),
      ...extra,
      h(
        'div',
        { class: 'ctx-actions' },
        h('button', { class: 'btn', onclick: () => this.ix.setMode({ kind: 'move', furnitureId: f.id, facing: this.live(f.id)?.facing ?? f.facing }) }, 'Move'),
        features.rotation && (def.w !== def.h)
          ? h('button', {
              class: 'btn',
              onclick: () => {
                const cur = this.live(f.id);
                if (cur) this.game.move(cur.id, cur.col, cur.row, cur.facing === 0 ? 1 : 0);
              },
            }, 'Rotate')
          : null,
        h(
          'button',
          {
            class: 'btn danger',
            onclick: async () => {
              if (await this.confirm(`Sell ${def.name} for $${fmt(sellRefund(f.catalogId))}?`, 'Sell')) {
                if (this.game.sell(f.id).ok) this.ix.select(null);
              }
            },
          },
          `Sell $${fmt(sellRefund(f.catalogId))}`,
        ),
      ),
    ]);
    this.context.classList.remove('hidden');
  }

  /** Current version of a furniture item (closures may outlive a state change). */
  private live(id: string) {
    return this.game.state.furniture.find((x) => x.id === id);
  }

  private bar(label: string, v: number, color: string): HTMLElement {
    return h('div', { class: 'ctx-bar' }, h('span', {}, label), h('div', { class: 'meter' }, h('div', { class: 'meter-fill', style: `width:${Math.round(v)}%;background:${color}` })));
  }

  private renderModeBar(): void {
    const m = this.ix.mode;
    const text =
      m.kind === 'place'
        ? `Placing ${getFurnitureDef(m.catalogId)?.name} — click a tile to buy${features.rotation ? ', R to rotate' : ''}, Esc / right-click to cancel`
        : m.kind === 'move'
          ? `Moving — click a tile to drop${features.rotation ? ', R to rotate' : ''}, Esc to cancel (no charge)`
          : m.kind === 'dedicate'
            ? 'Dedicate Song — click a guest. Esc to cancel.'
            : '';
    this.modeBar.textContent = text;
    this.modeBar.classList.toggle('hidden', !text);
    if (text) this.modeBar.append(h('button', { class: 'btn tiny', onclick: () => this.ix.setMode({ kind: 'normal' }) }, 'Cancel'));
    if (this.openPanel === 'build') this.renderPanel();
  }

  // ---- modals ---------------------------------------------------------------
  confirm(message: string, okLabel = 'OK', danger = true): Promise<boolean> {
    return new Promise((resolve) => {
      const done = (v: boolean) => {
        el.remove();
        resolve(v);
      };
      const el = h(
        'div',
        { class: 'modal-backdrop' },
        h(
          'div',
          { class: 'modal small', role: 'alertdialog' },
          h('div', { class: 'modal-body' }, message),
          h('div', { class: 'modal-actions' }, h('button', { class: 'btn', onclick: () => done(false) }, 'Cancel'), h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => done(true) }, okLabel)),
        ),
      );
      document.body.append(el);
      (el.querySelector('.btn') as HTMLElement)?.focus();
    });
  }

  notice(title: string, body: string): void {
    const el = h(
      'div',
      { class: 'modal-backdrop' },
      h('div', { class: 'modal small' }, h('div', { class: 'modal-title' }, title), h('div', { class: 'modal-body' }, body), h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', onclick: () => el.remove() }, 'OK'))),
    );
    document.body.append(el);
  }

  private openDressingRoom(): void {
    document.body.append(openDressingRoom(this.game.state.appearance, (a) => this.game.saveAppearance(a), () => {}));
  }

  private openSettings(): void {
    const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'hidden' }) as HTMLInputElement;
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const r = this.repo.parse(await file.text());
      if (r.status !== 'ok') {
        this.notice('Import failed', r.status === 'corrupt' ? `That save could not be loaded: ${r.reason}. Your current club is unchanged.` : 'Empty file.');
        return;
      }
      if (await this.confirm('Replace your current club with the imported save?', 'Import')) {
        this.game.replaceState(r.state);
        el.remove();
      }
    });
    const el = h(
      'div',
      { class: 'modal-backdrop' },
      h(
        'div',
        { class: 'modal' },
        h('div', { class: 'modal-title' }, 'Settings'),
        h(
          'div',
          { class: 'settings-grid' },
          h(
            'button',
            {
              class: 'btn',
              onclick: () => {
                const blob = new Blob([this.repo.exportJson(this.game.state)], { type: 'application/json' });
                const a = h('a', { href: URL.createObjectURL(blob), download: 'nightclub-revive-save.json' });
                a.click();
                URL.revokeObjectURL(a.href);
              },
            },
            'Export save',
          ),
          h('button', { class: 'btn', onclick: () => fileInput.click() }, 'Import save'),
          h('button', { class: 'btn', onclick: () => this.ix.toggleDebug() }, 'Toggle debug overlay'),
          h(
            'button',
            {
              class: 'btn danger',
              onclick: async () => {
                if (await this.confirm('Reset your club? This deletes your saved progress and cannot be undone.', 'Reset club')) {
                  this.repo.clear();
                  location.reload();
                }
              },
            },
            'Reset club…',
          ),
          fileInput,
        ),
        h(
          'div',
          { class: 'credits' },
          h('b', {}, 'NightClub Revive'),
          ' is an unofficial fan reconstruction of Nightclub City (Booyah, 2010), rebuilt from public walkthroughs and reviews. It contains no original game code, art or music. All art is placeholder/replacement art. Balance values are proposed, not historical — see docs/EVIDENCE_REGISTER.md.',
        ),
        h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', onclick: () => el.remove() }, 'Close')),
      ),
    );
    document.body.append(el);
  }

  private showTutorial(): void {
    const el = h(
      'div',
      { class: 'tutorial' },
      h('div', { class: 'modal-title' }, 'Welcome to your club!'),
      h(
        'ol',
        {},
        h('li', {}, 'Open the ', h('b', {}, 'DJ'), ' menu and pick a genre to start a set — guests dance while music plays.'),
        h('li', {}, 'Guests get thirsty and buy drinks at staffed bars. Keep the ', h('b', {}, 'drink supply'), ' stocked.'),
        h('li', {}, 'Use ', h('b', {}, 'Drop the Bass'), ' to send everyone to the bar, and ', h('b', {}, 'Dedicate Song'), ' to cheer up a guest.'),
        h('li', {}, 'Spend cash in ', h('b', {}, 'Build'), ' to add luxury. Drag to pan, scroll to zoom.'),
      ),
      h(
        'button',
        {
          class: 'btn primary',
          onclick: () => {
            this.game.dismissTutorial();
            el.remove();
          },
        },
        "Let's party",
      ),
    );
    this.root.append(el);
  }

  selectGuest(id: string): void {
    this.ix.select({ kind: 'guest', id });
  }
  selectFurniture(id: string): void {
    this.ix.select({ kind: 'furniture', id });
  }
}
