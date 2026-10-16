import { MIX_LABELS, type MusicPlayer } from '../audio/music';
import { CELEBRITIES, getCelebrity } from '../data/celebrities';
import { celebrityPhase } from '../domain/celebrity';
import { CATEGORY_LABELS, FURNITURE, getFurnitureDef, type FurnitureCategory } from '../data/furnitureCatalog';
import { LEVEL_TITLES, WORKER_SLOT_LEVELS } from '../data/progression';
import { tuning } from '../data/tuning';
import type { AvatarAppearance } from '../data/appearanceCatalog';
import { stockCapacity } from '../domain/bar';
import { computeLuxury } from '../domain/club';
import * as dj from '../domain/dj';
import { features, sellRefund } from '../domain/economy';
import type { Game, GameEvent } from '../domain/game';
import type { Guest } from '../domain/guests/guest';
import { xpProgress } from '../domain/progression';
import { bartenderForBar, workerSlots } from '../domain/staff';
import { GENRES, GENRE_LABELS, type Genre } from '../domain/types';
import type { SaveRepository } from '../persistence/SaveRepository';
import { fmt, h, mmss } from './dom';
import { openDressingRoom } from './dressingRoom';
import { ICONS } from './icons';
import type { Interaction } from './interaction';
import { furnitureThumb, portrait } from './portrait';
import { staffAppearance } from './staffLook';

/**
 * Replace a container's children only if the resulting markup differs. Rebuilding
 * identical buttons mid-click would swallow the click, so unchanged UI is left alone.
 */
function swap(container: HTMLElement, nodes: (HTMLElement | null)[]): void {
  const real = nodes.filter((n): n is HTMLElement => n !== null);
  // Ticking values (timers, happiness...) are marked data-live and excluded from
  // the signature; when the structure is unchanged they are patched in place.
  const sig = real
    .map((n) => n.outerHTML.replace(/<canvas[^>]*>/g, '<canvas>').replace(/(<[^>]+data-live[^>]*>)[^<]*/g, '$1'))
    .join('');
  if (container.dataset.sig === sig) {
    const fresh = real.flatMap((n) => [...n.querySelectorAll<HTMLElement>('[data-live]')]);
    container.querySelectorAll<HTMLElement>('[data-live]').forEach((el, i) => {
      const v = fresh[i]?.textContent ?? '';
      if (el.textContent !== v) el.textContent = v;
    });
    return;
  }
  container.dataset.sig = sig;
  container.replaceChildren(...real);
}

const live = (text: string) => h('span', { 'data-live': '' }, text);

const icon = (svg: string, cls = 'icon') => h('span', { class: cls, html: svg });

/** PROPOSED tutorial guide (an original character, not the original game's guide). */
const GUIDE: AvatarAppearance = { gender: 'f', skin: '#f2c9a0', hairStyle: 'bob', hairColor: '#8a4cff', top: '#ff3df2', bottom: '#222222', shoes: '#ffffff' };

const CATEGORY_ICONS: Record<FurnitureCategory, string> = {
  floor: ICONS.catFloor,
  dj: ICONS.catDj,
  bar: ICONS.catBar,
  seating: ICONS.catSeat,
  decor: ICONS.catDecor,
};

/** Original lines in the spirit of the guest speech bubbles seen in screenshots. */
function quoteFor(g: Guest, game: Game): string {
  const s = game.state;
  const playing = dj.isPlaying(s, Date.now());
  const queue = g.barId ? (game.sim.queues.get(g.barId)?.length ?? 0) : 0;
  if (g.guestClass === 'Celebrity') {
    const lines = ['Love this place! Next round is on me!', 'No photos please... okay, ONE photo.', 'This DJ is better than my last tour.', 'I might just buy this club.'];
    return lines[Math.floor(Date.now() / 6000) % lines.length];
  }
  switch (g.state) {
    case 'TROUBLEMAKER':
      return "Hey! Who are YOU looking at?! This place is mine now!";
    case 'QUEUING_FOR_BAR':
      return queue > 3 ? 'This line is huge! Somebody hire another bartender.' : 'One drink please - make it a strong one!';
    case 'THIRSTY':
      return 'I could really use a drink right now.';
    case 'DRINKING':
      return 'Cheers! This place is great.';
    case 'LEAVING':
      return g.happiness >= tuning.happyThreshold ? 'Best night ever. I am so coming back!' : "I'm out of here...";
    case 'DANCING':
      if (!playing) return 'Did the DJ fall asleep?';
      return g.prefGenre === s.dj.genre ? `I LOVE ${GENRE_LABELS[g.prefGenre]}! Turn it up!` : `This is fun, but I'd rather hear ${GENRE_LABELS[g.prefGenre]}.`;
    case 'SITTING_OR_SOCIALIZING':
      return 'Just hanging out with my crew.';
    default:
      return g.happiness < tuning.unhappyThreshold ? 'This club needs more energy...' : 'Nice club! Where is the dance floor?';
  }
}

type Card = { kind: 'dj' } | { kind: 'guest'; id: string } | { kind: 'furniture'; id: string } | null;

