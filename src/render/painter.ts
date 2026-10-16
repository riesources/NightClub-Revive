import type Phaser from 'phaser';

/** Minimal drawing surface so the same art code can target Phaser or Canvas2D. */
export interface Painter {
  fill(color: number, alpha?: number): void;
  noStroke(): void;
  stroke(width: number, color: number, alpha?: number): void;
  circle(x: number, y: number, r: number): void;
  ellipse(x: number, y: number, w: number, h: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  roundRect(x: number, y: number, w: number, h: number, r: number): void;
  poly(points: { x: number; y: number }[], strokeToo?: boolean): void;
}

export class PhaserPainter implements Painter {
  private strokeOn = false;
  constructor(public g: Phaser.GameObjects.Graphics) {}
  fill(color: number, alpha = 1) {
    this.g.fillStyle(color, alpha);
  }
  noStroke() {
    this.strokeOn = false;
  }
  stroke(width: number, color: number, alpha = 1) {
    this.g.lineStyle(width, color, alpha);
    this.strokeOn = true;
  }
  circle(x: number, y: number, r: number) {
    this.g.fillCircle(x, y, r);
    if (this.strokeOn) this.g.strokeCircle(x, y, r);
  }
  ellipse(x: number, y: number, w: number, h: number) {
    this.g.fillEllipse(x, y, w, h);
    if (this.strokeOn) this.g.strokeEllipse(x, y, w, h);
  }
  rect(x: number, y: number, w: number, h: number) {
    this.g.fillRect(x, y, w, h);
    if (this.strokeOn) this.g.strokeRect(x, y, w, h);
  }
  roundRect(x: number, y: number, w: number, h: number, r: number) {
    this.g.fillRoundedRect(x, y, w, h, r);
    if (this.strokeOn) this.g.strokeRoundedRect(x, y, w, h, r);
  }
  poly(points: { x: number; y: number }[], strokeToo = false) {
    this.g.fillPoints(points, true);
    if (strokeToo || this.strokeOn) this.g.strokePoints(points, true);
  }
}

const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

export class CanvasPainter implements Painter {
  private strokeOn = false;
  constructor(public ctx: CanvasRenderingContext2D) {}
  fill(color: number, alpha = 1) {
    this.ctx.fillStyle = css(color, alpha);
  }
  noStroke() {
    this.strokeOn = false;
  }
  stroke(width: number, color: number, alpha = 1) {
    this.ctx.lineWidth = width;
    this.ctx.strokeStyle = css(color, alpha);
    this.strokeOn = true;
  }
  private done() {
    this.ctx.fill();
    if (this.strokeOn) this.ctx.stroke();
  }
  circle(x: number, y: number, r: number) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.done();
  }
  ellipse(x: number, y: number, w: number, h: number) {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.done();
  }
  rect(x: number, y: number, w: number, h: number) {
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.done();
  }
  roundRect(x: number, y: number, w: number, h: number, r: number) {
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, r);
    this.done();
  }
  poly(points: { x: number; y: number }[]) {
    this.ctx.beginPath();
    points.forEach((p, i) => (i ? this.ctx.lineTo(p.x, p.y) : this.ctx.moveTo(p.x, p.y)));
    this.ctx.closePath();
    this.done();
  }
}

export const hex = (s: string): number => parseInt(s.replace('#', ''), 16);

export function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 255) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 255) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((color & 255) * factor)));
  return (r << 16) | (g << 8) | b;
}
