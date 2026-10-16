import type { AvatarAppearance } from '../data/appearanceCatalog';
import { hex, shade, type Painter } from './painter';

/**
 * REPLACEMENT ART (original to this project, not traced from the 2010 game):
 * a big-headed cartoon avatar matching the broad style described in references.
 * (x, y) is the feet anchor. `pose` drives simple procedural animation.
 */
export interface AvatarPose {
  /** 0..1 looping phase. */
  phase: number;
  dancing: boolean;
  walking: boolean;
  arms: 'down' | 'up' | 'drink';
}

const OUTLINE = 0x0a0a12;

export function drawAvatar(p: Painter, a: AvatarAppearance, x: number, y: number, scale: number, pose: AvatarPose): void {
  const s = scale;
  const t = pose.phase * Math.PI * 2;
  const bob = pose.dancing ? Math.abs(Math.sin(t * 2)) * 4 * s : pose.walking ? Math.abs(Math.sin(t * 2)) * 1.5 * s : 0;
  const sway = pose.dancing ? Math.sin(t) * 2.5 * s : 0;
  const skin = hex(a.skin);
  const top = hex(a.top);
  const bottom = hex(a.bottom);
  const hair = hex(a.hairColor);

  // Shadow
  p.noStroke();
  p.fill(0x000000, 0.35);
  p.ellipse(x, y, 22 * s, 8 * s);

  const by = y - bob;
  // Legs
  const legSwing = pose.walking ? Math.sin(t * 2) * 3 * s : pose.dancing ? Math.sin(t * 2) * 2 * s : 0;
  p.stroke(1.5 * s, OUTLINE);
  p.fill(bottom);
  p.roundRect(x - 6 * s + legSwing * 0.3, by - 16 * s, 5 * s, 15 * s, 2 * s);
  p.roundRect(x + 1 * s - legSwing * 0.3, by - 16 * s, 5 * s, 15 * s, 2 * s);
  p.fill(0x15151c);
  p.roundRect(x - 7 * s + legSwing * 0.3, by - 3 * s, 7 * s, 4 * s, 2 * s);
  p.roundRect(x + 0.5 * s - legSwing * 0.3, by - 3 * s, 7 * s, 4 * s, 2 * s);

  // Body
  const bx = x + sway * 0.4;
  p.fill(top);
  p.roundRect(bx - 8 * s, by - 30 * s, 16 * s, 16 * s, 5 * s);

  // Arms
  p.fill(skin);
  const armY = by - 27 * s;
  if (pose.arms === 'up') {
    const lift = Math.sin(t * 2) * 3 * s;
    p.roundRect(bx - 13 * s, armY - 12 * s + lift, 4.5 * s, 14 * s, 2 * s);
    p.roundRect(bx + 8.5 * s, armY - 12 * s - lift, 4.5 * s, 14 * s, 2 * s);
  } else if (pose.arms === 'drink') {
    p.roundRect(bx - 12 * s, armY, 4.5 * s, 12 * s, 2 * s);
    p.roundRect(bx + 7.5 * s, armY - 4 * s, 4.5 * s, 10 * s, 2 * s);
    p.fill(0x7df9ff, 0.9);
    p.rect(bx + 7 * s, armY - 10 * s, 5 * s, 7 * s);
  } else {
    p.roundRect(bx - 12 * s, armY, 4.5 * s, 13 * s, 2 * s);
    p.roundRect(bx + 7.5 * s, armY, 4.5 * s, 13 * s, 2 * s);
  }

  // Head (big - a defining trait of the reference style)
  const hx = bx + sway * 0.3;
  const hy = by - 44 * s;
  if (a.hairStyle === 'long') {
    p.fill(hair);
    p.roundRect(hx - 15 * s, hy - 6 * s, 30 * s, 26 * s, 10 * s);
  }
  p.fill(skin);
  p.circle(hx, hy, 14 * s);
  // Eyes
  p.noStroke();
  p.fill(0xffffff);
  p.ellipse(hx - 5 * s, hy + 1 * s, 7 * s, 8 * s);
  p.ellipse(hx + 5 * s, hy + 1 * s, 7 * s, 8 * s);
  p.fill(OUTLINE);
  p.circle(hx - 4.5 * s, hy + 2 * s, 2 * s);
  p.circle(hx + 5.5 * s, hy + 2 * s, 2 * s);
  // Mouth
  p.fill(shade(skin, 0.55));
  p.ellipse(hx, hy + 8 * s, 6 * s, 2.5 * s);

  // Hair
  p.stroke(1.5 * s, OUTLINE);
  p.fill(hair);
  switch (a.hairStyle) {
    case 'short':
      p.ellipse(hx, hy - 9 * s, 27 * s, 13 * s);
      break;
    case 'spiky':
      p.poly([
        { x: hx - 14 * s, y: hy - 4 * s },
        { x: hx - 12 * s, y: hy - 18 * s },
        { x: hx - 6 * s, y: hy - 12 * s },
        { x: hx - 2 * s, y: hy - 22 * s },
        { x: hx + 3 * s, y: hy - 13 * s },
        { x: hx + 9 * s, y: hy - 20 * s },
        { x: hx + 10 * s, y: hy - 10 * s },
        { x: hx + 15 * s, y: hy - 4 * s },
        { x: hx, y: hy - 9 * s },
      ]);
      break;
    case 'long':
      p.ellipse(hx, hy - 9 * s, 30 * s, 14 * s);
      break;
    case 'afro':
      p.circle(hx, hy - 9 * s, 17 * s);
      p.noStroke();
      p.fill(skin);
      p.ellipse(hx, hy + 3 * s, 24 * s, 18 * s);
      p.fill(0xffffff);
      p.ellipse(hx - 5 * s, hy + 1 * s, 7 * s, 8 * s);
      p.ellipse(hx + 5 * s, hy + 1 * s, 7 * s, 8 * s);
      p.fill(OUTLINE);
      p.circle(hx - 4.5 * s, hy + 2 * s, 2 * s);
      p.circle(hx + 5.5 * s, hy + 2 * s, 2 * s);
      p.fill(shade(skin, 0.55));
      p.ellipse(hx, hy + 8 * s, 6 * s, 2.5 * s);
      break;
    case 'mohawk':
      p.roundRect(hx - 3.5 * s, hy - 24 * s, 7 * s, 16 * s, 3 * s);
      break;
    case 'bun':
      p.ellipse(hx, hy - 9 * s, 27 * s, 12 * s);
      p.circle(hx, hy - 18 * s, 6 * s);
      break;
  }
  p.noStroke();
}