export class UI {
  private root: HTMLElement;
  private top = h('div', { class: 'hud-top' });
  private quick = h('div', { class: 'quick' });
  private tube = h('div', { class: 'tube' });
  private tools = h('div', { class: 'tools' });
  private nowPlaying = h('div', { class: 'now-playing' });
  private dock = h('div', { class: 'dock' });
  private build = h('div', { class: 'buildbar hidden' });
  private card = h('div', { class: 'card hidden' });
  private toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
  private modeBar = h('div', { class: 'mode-bar hidden' });
  private tooltip = h('div', { class: 'tip hidden' });
  private buildCategory: FurnitureCategory = 'floor';
  private cardState: Card = null;
  private recentToasts = new Map<string, number>();
  private refs: Record<string, HTMLElement> = {};
  private portraitKey = '';

  constructor(
    private readonly game: Game,
    private readonly ix: Interaction,
    private readonly repo: SaveRepository,
    private readonly music: MusicPlayer,
    mount: HTMLElement,
  ) {
    this.root = mount;
    this.root.append(this.top, this.quick, this.tube, this.tools, this.nowPlaying, this.card, this.build, this.dock, this.modeBar, this.toasts, this.tooltip);
    this.buildStatic();
    game.on((e) => this.onEvent(e));
    ix.on(() => {
      this.renderModeBar();
      const sel = this.ix.selection;
      if (sel?.kind === 'guest') this.cardState = { kind: 'guest', id: sel.id };
      else if (sel?.kind === 'furniture') this.cardState = getFurnitureDef(this.game.state.furniture.find((f) => f.id === sel.id)?.catalogId ?? '')?.kind === 'dj' ? { kind: 'dj' } : { kind: 'furniture', id: sel.id };
      else if (this.cardState?.kind !== 'dj') this.cardState = null;
      this.renderCard();
    });
    // Audio can only start after a user gesture.
    window.addEventListener('pointerdown', () => this.music.unlock());
    this.renderAll();
    setInterval(() => this.refreshLive(), 250);
    if (!game.state.tutorialDismissed) this.showTutorial();
  }

