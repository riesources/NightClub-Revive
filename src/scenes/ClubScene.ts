import Phaser from 'phaser';
import { getFurnitureDef } from '../data/furnitureCatalog';
import { tuning } from '../data/tuning';
import { isPlaying } from '../domain/dj';
import type { Game, GameEvent } from '../domain/game';
import { moodOf, type Guest } from '../domain/guests/guest';
import { blockedCells, checkPlacement, entranceCell, footprintSize, furnitureAt, reservedCells } from '../domain/grid';
import type { ClubState } from '../domain/types';
import { drawAvatar } from '../render/avatarArt';
import { drawFurniture, drawTileDiamond } from '../render/furnitureArt';
import { DEFAULT_ISO, depthFor, gridToScreen, screenToGrid, type IsoConfig } from '../render/isoProjection';
import { PhaserPainter } from '../render/painter';
import type { Interaction } from '../ui/interaction';

const WALL_H = 110;
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
  private furnGfx = new Map<string, Phaser.GameObjects.Graphics>();
  private guestGfx = new Map<string, Phaser.GameObjects.Graphics>();
  private debugText = new Map<string, Phaser.GameObjects.Text>();
  private djAvatar!: Phaser.GameObjects.Graphics;
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
    const availH = Math.max(200, cam.height - 140);
    cam.setZoom(Phaser.Math.Clamp(Math.min((cam.width - 16) / roomW, availH / roomH), 0.4, 1));
    const c = gridToScreen(cols / 2, rows / 2, this.cfg);
    cam.centerOn(c.x, c.y - WALL_H / 2 + 10);
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
      if (Math.abs(x - p.x) < 13 && y < p.y + 3 && y > p.y - 48) {
        const d = Math.abs(x - p.x) + Math.abs(y - (p.y - 22));
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
    if (e.type === 'sale') this.floatText(e.x, e.y, `+$${e.paid}`, '#7dffa0');
    if (e.type === 'levelUp') {
      this.redrawRoom(true);
      this.centerCamera();
    }
  }

  private floatText(gx: number, gy: number, text: string, color: string): void {
    const p = gridToScreen(gx, gy, this.cfg);
    const t = this.add
      .text(p.x, p.y - 60, text, { fontFamily: 'Trebuchet MS, Arial, sans-serif', fontSize: '15px', fontStyle: 'bold', color, stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(DEPTH_UI);
    this.tweens.add({ targets: t, y: t.y - 34, alpha: 0, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /** Floor, walls and entrance. Redrawn only when the room size changes. */
  private redrawRoom(force = false): void {
    const { cols, rows } = this.game_.state.room;
    const key = `${cols}x${rows}`;
    if (!force && key === this.roomKey) return;
    this.roomKey = key;
    const g = this.floor;
    const cfg = this.cfg;
    g.clear();
    // back walls (along row = 0 and col = 0)
    const o = gridToScreen(0, 0, cfg);
    const right = gridToScreen(cols, 0, cfg);
    const left = gridToScreen(0, rows, cfg);
    g.fillStyle(0x161a33, 1);
    g.fillPoints([o, right, { x: right.x, y: right.y - WALL_H }, { x: o.x, y: o.y - WALL_H }], true);
    g.fillStyle(0x10132a, 1);
    g.fillPoints([o, left, { x: left.x, y: left.y - WALL_H }, { x: o.x, y: o.y - WALL_H }], true);
    // wall panels
    g.lineStyle(1, 0x2a2f5a, 0.8);
    for (let c = 1; c < cols; c++) {
      const p = gridToScreen(c, 0, cfg);
      g.lineBetween(p.x, p.y, p.x, p.y - WALL_H);
    }
    for (let r = 1; r < rows; r++) {
      const p = gridToScreen(0, r, cfg);
      g.lineBetween(p.x, p.y, p.x, p.y - WALL_H);
    }
    // neon trim
    g.lineStyle(3, 0x00e5ff, 0.9);
    g.lineBetween(o.x, o.y - WALL_H, right.x, right.y - WALL_H);
    g.lineStyle(3, 0xff3df2, 0.9);
    g.lineBetween(o.x, o.y - WALL_H, left.x, left.y - WALL_H);
    g.lineStyle(2, 0x00e5ff, 0.35);
    g.lineBetween(o.x, o.y - 30, right.x, right.y - 30);
    g.lineStyle(2, 0xff3df2, 0.35);
    g.lineBetween(o.x, o.y - 30, left.x, left.y - 30);
    // floor
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        drawTileDiamond(g, c, r, 1, 1, cfg, (c + r) % 2 ? 0x1b1f3d : 0x20254a, 1, 0x2d3366, 0.6);
      }
    }
    // front edge thickness
    const fr = gridToScreen(cols, rows, cfg);
    g.fillStyle(0x0b0d20, 1);
    g.fillPoints([left, fr, { x: fr.x, y: fr.y + 12 }, { x: left.x, y: left.y + 12 }], true);
    g.fillStyle(0x080a18, 1);
    g.fillPoints([right, fr, { x: fr.x, y: fr.y + 12 }, { x: right.x, y: right.y + 12 }], true);
    // entrance carpet
    for (const c of reservedCells(this.game_.state.room)) drawTileDiamond(g, c.col, c.row, 1, 1, cfg, 0xa3122f, 0.9, 0xffd23f, 0.8);
    const e = entranceCell(this.game_.state.room);
    const ep = gridToScreen(e.col + 0.5, e.row + 1, cfg);
    g.fillStyle(0xffd23f, 0.9);
    g.fillTriangle(ep.x - 8, ep.y + 6, ep.x + 8, ep.y + 6, ep.x, ep.y - 4);
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
    this.drawOverlay(state);
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
      if (guest.id === selected) {
        g.lineStyle(2, 0xffffff, 0.9);
        g.strokeEllipse(p.x, p.y, 30, 12);
      }
      drawAvatar(painter, guest.appearance, p.x, p.y, 0.62, {
        phase,
        dancing,
        walking,
        arms: guest.state === 'DRINKING' ? 'drink' : dancing && guest.seed % 3 === 0 ? 'up' : 'down',
      });
      // Mood / need bubble
      const mood = moodOf(guest.happiness, tuning.happyThreshold, tuning.unhappyThreshold);
      const bubble =
        guest.state === 'QUEUING_FOR_BAR' || guest.state === 'THIRSTY' ? 0x7df9ff : mood === 'unhappy' ? 0xff4d4d : mood === 'happy' && dancing ? 0x7dffa0 : null;
      if (bubble !== null) {
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(p.x + 10, p.y - 52, 6);
        g.fillStyle(bubble, 1);
        g.fillCircle(p.x + 10, p.y - 52, 4);
      }
    }
    for (const [id, g] of this.guestGfx) {
      if (!seen.has(id)) {
        g.destroy();
        this.guestGfx.delete(id);
      }
    }
  }

  /** The player avatar stands behind the best DJ booth and dances while a set plays. */
  private drawDj(state: ClubState, now: number, playing: boolean): void {
    const g = this.djAvatar;
    g.clear();
    const booth = state.furniture.find((f) => getFurnitureDef(f.catalogId)?.kind === 'dj');
    if (!booth) return;
    const { w, h } = footprintSize(booth.catalogId, booth.facing);
    const back = booth.facing === 0 ? gridToScreen(booth.col + w / 2, booth.row + 0.05, this.cfg) : gridToScreen(booth.col + 0.05, booth.row + h / 2, this.cfg);
    g.setDepth((depthFor(booth.col, booth.row, w, h) - 1) * 100 - 1);
    drawAvatar(new PhaserPainter(g), state.appearance, back.x, back.y, 0.75, {
      phase: (now / 700) % 1,
      dancing: playing,
      walking: false,
      arms: playing ? 'up' : 'down',
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
