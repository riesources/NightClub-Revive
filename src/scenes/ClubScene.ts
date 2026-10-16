import Phaser from 'phaser';
import { getFurnitureDef } from '../data/furnitureCatalog';
import { getParty } from '../data/parties';
import { tuning } from '../data/tuning';
import { isPlaying } from '../domain/dj';
import { partyActive } from '../domain/party';
import type { Game, GameEvent } from '../domain/game';
import { moodOf, type Guest } from '../domain/guests/guest';
import { blockedCells, checkPlacement, entranceCell, footprintSize, furnitureAt, reservedCells } from '../domain/grid';
import type { ClubState } from '../domain/types';
import { drawAvatar } from '../render/avatarArt';
import { drawFurniture, drawTileDiamond } from '../render/furnitureArt';
import { DEFAULT_ISO, depthFor, gridToScreen, screenToGrid, type IsoConfig } from '../render/isoProjection';
import { PhaserPainter, shade } from '../render/painter';
import type { Interaction } from '../ui/interaction';
import { staffAppearance } from '../ui/staffLook';

const WALL_H = 96;
const DEPTH_FLOOR = -1_000_000;
const DEPTH_FLAT = -500_000;
const DEPTH_UI = 1_000_000;

export interface SceneCallbacks {
  onSelectGuest(id: string): void;
  onSelectFurniture(id: string): void;
  onClickEmpty(): void;
  onPlaced(): void;
}

export class ClubScene extends Phaser.Scene {
  private cfg: IsoConfig = DEFAULT_ISO;
  private floor!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private partyGfx!: Phaser.GameObjects.Graphics;
  private furnGfx = new Map<string, Phaser.GameObjects.Graphics>();
  private guestGfx = new Map<string, Phaser.GameObjects.Graphics>();
  private debugText = new Map<string, Phaser.GameObjects.Text>();
  private djAvatar!: Phaser.GameObjects.Graphics;
  private staffGfx = new Map<string, Phaser.GameObjects.Graphics>();
  private roomKey = '';
  private hover: { col: number; row: number } | null = null;
  private downAt: { x: number; y: number; sx: number; sy: number } | null = null;
  private dragging = false;
  private unsub: (() => void)[] = [];