  // ---- events ---------------------------------------------------------------
  private onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'stateChanged':
        this.renderHud();
        if (!this.build.classList.contains('hidden')) this.renderBuild();
        this.renderCard();
        break;
      case 'notice':
        this.toast(e.message, e.tone);
        break;
      case 'levelUp':
        this.showLevelUp(e.level, e.reward);
        break;
      case 'outOfDrinks':
        this.toast('The bar is out of drinks! Click the drink tube to restock.', 'error');
        break;
      case 'noBartender':
        this.toast('A guest wanted a drink but no bar is staffed.', 'error');
        break;
      case 'troubleStarted':
        if (!e.covered) this.toast('A troublemaker is causing a scene! Click them and Send Bouncer.', 'error', 4000);
        break;
      case 'troubleUnresolved':
        this.toast(`A troublemaker stormed out. Popularity -${tuning.troublePopularityPenalty}`, 'error');
        break;
      case 'celebArrived':
        this.toast(`★ ${getCelebrity(e.celebId)?.name} has arrived! ★`, 'good', 4000);
        break;
      case 'celebLeft':
        this.toast(`${getCelebrity(e.celebId)?.name} loved your club! Popularity +${e.bonus}`, 'good', 4000);
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
    this.renderCard();
    this.renderModeBar();
  }

  // ---- static chrome ----------------------------------------------------------
  private buildStatic(): void {
    const r = this.refs;
    // Top-left: portrait, level badge, XP bar
    r.portrait = h('div', { class: 'player-portrait', title: 'Dress Up', onclick: () => this.openDressingRoom() });
    r.level = h('div', { class: 'level-badge' });
    r.xpFill = h('div', { class: 'xp-fill' });
    r.xpText = h('div', { class: 'xp-text' });
    r.xpTitle = h('div', { class: 'xp-title' });
    // Top-centre cash, top-right scores
    r.cash = h('div', { class: 'cash-text' });
    r.pop = h('div', { class: 'score-num' });
    r.lux = h('div', { class: 'score-num' });
    this.top.append(
      h('div', { class: 'player' }, r.portrait, r.level, h('div', { class: 'xp' }, h('div', { class: 'xp-bar' }, r.xpFill, r.xpText), r.xpTitle)),
      h('div', { class: 'cash', title: 'Cash' }, icon(ICONS.money, 'money-icon'), r.cash),
      h(
        'div',
        { class: 'scores' },
        h('div', { class: 'score', title: 'Popularity: raises how many guests come and the cover charge they pay' }, r.pop, h('div', { class: 'score-label' }, 'POPULARITY')),
        h('div', { class: 'score', title: 'Luxury: from your furniture; raises tips' }, r.lux, h('div', { class: 'score-label' }, 'LUXURY')),
      ),
    );

    // DJ quick buttons under the portrait (record + timer, speaker, mic)
    r.timer = h('div', { class: 'quick-timer' });
    r.qRecord = h('button', { class: 'qbtn', title: 'Refresh Set', 'aria-label': 'Refresh Set', onclick: () => this.openGenrePicker() }, icon(ICONS.record));
    r.qBass = h('button', { class: 'qbtn', title: 'Drop Bass: send guests to the bar', 'aria-label': 'Drop Bass', onclick: () => this.game.dropTheBass() }, icon(ICONS.speaker));
    r.qMic = h('button', { class: 'qbtn', title: 'Dedicate Song: click a guest to cheer them up', 'aria-label': 'Dedicate Song', onclick: () => this.toggleDedicate() }, icon(ICONS.mic));
    this.quick.append(h('div', { class: 'qcol' }, r.qRecord, r.timer), r.qBass, r.qMic);

    // Drink tube on the right edge
    r.tubeFill = h('div', { class: 'tube-fill' });
    r.tubeText = h('div', { class: 'tube-text' });
    this.tube.append(
      h('button', { class: 'tube-top', title: `Restock: +${tuning.barRefillAmount} drinks for $${tuning.barRefillCost}`, 'aria-label': 'Restock drinks', onclick: () => this.game.refill() }, icon(ICONS.cocktail, 'tube-glass'), icon(ICONS.plus, 'tube-plus')),
      h('div', { class: 'tube-body', title: 'Drink supply' }, r.tubeFill),
      r.tubeText,
    );

    // Tool column (zoom, visibility/debug, music, settings)
    r.mute = h('button', { class: 'tool', title: 'Music on/off', 'aria-label': 'Music on/off', onclick: () => this.toggleMute() });
    this.tools.append(
      h('button', { class: 'tool', title: 'Zoom in', 'aria-label': 'Zoom in', onclick: () => this.ix.zoomBy?.(1.15) }, icon(ICONS.zoomIn)),
      h('button', { class: 'tool', title: 'Zoom out', 'aria-label': 'Zoom out', onclick: () => this.ix.zoomBy?.(1 / 1.15) }, icon(ICONS.zoomOut)),
      h('button', { class: 'tool', title: 'Debug overlay', 'aria-label': 'Debug overlay', onclick: () => this.ix.toggleDebug() }, icon(ICONS.eye)),
      r.mute,
      h('button', { class: 'tool', title: 'Settings', 'aria-label': 'Settings', onclick: () => this.openSettings() }, icon(ICONS.gear)),
    );
    this.renderMute();

    // Now playing (bottom-left)
    r.npArt = h('div', { class: 'np-art', html: ICONS.note });
    r.npTitle = h('div', { class: 'np-title' });
    r.npSub = h('div', { class: 'np-sub' });
    this.nowPlaying.append(r.npArt, h('div', {}, r.npTitle, r.npSub));
    this.nowPlaying.addEventListener('click', () => this.showDjCard());

    // Dock: character-icon buttons on a sky-blue band
    const dockBtn = (svg: string, label: string, id: string, onclick: () => void, soon = false) =>
      h('button', { class: `dock-btn${soon ? ' soon' : ''}`, 'data-id': id, title: label, 'aria-label': label, 'aria-disabled': soon ? 'true' : undefined, onclick }, icon(svg, 'dock-icon'), h('span', { class: 'dock-lbl' }, label));
    this.dock.append(
      h('div', { class: 'dock-band' }),
      h(
        'div',
        { class: 'dock-row' },
        dockBtn(ICONS.dress, 'Dress Up', 'dress', () => this.openDressingRoom()),
        dockBtn(ICONS.dj, 'DJ', 'dj', () => this.showDjCard()),
        dockBtn(ICONS.workers, 'Workers', 'workers', () => this.openWorkers()),
        dockBtn(ICONS.build, 'Decorate', 'build', () => this.openBuild()),
        dockBtn(ICONS.celebs, 'Celebrities', 'celebs', () => this.openCelebrities()),
      ),
    );
  }

  // ---- HUD ------------------------------------------------------------------
  renderHud(): void {
    const s = this.game.state;
    const r = this.refs;
    const xp = xpProgress(s.xp);
    r.level.textContent = String(s.level);
    r.xpFill.style.width = `${Math.min(100, (xp.into / xp.needed) * 100)}%`;
    r.xpText.textContent = `${fmt(xp.into)} / ${fmt(xp.needed)}`;
    r.xpTitle.textContent = LEVEL_TITLES[s.level] ?? '';
    r.cash.textContent = `$${fmt(s.cash)}`;
    r.pop.textContent = fmt(s.popularity);
    r.lux.textContent = fmt(computeLuxury(s));
    const cap = stockCapacity(s);
    const pct = Math.round((s.stock.drinks / cap) * 100);
    r.tubeFill.style.height = `${pct}%`;
    r.tubeText.textContent = `${s.stock.drinks}/${cap}`;
    this.tube.classList.toggle('low', s.stock.drinks <= 20);
    const key = JSON.stringify(s.appearance);
    if (key !== this.portraitKey) {
      this.portraitKey = key;
      r.portrait.replaceChildren(portrait(s.appearance, 64));
    }
    this.renderDjStatus();
  }

  private renderDjStatus(): void {
    const s = this.game.state;
    const r = this.refs;
    const now = Date.now();
    const playing = dj.isPlaying(s, now);
    r.timer.textContent = playing ? mmss(dj.timeRemaining(s, now)) : 'Off';
    (r.qBass as HTMLButtonElement).disabled = !playing || dj.cooldownLeft(s.dj.lastDropBassAt, tuning.dropBassCooldownMs, now) > 0;
    (r.qMic as HTMLButtonElement).disabled = !playing || dj.cooldownLeft(s.dj.lastDedicateAt, tuning.dedicateCooldownMs, now) > 0;
    r.qRecord.classList.toggle('attention', !playing);
    r.npTitle.textContent = playing ? MIX_LABELS[s.dj.genre] : 'No set playing';
    r.npSub.textContent = playing ? `Original loop · ${mmss(dj.timeRemaining(s, now))} left` : 'Click to start a set';
    this.nowPlaying.classList.toggle('on', playing);
  }

  /** Timer-driven refresh: text updates in place; music follows the set. */
  private refreshLive(): void {
    this.renderHud();
    const s = this.game.state;
    const playing = dj.isPlaying(s, Date.now());
    if (playing && !this.music.muted) this.music.play(s.dj.genre);
    else this.music.stop();
    if (this.cardState?.kind === 'guest' || this.cardState?.kind === 'dj') this.renderCard();
  }

  private toggleMute(): void {
    this.music.setMuted(!this.music.muted);
    try {
      localStorage.setItem('nightclub-revive.muted', this.music.muted ? '1' : '0');
    } catch {
      /* per-viewer convenience only */
    }
    this.renderMute();
  }

  private renderMute(): void {
    this.refs.mute.innerHTML = this.music.muted ? ICONS.noteOff : ICONS.note;
  }

  private toggleDedicate(): void {
    this.ix.setMode(this.ix.mode.kind === 'dedicate' ? { kind: 'normal' } : { kind: 'dedicate' });
  }

  // ---- context cards ----------------------------------------------------------
  showDjCard(): void {
    this.ix.select(null);
    this.cardState = { kind: 'dj' };
    this.renderCard();
  }

  private closeCard(): void {
    this.cardState = null;
    this.ix.select(null);
    this.renderCard();
  }

  private cardShell(portraitEl: HTMLElement, title: string, sub: string | HTMLElement | null, body: (HTMLElement | null)[], footer?: string): HTMLElement[] {
    const out: HTMLElement[] = [
      h('button', { class: 'card-x', title: 'Close', 'aria-label': 'Close', onclick: () => this.closeCard() }, icon(ICONS.close)),
      h('div', { class: 'card-portrait' }, portraitEl),
      h('div', { class: 'card-main' }, h('div', { class: 'card-title' }, title), sub ? h('div', { class: 'card-sub' }, sub) : null, ...body),
    ];
    if (footer) out.push(h('div', { class: 'card-footer' }, footer));
    return out;
  }

  private renderCard(): void {
    const c = this.cardState;
    const s = this.game.state;
    if (!c || this.ix.mode.kind === 'place' || this.ix.mode.kind === 'move') {
      this.card.classList.add('hidden');
      return;
    }
    let nodes: HTMLElement[] | null = null;
    if (c.kind === 'dj') {
      const now = Date.now();
      const playing = dj.isPlaying(s, now);
      const hasBooth = dj.djSetLength(s) !== null;
      const bassCd = dj.cooldownLeft(s.dj.lastDropBassAt, tuning.dropBassCooldownMs, now);
      const dedCd = dj.cooldownLeft(s.dj.lastDedicateAt, tuning.dedicateCooldownMs, now);
      const row = (svg: string, label: string, cd: number, disabled: boolean, onclick: () => void, title: string) =>
        h('button', { class: 'dj-row', disabled, title, onclick }, icon(svg, 'dj-row-icon'), h('span', {}, label, cd > 0 ? h('span', {}, ' (', live(String(Math.ceil(cd / 1000))), 's)') : ''));
      nodes = this.cardShell(
        portrait(s.appearance, 92, { full: true, headphones: true }),
        'You',
        playing ? h('span', {}, `DJ · ${MIX_LABELS[s.dj.genre]} · `, live(mmss(dj.timeRemaining(s, now)))) : 'DJ',
        [
          row(ICONS.record, 'Refresh Set', 0, !hasBooth, () => this.openGenrePicker(), hasBooth ? 'Pick a mix and start a set' : 'Place a DJ booth first'),
          row(ICONS.speaker, 'Drop Bass', bassCd, !playing || bassCd > 0, () => this.game.dropTheBass(), 'Send guests to the bar'),
          row(ICONS.mic, 'Dedicate Song', dedCd, !playing || dedCd > 0, () => this.toggleDedicate(), 'Then click a guest to cheer them up'),
        ],
      );
    } else if (c.kind === 'guest') {
      const g = this.game.sim.guests.find((x) => x.id === c.id);
      if (g) {
        nodes = this.cardShell(
          portrait(g.appearance, 92, { full: true }),
          g.name,
          null,
          [
            h('div', { class: 'bubble' }, live(`"${quoteFor(g, this.game)}"`)),
            g.state === 'TROUBLEMAKER'
              ? h('div', { class: 'card-actions' }, h('button', { class: 'btn danger', onclick: () => this.game.sendBouncer(g.id) }, 'Send Bouncer'))
              : null,
            h(
              'div',
              { class: 'stats' },
              h('div', {}, h('span', {}, 'Spent:'), h('b', {}, live(`$${fmt(g.spent)}`))),
              h('div', {}, h('span', {}, 'Tip Rate:'), h('b', {}, `${Math.round(g.tipRate * 100)}%`)),
              h('div', {}, h('span', {}, 'Happiness:'), h('b', {}, live(String(Math.round(g.happiness))))),
            ),
          ],
          g.state === 'TROUBLEMAKER' ? 'Troublemaker' : g.guestClass === 'Celebrity' ? '★ Celebrity ★' : g.guestClass,
        );
      }
    } else if (c.kind === 'furniture') {
      const f = s.furniture.find((x) => x.id === c.id);
      const def = f && getFurnitureDef(f.catalogId);
      if (f && def) {
        const extra: HTMLElement[] = [];
        if (def.kind === 'bar') {
          const bt = bartenderForBar(s, f.id);
          extra.push(h('div', { class: 'card-line' }, bt ? `Bartender: ${bt.name} (${bt.mode === 'tricks' ? 'Tricks' : 'Speed'})` : 'No bartender - assign one in Workers'));
          extra.push(h('div', { class: 'card-line' }, 'Waiting: ', live(String(this.game.sim.queues.get(f.id)?.length ?? 0))));
        }
        nodes = this.cardShell(furnitureThumb(def, 92), def.name, `Luxury: ${def.luxury}`, [
          ...extra,
          h(
            'div',
            { class: 'card-actions' },
            h('button', { class: 'btn', onclick: () => this.ix.setMode({ kind: 'move', furnitureId: f.id, facing: this.live(f.id)?.facing ?? f.facing }) }, 'Move'),
            features.rotation && def.w !== def.h
              ? h(
                  'button',
                  {
                    class: 'btn',
                    onclick: () => {
                      const cur = this.live(f.id);
                      if (cur) this.game.move(cur.id, cur.col, cur.row, cur.facing === 0 ? 1 : 0);
                    },
                  },
                  'Rotate',
                )
              : null,
            h(
              'button',
              {
                class: 'btn danger',
                onclick: async () => {
                  if (await this.confirm(`Sell ${def.name} for $${fmt(sellRefund(f.catalogId))}?`, 'Sell')) {
                    if (this.game.sell(f.id).ok) this.closeCard();
                  }
                },
              },
              `Sell $${fmt(sellRefund(f.catalogId))}`,
            ),
          ),
        ]);
      }
    }
    if (!nodes) {
      this.card.classList.add('hidden');
      return;
    }
    this.card.className = `card card-${c.kind}`;
    swap(this.card, nodes);
  }

  /** Current version of a furniture item (closures may outlive a state change). */
  private live(id: string) {
    return this.game.state.furniture.find((x) => x.id === id);
  }

  private openGenrePicker(): void {
    const s = this.game.state;
    if (dj.djSetLength(s) === null) {
      this.toast('Place a DJ booth first (Decorate).', 'error');
      return;
    }
    const playing = dj.isPlaying(s, Date.now());
    const pick = (g: Genre) => {
      this.music.unlock();
      if (playing) this.game.changeGenre(g);
      else this.game.startSet(g);
      el.remove();
    };
    const el = h(
      'div',
      { class: 'modal-backdrop' },
      h(
        'div',
        { class: 'modal small picker', role: 'dialog', 'aria-label': 'Pick a mix' },
        h('div', { class: 'modal-title' }, playing ? 'Switch Mix' : 'Refresh Set', h('button', { class: 'card-x', 'aria-label': 'Close', onclick: () => el.remove() }, icon(ICONS.close))),
        h('div', { class: 'modal-body' }, playing ? 'Switch the mix without restarting the timer.' : `Pick a mix. Your set plays for ${mmss(dj.djSetLength(s)!)}.`),
        h('div', { class: 'mixes' }, ...GENRES.map((g) => h('button', { class: `mix${s.dj.genre === g && playing ? ' active' : ''}`, onclick: () => pick(g) }, icon(ICONS.record, 'mix-icon'), MIX_LABELS[g]))),
      ),
    );
    document.body.append(el);
  }

  // ---- build mode -------------------------------------------------------------
  private openBuild(): void {
    this.closeCard();
    this.build.classList.remove('hidden');
    this.dock.classList.add('hidden');
    this.nowPlaying.classList.add('hidden');
    this.renderBuild();
  }

  private closeBuild(): void {
    this.build.classList.add('hidden');
    this.dock.classList.remove('hidden');
    this.nowPlaying.classList.remove('hidden');
    this.tooltip.classList.add('hidden');
    if (this.ix.mode.kind === 'place') this.ix.setMode({ kind: 'normal' });
  }

  private renderBuild(): void {
    const s = this.game.state;
    const cats = Object.keys(CATEGORY_LABELS) as FurnitureCategory[];
    const items = h('div', { class: 'items' });
    for (const f of FURNITURE.filter((x) => x.category === this.buildCategory)) {
      const locked = s.level < f.requiredLevel;
      const poor = s.cash < f.price;
      const selected = this.ix.mode.kind === 'place' && this.ix.mode.catalogId === f.id;
      const btn = h(
        'button',
        {
          class: `item${locked ? ' locked' : ''}${selected ? ' selected' : ''}`,
          'data-id': f.id,
          'aria-label': `${f.name}, $${f.price}, luxury ${f.luxury}${locked ? `, unlocks at level ${f.requiredLevel}` : ''}`,
          disabled: locked,
          onclick: () => {
            if (locked) return;
            this.ix.select(null);
            this.ix.setMode({ kind: 'place', catalogId: f.id, facing: 0 });
          },
        },
        h('div', { class: 'item-art' }, furnitureThumb(f, 70), locked ? icon(ICONS.lock, 'item-lock') : null),
        h('div', { class: `item-price${poor && !locked ? ' poor' : ''}` }, locked ? `Level ${f.requiredLevel}` : `$${fmt(f.price)}`),
      );
      btn.addEventListener('mouseenter', () => this.showTip(btn, f.name, [`Luxury: ${f.luxury}`, `Size: ${f.w}×${f.h}`, locked ? `Unlocks at level ${f.requiredLevel}` : poor ? 'Not enough cash' : '']));
      btn.addEventListener('mouseleave', () => this.tooltip.classList.add('hidden'));
      items.append(btn);
    }
    const scroll = (dir: number) => this.build.querySelector('.items')?.scrollBy({ left: dir * 300, behavior: 'smooth' });
    const nodes = [
      h(
        'div',
        { class: 'build-cats' },
        ...cats.map((c) =>
          h('button', { class: `cat${c === this.buildCategory ? ' active' : ''}`, title: CATEGORY_LABELS[c], 'aria-label': CATEGORY_LABELS[c], onclick: () => ((this.buildCategory = c), this.renderBuild()) }, icon(CATEGORY_ICONS[c], 'cat-icon')),
        ),
        h('div', { class: 'build-side' }, h('div', { class: 'score small' }, h('div', { class: 'score-num' }, fmt(computeLuxury(s))), h('div', { class: 'score-label' }, 'LUXURY')), h('button', { class: 'btn ok', onclick: () => this.closeBuild() }, 'Done')),
      ),
      h('div', { class: 'build-items' }, h('button', { class: 'arrow', 'aria-label': 'Scroll left', onclick: () => scroll(-1) }, icon(ICONS.arrowL)), items, h('button', { class: 'arrow', 'aria-label': 'Scroll right', onclick: () => scroll(1) }, icon(ICONS.arrowR))),
    ];
    const prevScroll = this.build.querySelector('.items')?.scrollLeft ?? 0;
    const before = this.build.dataset.sig;
    swap(this.build, nodes);
    if (before !== this.build.dataset.sig) {
      const it = this.build.querySelector('.items');
      if (it) it.scrollLeft = prevScroll;
    }
  }

  private showTip(anchor: HTMLElement, title: string, lines: string[]): void {
    const r = anchor.getBoundingClientRect();
    this.tooltip.replaceChildren(h('div', { class: 'tip-title' }, title), ...lines.filter(Boolean).map((l) => h('div', {}, l)));
    this.tooltip.classList.remove('hidden');
    const w = this.tooltip.offsetWidth;
    this.tooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
    this.tooltip.style.top = `${r.top - this.tooltip.offsetHeight - 12}px`;
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
            : m.kind === 'post'
              ? `Set bouncer post — click a tile. They cover ${tuning.bouncerRadius} tiles around it. Esc to cancel.`
              : '';
    this.modeBar.textContent = text;
    this.modeBar.classList.toggle('hidden', !text);
    if (text) this.modeBar.append(h('button', { class: 'btn tiny', onclick: () => this.ix.setMode({ kind: 'normal' }) }, 'Cancel'));
    if (!this.build.classList.contains('hidden')) this.renderBuild();
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
          h('div', { class: 'modal-actions' }, h('button', { class: 'btn', onclick: () => done(false) }, 'Cancel'), h('button', { class: `btn ${danger ? 'danger' : 'ok'}`, onclick: () => done(true) }, okLabel)),
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
      h('div', { class: 'modal small' }, h('div', { class: 'modal-title' }, title), h('div', { class: 'modal-body' }, body), h('div', { class: 'modal-actions' }, h('button', { class: 'btn ok', onclick: () => el.remove() }, 'OK'))),
    );
    document.body.append(el);
  }

  private showLevelUp(level: number, reward: number): void {
    const el = h(
      'div',
      { class: 'modal-backdrop' },
      h(
        'div',
        { class: 'modal levelup', role: 'dialog', 'aria-label': `Level ${level}` },
        h('div', { class: 'lv-num' }, String(level)),
        h('div', { class: 'lv-head' }, `YOU REACHED LEVEL ${level}!`),
        h('div', { class: 'lv-title' }, LEVEL_TITLES[level] ?? `Level ${level}`),
        h('div', { class: 'lv-reward' }, `$${fmt(reward)} more to spend!`),
        h('div', { class: 'lv-msg' }, level === 1 ? "Congratulations! Your club's open for business!" : 'Your club has grown. Check Decorate for new items!'),
        h('div', { class: 'modal-actions center' }, h('button', { class: 'btn ok big', onclick: () => el.remove() }, 'Continue')),
      ),
    );
    document.body.append(el);
  }

  private openDressingRoom(): void {
    document.body.append(openDressingRoom(this.game.state.appearance, (a) => this.game.saveAppearance(a), () => {}));
  }

  /**
   * Celebrities panel, laid out like the original (Pixnet screenshot): a star
   * row with "Booked Celebrities n / total", a "Currently in Town" box, and
   * level-gated celebrity cards. All VIPs are original fictional characters.
   */
  private openCelebrities(): void {
    const body = h('div', {});
    const render = () => {
      const s = this.game.state;
      const now = Date.now();
      const booked = CELEBRITIES.filter((c) => (s.celebrityWall[c.id] ?? 0) > 0).length;
      const b = s.celebrity;
      const phase = celebrityPhase(s, now);
      const cur = b ? getCelebrity(b.id) : undefined;
      const town = cur
        ? h(
            'div',
            { class: 'celeb-town-now' },
            portrait(cur.look, 72, { full: true }),
            h(
              'div',
              {},
              h('div', { class: 'celeb-name' }, cur.name),
              h('div', {}, cur.title),
              h('div', { class: 'celeb-status' }, phase === 'coming' ? `Arriving in ${Math.ceil((b!.arrivesAt - now) / 1000)}s` : phase === 'here' ? `In your club for ${mmss(b!.leavesAt - now)}` : 'Saying goodbye...'),
            ),
          )
        : h('div', { class: 'celeb-empty' }, 'Nobody yet. Book a star below to pack your club!');
      const cards = CELEBRITIES.map((c) => {
        const locked = s.level < c.requiredLevel;
        const visits = s.celebrityWall[c.id] ?? 0;
        return h(
          'div',
          { class: `celeb-card${locked ? ' locked' : ''}`, title: `${c.name} - ${c.title}` },
          visits ? h('div', { class: 'celeb-visits', title: 'Visits' }, `★×${visits}`) : null,
          h('div', { class: 'celeb-art' }, portrait(c.look, 76, { full: true }), locked ? icon(ICONS.lock, 'item-lock') : null),
          h('div', { class: 'celeb-name' }, c.name),
          h('div', { class: 'celeb-level' }, `Level ${c.requiredLevel}`),
          locked
            ? h('div', { class: 'celeb-price' }, `$${fmt(c.cost)}`)
            : h(
                'button',
                {
                  class: 'btn ok tiny',
                  disabled: !!b || s.cash < c.cost,
                  title: b ? 'One celebrity at a time' : s.cash < c.cost ? 'Not enough cash' : `Book for $${fmt(c.cost)}`,
                  onclick: () => {
                    if (this.game.bookCelebrity(c.id).ok) render();
                  },
                },
                `Book $${fmt(c.cost)}`,
              ),
        );
      });
      body.replaceChildren(
        h(
          'div',
          { class: 'celeb-head' },
          h('div', { class: 'celeb-stars' }, ...CELEBRITIES.map((c) => h('span', { class: (s.celebrityWall[c.id] ?? 0) > 0 ? 'on' : '' }, '★'))),
          h('div', { class: 'celeb-count' }, `Booked Celebrities: ${booked} / ${CELEBRITIES.length}`),
        ),
        h('div', { class: 'celeb-town' }, h('div', { class: 'celeb-town-title' }, 'Currently in Town:'), town),
        h('div', { class: 'celeb-cards' }, ...cards),
      );
    };
    const el = h(
      'div',
      { class: 'modal-backdrop' },
      h(
        'div',
        { class: 'modal panel-tabbed celeb-panel', role: 'dialog', 'aria-label': 'Celebrities' },
        h('div', { class: 'tab-label' }, icon(ICONS.celebs, 'tab-icon'), 'Celebrities'),
        h(
          'button',
          {
            class: 'btn ok corner',
            onclick: () => {
              clearInterval(timer);
              el.remove();
            },
          },
          'OK',
        ),
        body,
        h('div', { class: 'placeholder-note' }, 'All VIPs are original fictional characters. Celebrities visit for a few minutes, spend big, and add to your popularity when they leave.'),
      ),
    );
    render();
    // Only the status line ticks in place; the cards rebuild only when the
    // visit phase changes, so a click on "Book" is never lost to a rebuild.
    let lastPhase = celebrityPhase(this.game.state, Date.now());
    const timer = setInterval(() => {
      if (!document.body.contains(el)) return clearInterval(timer);
      const s = this.game.state;
      const now = Date.now();
      const phase = celebrityPhase(s, now);
      if (phase !== lastPhase) {
        lastPhase = phase;
        render();
        return;
      }
      const st = el.querySelector('.celeb-status');
      const b = s.celebrity;
      if (st && b) st.textContent = phase === 'coming' ? `Arriving in ${Math.ceil((b.arrivesAt - now) / 1000)}s` : phase === 'here' ? `In your club for ${mmss(b.leavesAt - now)}` : 'Saying goodbye...';
    }, 1000);
    document.body.append(el);
  }

  private openWorkers(): void {
    const render = () => {
      const s = this.game.state;
      const bars = s.furniture.filter((f) => getFurnitureDef(f.catalogId)?.kind === 'bar');
      const slots = WORKER_SLOT_LEVELS.map((lvl, i) => {
        const m = s.staff[i];
        if (m) {
          return h(
            'div',
            { class: 'wslot filled' },
            h('div', { class: 'w-portrait' }, portrait(staffAppearance(m), 64, { shades: m.role === 'bouncer' })),
            h('div', { class: 'w-role' }, m.role === 'bouncer' ? 'Bouncer' : 'Bar Tender'),
            h('div', { class: 'w-name' }, m.name),
            h(
              'button',
              {
                class: 'w-switch',
                onclick: () => {
                  this.game.switchRole(m.id);
                  render();
                },
              },
              m.role === 'bouncer' ? 'Switch to Bartender' : 'Switch to Bouncer',
            ),
            m.role === 'bouncer'
              ? h(
                  'button',
                  {
                    class: 'btn tiny',
                    title: `Pick where ${m.name} stands. They handle trouble within ${tuning.bouncerRadius} tiles.`,
                    onclick: () => {
                      el.remove();
                      this.ix.setMode({ kind: 'post', staffId: m.id });
                    },
                  },
                  'Set Post',
                )
              : h(
              'div',
              { class: 'w-bartender' },
              h(
                'div',
                { class: 'w-modes', role: 'group', 'aria-label': `${m.name}'s style` },
                ...(['tricks', 'speed'] as const).map((mode) =>
                  h(
                    'button',
                    {
                      class: `w-mode${m.mode === mode ? ' active' : ''}`,
                      'aria-pressed': m.mode === mode ? 'true' : 'false',
                      title: mode === 'tricks' ? `Tricks: ${tuning.tricksTipMultiplier}x tips, slightly slower` : 'Speed: serves twice as fast',
                      onclick: () => {
                        this.game.setBartenderMode(m.id, mode);
                        render();
                      },
                    },
                    mode === 'tricks' ? 'Tricks' : 'Speed',
                  ),
                ),
              ),
              h(
              'select',
              {
                class: 'w-assign',
                'aria-label': `Assign ${m.name}`,
                onchange: (e: Event) => {
                  this.game.assignBartender(m.id, (e.target as HTMLSelectElement).value || null);
                  render();
                },
              },
              h('option', { value: '', selected: m.barId === null }, 'Not working'),
              ...bars.map((b) => h('option', { value: b.id, selected: m.barId === b.id }, `${getFurnitureDef(b.catalogId)!.name} (${b.col},${b.row})`)),
            ),
            ),
          );
        }
        if (s.level >= lvl && i === s.staff.length) {
          return h(
            'div',
            { class: 'wslot open' },
            h('div', { class: 'w-plus' }, '+'),
            h(
              'button',
              {
                class: 'btn ok',
                onclick: () => {
                  this.game.hireBartender();
                  render();
                },
              },
              `Hire ($${fmt(tuning.bartenderHireCost)})`,
            ),
          );
        }
        return h('div', { class: 'wslot locked' }, icon(ICONS.lock, 'w-lock'), h('div', { class: 'w-level' }, s.level >= lvl ? 'Open' : `Level ${lvl}`));
      });
      body.replaceChildren(...slots);
    };
    const body = h('div', { class: 'wgrid' });
    const el = h(
      'div',
      { class: 'modal-backdrop' },
      h(
        'div',
        { class: 'modal panel-tabbed', role: 'dialog', 'aria-label': 'Workers' },
        h('div', { class: 'tab-label' }, icon(ICONS.workers, 'tab-icon'), 'Workers'),
        h('button', { class: 'btn ok corner', onclick: () => el.remove() }, 'OK'),
        body,
        h('div', { class: 'placeholder-note' }, `${workerSlots(this.game.state.level)} worker slots open. Bouncers throw out troublemakers within ${tuning.bouncerRadius} tiles of their post. The original hired Facebook friends; this build uses NPC staff.`),
      ),
    );
    render();
    document.body.append(el);
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
          ' is an unofficial fan reconstruction of Nightclub City (Booyah, 2010), rebuilt from public walkthroughs, reviews and screenshots. It contains no original game code, art or music: all art is drawn for this project, and the music is generated on the fly. See docs/EVIDENCE_REGISTER.md for what is historical and what is proposed.',
        ),
        h('div', { class: 'modal-actions' }, h('button', { class: 'btn ok', onclick: () => el.remove() }, 'Close')),
      ),
    );
    document.body.append(el);
  }

  private showTutorial(): void {
    const steps: [string, string][] = [
      ['Welcome', "I'm here to show you how to run your own club. Soon you'll be throwing the biggest parties in town!"],
      ['Your DJ set', 'You are the DJ! Click the record button (top left) or the DJ on the dock, then pick a mix to start your set.'],
      ['Guests', `Guests pay a $${tuning.coverChargeBase} cover charge at the door. As your Popularity grows, they'll pay more!`],
      ['Drinks', `Guests get thirsty and buy drinks from staffed bars. Watch the drink tube on the right and click + to restock ${tuning.barRefillAmount} drinks.`],
      ['DJ moves', 'Drop Bass sends everyone to the bar. Dedicate Song cheers up a guest — click the mic, then the guest.'],
      ['Decorate', 'Use the paint bucket to buy furniture. More Luxury means bigger tips. Drag to look around, scroll to zoom.'],
    ];
    let i = 0;
    const bubble = h('div', { class: 'guide-bubble' });
    const el = h('div', { class: 'tutorial' }, bubble, h('div', { class: 'guide-figure' }, portrait(GUIDE, 120, { full: true })));
    const render = () => {
      const [title, text] = steps[i];
      const last = i === steps.length - 1;
      bubble.replaceChildren(
        h('div', { class: 'guide-title' }, title),
        h('div', { class: 'guide-text' }, text),
        h(
          'div',
          { class: 'guide-actions' },
          h(
            'button',
            {
              class: 'btn guide-skip',
              onclick: () => {
                this.game.dismissTutorial();
                el.remove();
              },
            },
            'Skip',
          ),
          h(
            'button',
            {
              class: 'btn guide-next',
              onclick: () => {
                if (last) {
                  this.game.dismissTutorial();
                  el.remove();
                } else {
                  i++;
                  render();
                }
              },
            },
            last ? "Let's party!" : 'Next',
          ),
        ),
      );
    };
    render();
    this.root.append(el);
  }

  selectGuest(id: string): void {
    this.ix.select({ kind: 'guest', id });
  }
  selectFurniture(id: string): void {
    this.ix.select({ kind: 'furniture', id });
  }
}
