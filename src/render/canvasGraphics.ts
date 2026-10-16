/**
 * The subset of Phaser.GameObjects.Graphics used by the furniture drawer,
 * implemented on Canvas2D so the same art renders as DOM thumbnails.
 */
export interface IsoGfx {
  fillStyle(color: number, alpha?: number): unknown;
  lineStyle(width: number, color: number, alpha?: number): unknown;
  fillPoints(points: { x: number; y: number }[], closeShape?: boolean): unknown;
  strokePoints(points: { x: number; y: number }[], closeShape?: boolean): unknown;
  lineBetween(x1: number, y1: number, x2: number, y2: number): unknown;
  fillRect(x: number, y: number, w: number, h: number): unknown;
  fillEllipse(x: number, y: number, w: number, h: number): unknown;
  strokeEllipse(x: number, y: number, w: number, h: number): unknown;
  fillCircle(x: number, y: number, r: number): unknown;
  strokeCircle(x: number, y: number, r: number): unknown;
  fillTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): unknown;
}

const rgba = (c: number, a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

export class CanvasGfx implements IsoGfx {
  constructor(private ctx: CanvasRenderingContext2D) {}
  fillStyle(color: number, alpha = 1) {
    this.ctx.fillStyle = rgba(color, alpha);
  }
  lineStyle(width: number, color: number, alpha = 1) {
    this.ctx.lineWidth = width;
    this.ctx.strokeStyle = rgba(color, alpha);
  }
  private path(points: { x: number; y: number }[], close: boolean) {
    this.ctx.beginPath();
    points.forEach((p, i) => (i ? this.ctx.lineTo(p.x, p.y) : this.ctx.moveTo(p.x, p.y)));
    if (close) this.ctx.closePath();
  }
  fillPoints(points: { x: number; y: number }[]) {
    this.path(points, true);
    this.ctx.fill();
  }
  strokePoints(points: { x: number; y: number }[], close = false) {
    this.path(points, close);
    this.ctx.stroke();
  }
  lineBetween(x1: number, y1: number, x2: number, y2: number) {
    this.path([{ x: x1, y: y1 }, { x: x2, y: y2 }], false);
    this.ctx.stroke();
  }
  fillRect(x: number, y: number, w: number, h: number) {
    this.ctx.fillRect(x, y, w, h);
  }
  fillEllipse(x: number, y: number, w: number, h: number) {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }
  strokeEllipse(x: number, y: number, w: number, h: number) {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  fillCircle(x: number, y: number, r: number) {
    this.fillEllipse(x, y, r * 2, r * 2);
  }
  strokeCircle(x: number, y: number, r: number) {
    this.strokeEllipse(x, y, r * 2, r * 2);
  }
  fillTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
    this.fillPoints([{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }]);
  }
}