  constructor(
    private readonly game_: Game,
    private readonly interaction: Interaction,
    private readonly cb: SceneCallbacks,
  ) {
    super('club');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#07081a');
    this.floor = this.add.graphics().setDepth(DEPTH_FLOOR);
    this.overlay = this.add.graphics().setDepth(DEPTH_UI - 10);
    // Party lights sit above the floor tiles but under furniture and people.
    this.partyGfx = this.add.graphics().setDepth(-1000).setBlendMode(Phaser.BlendModes.ADD);
    this.djAvatar = this.add.graphics();
    this.redrawRoom(true);
    this.centerCamera();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.downAt = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY };
      this.dragging = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const w = p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      this.hover = screenToGrid(w.x, w.y, this.cfg);
      if (this.downAt && p.isDown) {
        const dx = p.x - this.downAt.x;
        const dy = p.y - this.downAt.y;
        if (this.dragging || Math.hypot(dx, dy) > 6) {
          this.dragging = true;
          const z = this.cameras.main.zoom;
          this.cameras.main.setScroll(this.downAt.sx - dx / z, this.downAt.sy - dy / z);
        }
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const wasDrag = this.dragging;
      this.downAt = null;
      this.dragging = false;
      if (wasDrag) return;
      if (p.rightButtonReleased()) {
        this.cancelMode();
        return;
      }
      const w = p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      this.handleClick(w.x, w.y);
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.5, 2));
    });
    this.interaction.zoomBy = (f: number) => {
      const cam = this.cameras.main;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * f, 0.4, 2));
    };
    this.input.mouse?.disableContextMenu();
    this.input.keyboard?.on('keydown-ESC', () => this.cancelMode());
    this.input.keyboard?.on('keydown-R', () => this.rotateMode());
    this.scale.on('resize', () => this.centerCamera());

    this.unsub.push(this.game_.on((e: GameEvent) => this.onGameEvent(e)));
    this.events.once('shutdown', () => this.unsub.forEach((u) => u()));
  }

  /** Fit the whole room between the HUD and the dock, never zooming in past 1:1. */
  private centerCamera(): void {
    const { cols, rows } = this.game_.state.room;
    const cam = this.cameras.main;
    const roomW = ((cols + rows) * this.cfg.tileW) / 2;
    const roomH = ((cols + rows) * this.cfg.tileH) / 2 + WALL_H;
    // Leave room for the HUD (~110px) and the dock (~96px), as the original framed the club.
    const availH = Math.max(200, cam.height - 210);
    const availW = Math.max(200, cam.width - 120);
    const zoom = Phaser.Math.Clamp(Math.min(availW / roomW, availH / roomH), 0.4, 1.25);
    cam.setZoom(zoom);
    const c = gridToScreen(cols / 2, rows / 2, this.cfg);
    // Shift so the room sits in the band between HUD and dock.
    cam.centerOn(c.x, c.y - WALL_H / 2 + (96 - 110) / 2 / zoom);
  }

  cancelMode(): void {
    if (this.interaction.mode.kind !== 'normal') this.interaction.setMode({ kind: 'normal' });
    else this.interaction.select(null);
  }

  rotateMode(): void {
    const m = this.interaction.mode;
    if (m.kind === 'place' || m.kind === 'move') this.interaction.setMode({ ...m, facing: m.facing === 0 ? 1 : 0 });
  }

  private guestAt(x: number, y: number): Guest | undefined {
    let best: Guest | undefined;
    let bestD = Infinity;
    for (const g of this.game_.sim.guests) {
      const p = gridToScreen(g.x, g.y, this.cfg);
      if (Math.abs(x - p.x) < 14 && y < p.y + 3 && y > p.y - 56) {
        const d = Math.abs(x - p.x) + Math.abs(y - (p.y - 26));
        if (d < bestD) {
          bestD = d;
          best = g;
        }
      }
    }
    return best;
  }

  private handleClick(x: number, y: number): void {
    const m = this.interaction.mode;
    const cell = screenToGrid(x, y, this.cfg);
    if (m.kind === 'place') {
      const r = this.game_.buy(m.catalogId, cell.col, cell.row, m.facing);
      if (r.ok) {
        // Keep placing floor tiles (common in builders); other items return to normal.
        if (getFurnitureDef(m.catalogId)?.kind !== 'dancefloor') this.interaction.setMode({ kind: 'normal' });
        this.cb.onPlaced();
      }
      return;
    }
    if (m.kind === 'post') {
      if (this.game_.setBouncerPost(m.staffId, cell).ok) this.interaction.setMode({ kind: 'normal' });
      return;
    }
    if (m.kind === 'move') {
      const r = this.game_.move(m.furnitureId, cell.col, cell.row, m.facing);
      if (r.ok) {
        this.interaction.setMode({ kind: 'normal' });
        this.cb.onSelectFurniture(m.furnitureId);
      }
      return;
    }
    const guest = this.guestAt(x, y);
    if (m.kind === 'dedicate') {
      if (guest) {
        this.game_.dedicateSong(guest.id);
        this.interaction.setMode({ kind: 'normal' });
      }
      return;
    }
    if (guest) return this.cb.onSelectGuest(guest.id);
    const f = furnitureAt(this.game_.state, cell.col, cell.row);
    if (f) return this.cb.onSelectFurniture(f.id);
    this.cb.onClickEmpty();
  }

  private onGameEvent(e: GameEvent): void {
    if (e.type === 'sale') this.floatText(e.x, e.y, `$${e.paid}`, '#e0102a');
    if (e.type === 'cover') this.floatText(e.x, e.y, `$${e.paid}`, '#e0102a');
    if (e.type === 'bounced') this.floatText(e.x, e.y, 'BOUNCED!', '#ff8a00');
    if (e.type === 'levelUp') {
      this.redrawRoom(true);
      this.centerCamera();
    }
  }

  private floatText(gx: number, gy: number, text: string, color: string): void {
    const p = gridToScreen(gx, gy, this.cfg);
    const t = this.add
      .text(p.x, p.y - 62, text, { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '16px', fontStyle: 'bold', color, stroke: '#ffffff', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(DEPTH_UI);
    this.tweens.add({ targets: t, y: t.y - 34, alpha: 0, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /**
   * Floor, walls, door and the street outside. Redrawn only when the room size
   * changes. Style follows the reference screenshots (light-grey brick walls with
   * a pale top cap, charcoal floor, dark street tiles outside) - original drawing.
   */
  private redrawRoom(force = false): void {
    const { cols, rows } = this.game_.state.room;
    const key = `${cols}x${rows}`;
    if (!force && key === this.roomKey) return;
    this.roomKey = key;
    const g = this.floor;
    const cfg = this.cfg;
    g.clear();

    // Street / sidewalk outside the club
    const pad = 8;
    for (let c = -pad; c < cols + pad; c++) {
      for (let r = -pad; r < rows + pad; r++) {
        if (c >= 0 && r >= 0 && c < cols && r < rows) continue;
        const odd = (Math.floor(c / 2) + Math.floor(r / 2)) % 2 === 0;
        drawTileDiamond(g, c, r, 1, 1, cfg, odd ? 0x26272c : 0x202126, 1, 0x34353c, 0.6);
      }
    }

    // Room floor: charcoal tiles under a soft spotlight
    const mid = { c: cols / 2, r: rows / 2 };
    const maxD = Math.hypot(cols, rows) / 2;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const d = Math.hypot(c + 0.5 - mid.c, r + 0.5 - mid.r) / maxD;
        const k = 1.55 - d * 0.75;
        drawTileDiamond(g, c, r, 1, 1, cfg, shade(0x45464e, k), 1, shade(0x2c2d33, k), 0.9);
      }
    }

    // Back walls: light grey brick with a pale cap (thick top edge)
    const o = gridToScreen(0, 0, cfg);
    const right = gridToScreen(cols, 0, cfg);
    const left = gridToScreen(0, rows, cfg);
    const wallTop = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - WALL_H });
    g.fillStyle(0x9a9ca4, 1);
    g.fillPoints([o, right, wallTop(right), wallTop(o)], true);
    g.fillStyle(0x7e8088, 1);
    g.fillPoints([o, left, wallTop(left), wallTop(o)], true);
    // brick courses
    const course = 9;
    for (let z = course; z < WALL_H; z += course) {
      g.lineStyle(1, 0x6c6e76, 0.7);
      g.lineBetween(o.x, o.y - z, right.x, right.y - z);
      g.lineStyle(1, 0x5e6068, 0.7);
      g.lineBetween(o.x, o.y - z, left.x, left.y - z);
      const offset = (z / course) % 2 ? 0.5 : 0;
      for (let c = offset; c < cols; c += 1) {
        const p = gridToScreen(c, 0, cfg);
        g.lineStyle(1, 0x6c6e76, 0.6);
        g.lineBetween(p.x, p.y - z, p.x, p.y - z + course);
      }
      for (let r = offset; r < rows; r += 1) {
        const p = gridToScreen(0, r, cfg);
        g.lineStyle(1, 0x5e6068, 0.6);
        g.lineBetween(p.x, p.y - z, p.x, p.y - z + course);
      }
    }
    // skirting shadow
    g.fillStyle(0x000000, 0.25);
    g.fillPoints([o, right, { x: right.x, y: right.y - 6 }, { x: o.x, y: o.y - 6 }], true);
    g.fillPoints([o, left, { x: left.x, y: left.y - 6 }, { x: o.x, y: o.y - 6 }], true);
    // pale wall cap
    const capT = 7;
    const capPts = (a: { x: number; y: number }, b: { x: number; y: number }, dx: number, dy: number) => [
      wallTop(a),
      wallTop(b),
      { x: b.x + dx, y: b.y - WALL_H + dy },
      { x: a.x + dx, y: a.y - WALL_H + dy },
    ];
    g.fillStyle(0xe4e6ea, 1);
    g.fillPoints(capPts(o, right, -capT, -capT / 2), true);
    g.fillStyle(0xd0d2d8, 1);
    g.fillPoints(capPts(o, left, capT, -capT / 2), true);
    g.lineStyle(1.5, 0x101014, 0.9);
    g.strokePoints([wallTop(left), wallTop(o), wallTop(right)], false);
    g.strokePoints([left, o, right], false);
    g.lineBetween(right.x, right.y, right.x, right.y - WALL_H);
    g.lineBetween(left.x, left.y, left.x, left.y - WALL_H);

    // Door in the back wall at the entrance column
    const e = entranceCell(this.game_.state.room);
    const d0 = gridToScreen(e.col + 0.12, 0, cfg);
    const d1 = gridToScreen(e.col + 0.88, 0, cfg);
    const doorH = 58;
    g.fillStyle(0x3a3c44, 1);
    g.fillPoints([d0, d1, { x: d1.x, y: d1.y - doorH - 4 }, { x: d0.x, y: d0.y - doorH - 4 }], true);
    g.fillStyle(0x15161b, 1);
    const i0 = gridToScreen(e.col + 0.2, 0, cfg);
    const i1 = gridToScreen(e.col + 0.8, 0, cfg);
    g.fillPoints([i0, i1, { x: i1.x, y: i1.y - doorH }, { x: i0.x, y: i0.y - doorH }], true);
    g.fillStyle(0x3ddc84, 0.9);
    g.fillCircle((d0.x + d1.x) / 2, (d0.y + d1.y) / 2 - doorH - 10, 3);
    // entrance mat
    for (const c of reservedCells(this.game_.state.room)) drawTileDiamond(g, c.col, c.row, 1, 1, cfg, 0x8a1020, 0.85, 0xc9a227, 0.7);
  }

  override update(): void {
    const now = Date.now();
    this.game_.tick(now);
    const state = this.game_.state;
    this.redrawRoom();
    const pulse = (Math.sin(now / 260) + 1) / 2;
    const playing = isPlaying(state, now);
    this.drawFurniture(state, playing ? pulse : 0.15);
    this.drawGuests(now, playing);
    this.drawDj(state, now, playing);
    this.drawStaff(state, now);
    this.drawPartyLights(state, now);
    this.drawOverlay(state);
  }

  /** Sweeping coloured spotlights while a party runs (original effect). */
  private drawPartyLights(state: ClubState, now: number): void {
    const g = this.partyGfx;
    g.clear();
    const def = state.party ? getParty(state.party.id) : undefined;
    if (!def || !partyActive(state, now)) return;
    const { cols, rows } = state.room;
    const t = now / 1000;
    const tw = this.cfg.tileW;
    def.lights.forEach((color, i) => {
      for (let k = 0; k < 2; k++) {
        const ph = i * 2.1 + k * 3.7;
        const col = cols / 2 + (cols / 2 - 1) * Math.sin(t * (0.45 + 0.1 * i) + ph);
        const row = rows / 2 + (rows / 2 - 1) * Math.sin(t * (0.33 + 0.07 * k) + ph * 1.3);
        const p = gridToScreen(col, row, this.cfg);
        const r = tw * (1.1 + 0.25 * Math.sin(t * 2 + ph));
        g.fillStyle(color, 0.16);
        g.fillEllipse(p.x, p.y, r * 2, r);
        g.fillStyle(color, 0.22);
        g.fillEllipse(p.x, p.y, r * 1.1, r * 0.55);
      }
    });
  }

  private drawFurniture(state: ClubState, pulse: number): void {
    const seen = new Set<string>();
    const selected = this.interaction.selection?.kind === 'furniture' ? this.interaction.selection.id : null;
    const moving = this.interaction.mode.kind === 'move' ? this.interaction.mode.furnitureId : null;
    for (const f of state.furniture) {
      const def = getFurnitureDef(f.catalogId);
      if (!def) continue;
      seen.add(f.id);
      let g = this.furnGfx.get(f.id);
      if (!g) {
        g = this.add.graphics();
        this.furnGfx.set(f.id, g);
      }
      const { w, h } = footprintSize(f.catalogId, f.facing);
      g.clear();
      const flat = def.kind === 'dancefloor';
      g.setDepth(flat ? DEPTH_FLAT + depthFor(f.col, f.row, w, h) : (depthFor(f.col, f.row, w, h) - 1) * 100);
      // Each dance tile pulses slightly out of phase for a lit-floor look.
      const p = flat ? (Math.sin(Date.now() / 300 + (f.col * 1.7 + f.row * 2.3)) + 1) / 2 * pulse + 0.1 : pulse;
      drawFurniture(g, def, f.col, f.row, w, h, this.cfg, { pulse: p, alpha: f.id === moving ? 0.35 : 1 });
      if (f.id === selected) drawTileDiamond(g, f.col, f.row, w, h, this.cfg, null, 0, 0xffffff, 0.9);
    }
    for (const [id, g] of this.furnGfx) {
      if (!seen.has(id)) {
        g.destroy();
        this.furnGfx.delete(id);
      }
    }
  }

  private drawGuests(now: number, playing: boolean): void {
    const seen = new Set<string>();
    const selected = this.interaction.selection?.kind === 'guest' ? this.interaction.selection.id : null;
    for (const guest of this.game_.sim.guests) {
      seen.add(guest.id);
      let g = this.guestGfx.get(guest.id);
      if (!g) {
        g = this.add.graphics();
        this.guestGfx.set(guest.id, g);
      }
      g.clear();
      g.setDepth((guest.x + guest.y) * 100 + 50);
      const p = gridToScreen(guest.x, guest.y, this.cfg);
      const phase = ((now + guest.seed % 1000) / 900) % 1;
      const dancing = guest.state === 'DANCING' && playing;
      const walking = guest.path.length > 0;
      const painter = new PhaserPainter(g);
      if (guest.guestClass === 'Celebrity') {
        // gold star halo + sparkle for the VIP
        g.lineStyle(3, 0xffd23f, 0.9);
        g.strokeEllipse(p.x, p.y, 38, 15);
        const tw = (now / 300) % (Math.PI * 2);
        g.fillStyle(0xffd23f, 1);
        g.fillPoints(starPoints(p.x, p.y - 82, 9, 4), true);
        g.fillStyle(0xffffff, 0.8 + 0.2 * Math.sin(tw));
        g.fillCircle(p.x + 14 * Math.cos(tw), p.y - 60 + 6 * Math.sin(tw), 2);
      }
      if (guest.state === 'TROUBLEMAKER') {
        g.lineStyle(2.5, 0xe0102a, 0.5 + 0.4 * Math.abs(Math.sin(now / 180)));
        g.strokeEllipse(p.x, p.y, 34, 14);
      }
      if (guest.id === selected) {
        g.lineStyle(3, 0x2a7bff, 0.95);
        g.strokeEllipse(p.x, p.y - 40, 32, 32);
      }
      drawAvatar(painter, guest.appearance, p.x, p.y, 0.72, {
        phase,
        dancing,
        walking,
        arms: guest.state === 'DRINKING' ? 'drink' : dancing && guest.seed % 3 === 0 ? 'up' : 'down',
      });
      this.drawBubble(g, guest, p.x + 13, p.y - 74, playing);
    }
    for (const [id, g] of this.guestGfx) {
      if (!seen.has(id)) {
        g.destroy();
        this.guestGfx.delete(id);
      }
    }
  }

  /**
   * White speech bubble with a small icon (chat lines, drink, frown, exit arrow),
   * modelled on the bubbles in the reference screenshots.
   */
  private drawBubble(g: Phaser.GameObjects.Graphics, guest: Guest, x: number, y: number, playing: boolean): void {
    const mood = moodOf(guest.happiness, tuning.happyThreshold, tuning.unhappyThreshold);
    let icon: 'chat' | 'drink' | 'frown' | 'exit' | 'anger' | null = null;
    if (guest.state === 'TROUBLEMAKER') icon = 'anger';
    else if (guest.state === 'LEAVING') icon = 'exit';
    else if (guest.state === 'QUEUING_FOR_BAR' || guest.state === 'THIRSTY') icon = 'drink';
    else if (mood === 'unhappy') icon = 'frown';
    else if (guest.state === 'SITTING_OR_SOCIALIZING' || (!playing && guest.state === 'DANCING')) icon = (guest.seed % 2 === 0 ? 'chat' : null);
    if (!icon) return;
    g.fillStyle(0xffffff, 0.97);
    g.lineStyle(1.5, 0x15121c, 0.9);
    g.fillCircle(x, y, 9);
    g.strokeCircle(x, y, 9);
    g.fillTriangle(x - 5, y + 6, x + 1, y + 7, x - 7, y + 13);
    switch (icon) {
      case 'chat':
        g.fillStyle(0x3a3c44, 1);
        for (const dy of [-3.5, 0, 3.5]) g.fillRect(x - 5, y + dy - 0.9, 10, 1.8);
        break;
      case 'drink':
        g.fillStyle(0x1fb6ff, 1);
        g.fillTriangle(x - 5, y - 4, x + 5, y - 4, x, y + 2);
        g.fillRect(x - 0.7, y + 1, 1.4, 4);
        g.fillRect(x - 3, y + 4.5, 6, 1.2);
        break;
      case 'frown':
        g.fillStyle(0xe0102a, 1);
        g.fillCircle(x, y, 6);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(x - 2.2, y - 1.5, 1.1);
        g.fillCircle(x + 2.2, y - 1.5, 1.1);
        g.fillRect(x - 2.5, y + 2.2, 5, 1.2);
        break;
      case 'exit':
        g.fillStyle(0xe0102a, 1);
        g.fillRect(x - 4, y - 4, 6, 8);
        g.fillTriangle(x + 1, y - 4, x + 6, y, x + 1, y + 4);
        break;
      case 'anger':
        g.fillStyle(0xe0102a, 1);
        g.fillRect(x - 1.4, y - 6, 2.8, 7.5);
        g.fillCircle(x, y + 4.2, 1.6);
        break;
    }
  }

  /**
   * Staff in the club: bartenders behind their bar, bouncers in shades at their
   * post. Busy bouncers (escorting someone out) are drawn faded.
   */
  private drawStaff(state: ClubState, now: number): void {
    const seen = new Set<string>();
    for (const s of state.staff) {
      let at: { x: number; y: number; depth: number } | null = null;
      let walking = false;
      if (s.role === 'bouncer' && s.post) {
        const pos = this.game_.sim.bouncerAt(s.id) ?? { x: s.post.col + 0.5, y: s.post.row + 0.5, moving: false };
        walking = pos.moving;
        at = { x: pos.x, y: pos.y, depth: (Math.floor(pos.x) + Math.floor(pos.y) + 1) * 100 + 50 };
      } else if (s.role === 'bartender' && s.barId) {
        const bar = state.furniture.find((f) => f.id === s.barId);
        if (bar) {
          const { w, h } = footprintSize(bar.catalogId, bar.facing);
          // stand along the back edge of the bar
          at = bar.facing === 0 ? { x: bar.col + w / 2, y: bar.row + 0.05, depth: 0 } : { x: bar.col + 0.05, y: bar.row + h / 2, depth: 0 };
          at.depth = (depthFor(bar.col, bar.row, w, h) - 1) * 100 - 1;
        }
      }
      if (!at) continue;
      seen.add(s.id);
      let g = this.staffGfx.get(s.id);
      if (!g) {
        g = this.add.graphics();
        this.staffGfx.set(s.id, g);
      }
      g.clear();
      g.setDepth(at.depth);
      const p = gridToScreen(at.x, at.y, this.cfg);
      drawAvatar(new PhaserPainter(g), staffAppearance(s), p.x, p.y, 0.74, {
        phase: walking ? (now / 380) % 1 : (now / 1100 + s.id.length) % 1,
        dancing: false,
        walking,
        arms: s.role === 'bartender' ? 'drink' : 'down',
        shades: s.role === 'bouncer',
      });
    }
    for (const [id, g] of this.staffGfx) {
      if (!seen.has(id)) {
        g.destroy();
        this.staffGfx.delete(id);
      }
    }
  }

  /** The player avatar stands behind the best DJ booth, in headphones, dancing while a set plays. */
  private drawDj(state: ClubState, now: number, playing: boolean): void {
    const g = this.djAvatar;
    g.clear();
    // Stand at the best booth (the one that sets the set length); podiums lift the DJ up.
    let booth: (typeof state.furniture)[number] | undefined;
    for (const f of state.furniture) {
      const d = getFurnitureDef(f.catalogId);
      if (d?.kind !== 'dj') continue;
      const cur = booth ? (getFurnitureDef(booth.catalogId)?.djSetMs ?? 0) : -1;
      if ((d.djSetMs ?? 0) > cur) booth = f;
    }
    if (!booth) return;
    const { w, h } = footprintSize(booth.catalogId, booth.facing);
    const lift = getFurnitureDef(booth.catalogId)?.art.style === 'podium' ? 12 : 0;
    const base = booth.facing === 0 ? gridToScreen(booth.col + w / 2, booth.row + 0.05, this.cfg) : gridToScreen(booth.col + 0.05, booth.row + h / 2, this.cfg);
    const back = { x: base.x, y: base.y - lift };
    g.setDepth((depthFor(booth.col, booth.row, w, h) - 1) * 100 - 1);
    if (playing) {
      // blue spotlight ring around the DJ, as in the reference screenshots
      g.lineStyle(3, 0x2a7bff, 0.9);
      g.strokeCircle(back.x, back.y - 58, 24);
    }
    drawAvatar(new PhaserPainter(g), state.appearance, back.x, back.y, 0.76, {
      phase: (now / 700) % 1,
      dancing: playing,
      walking: false,
      arms: playing ? 'headphones' : 'down',
      headphones: true,
    });
  }

  private drawOverlay(state: ClubState): void {
    const g = this.overlay;
    g.clear();
    const m = this.interaction.mode;
    if (this.hover && (m.kind === 'place' || m.kind === 'move')) {
      const catalogId = m.kind === 'place' ? m.catalogId : state.furniture.find((f) => f.id === m.furnitureId)?.catalogId;
      const def = catalogId ? getFurnitureDef(catalogId) : undefined;
      if (def && catalogId) {
        const ignore = m.kind === 'move' ? m.furnitureId : undefined;
        const valid = checkPlacement(state, catalogId, this.hover.col, this.hover.row, m.facing, ignore).valid && (m.kind === 'move' || state.cash >= def.price);
        const { w, h } = footprintSize(catalogId, m.facing);
        drawTileDiamond(g, this.hover.col, this.hover.row, w, h, this.cfg, valid ? 0x3ddc84 : 0xff3d3d, 0.35, valid ? 0x3ddc84 : 0xff3d3d);
        drawFurniture(g, def, this.hover.col, this.hover.row, w, h, this.cfg, { alpha: 0.6, tint: valid ? undefined : 0xff5555, pulse: 0.6 });
      }
    } else if (m.kind === 'post') {
      const r = tuning.bouncerRadius;
      const { cols, rows } = state.room;
      const area = (c: number, rr: number, color: number, a: number) => {
        const c0 = Math.max(0, c - r);
        const r0 = Math.max(0, rr - r);
        drawTileDiamond(g, c0, r0, Math.min(cols, c + r + 1) - c0, Math.min(rows, rr + r + 1) - r0, this.cfg, color, a, color, 0.9);
      };
      const cur = state.staff.find((s) => s.id === m.staffId)?.post;
      if (cur) area(cur.col, cur.row, 0x7a7f8c, 0.12);
      if (this.hover && this.hover.col >= 0 && this.hover.row >= 0 && this.hover.col < cols && this.hover.row < rows) {
        area(this.hover.col, this.hover.row, 0xff8a00, 0.18);
        drawTileDiamond(g, this.hover.col, this.hover.row, 1, 1, this.cfg, 0xff8a00, 0.5, 0xffffff, 0.9);
      }
    } else if (this.hover && m.kind === 'normal') {
      const { cols, rows } = state.room;
      if (this.hover.col >= 0 && this.hover.row >= 0 && this.hover.col < cols && this.hover.row < rows)
        drawTileDiamond(g, this.hover.col, this.hover.row, 1, 1, this.cfg, null, 0, 0x00e5ff, 0.6);
    }
    this.drawDebug(state);
  }

  private drawDebug(state: ClubState): void {
    const g = this.overlay;
    if (!this.interaction.debug) {
      for (const t of this.debugText.values()) t.destroy();
      this.debugText.clear();
      return;
    }
    for (const k of blockedCells(state)) {
      const [c, r] = k.split(',').map(Number);
      drawTileDiamond(g, c, r, 1, 1, this.cfg, 0xff0000, 0.18, null);
    }
    const seen = new Set<string>();
    for (const guest of this.game_.sim.guests) {
      seen.add(guest.id);
      // path
      if (guest.path.length) {
        g.lineStyle(1, 0xffff00, 0.6);
        const pts = [{ x: guest.x, y: guest.y }, ...guest.path.map((c) => ({ x: c.col + 0.5, y: c.row + 0.5 }))].map((q) => gridToScreen(q.x, q.y, this.cfg));
        g.strokePoints(pts, false);
      }
      let t = this.debugText.get(guest.id);
      if (!t) {
        t = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '9px', color: '#ffff66', backgroundColor: '#000a' }).setOrigin(0.5).setDepth(DEPTH_UI);
        this.debugText.set(guest.id, t);
      }
      const p = gridToScreen(guest.x, guest.y, this.cfg);
      t.setPosition(p.x, p.y + 8).setText(`${guest.id} ${guest.state.slice(0, 10)} h${Math.round(guest.happiness)} t${Math.round(guest.thirst)}`);
    }
    for (const [id, t] of this.debugText) {
      if (!seen.has(id) && id !== '__hover') {
        t.destroy();
        this.debugText.delete(id);
      }
    }
    if (this.hover) {
      const p = gridToScreen(this.hover.col + 0.5, this.hover.row + 0.5, this.cfg);
      g.fillStyle(0x000000, 0.7);
      g.fillRect(p.x - 22, p.y - 7, 44, 14);
      let t = this.debugText.get('__hover');
      if (!t) {
        t = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '10px', color: '#0ff' }).setOrigin(0.5).setDepth(DEPTH_UI + 1);
        this.debugText.set('__hover', t);
      }
      seen.add('__hover');
      t.setPosition(p.x, p.y).setText(`${this.hover.col},${this.hover.row}`);
    }
  }
}

/** Five-pointed star polygon. */
function starPoints(cx: number, cy: number, outer: number, inner: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}
