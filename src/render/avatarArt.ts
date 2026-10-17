import type { AvatarAppearance } from '../data/appearanceCatalog';
import { hex, shade, type Painter } from './painter';

/**
 * REPLACEMENT ART, drawn procedurally for this project. It follows the style of
 * the original's characters as seen in reference screenshots (INFERRED):
 * chibi proportions (head ~45% of height), big glossy eyes with heavy upper
 * lids, voluminous hair, slim limbs, chunky sneakers and dark outlines.
 * It is not traced from or derived from original sprites.
 *
 * (x, y) is the feet anchor; at scale 1 the figure is ~74px tall.
 */
export interface AvatarPose {
  /** 0..1 looping phase. */
  phase: number;
  dancing: boolean;
  walking: boolean;
  arms: 'down' | 'up' | 'drink' | 'headphones';
  /** Optional hand-held headphones look for the DJ (drawn over the head). */
  headphones?: boolean;
  /** Dark sunglasses (bouncers). */
  shades?: boolean;
  /** Seated: hips raised by `seatLift` px (the seat top), knees bent, feet on the floor. */
  sitting?: boolean;
  seatLift?: number;
}

const OUTLINE = 0x15121c;

type Pt = { x: number; y: number };

export function drawAvatar(p: Painter, a: AvatarAppearance, x: number, y: number, scale: number, pose: AvatarPose): void {
  const s = scale;
  const t = pose.phase * Math.PI * 2;
  const female = a.gender === 'f';
  const bob = pose.dancing ? Math.abs(Math.sin(t * 2)) * 4 * s : pose.walking ? Math.abs(Math.sin(t * 2)) * 1.5 * s : 0;
  const sway = pose.dancing ? Math.sin(t) * 3 * s : 0;
  const skin = hex(a.skin);
  const skinShade = shade(skin, 0.82);
  const top = hex(a.top);
  const bottom = hex(a.bottom);
  const hair = hex(a.hairColor);
  const shoe = hex(a.shoes);
  const lw = 1.6 * s;

  // Shadow
  p.noStroke();
  p.fill(0x000000, 0.35);
  p.ellipse(x, y, 26 * s, 9 * s);

  // Seated guests: the body sits on the seat top; legs bend down to the floor.
  const sitting = !!pose.sitting;
  const lift = sitting ? (pose.seatLift ?? 10) : 0;
  // hips sink into the cushion (lower than the seat top) so the pose reads clearly
  const hipY = y - lift * 0.5;
  const by = sitting ? hipY + 22 * s : y - bob;
  const legSwing = pose.walking ? Math.sin(t * 2) * 3 * s : pose.dancing ? Math.sin(t * 2) * 2.5 * s : 0;
  const legW = (female ? 4.2 : 4.8) * s;
  const legH = 20 * s;

  p.stroke(lw, OUTLINE);
  if (sitting) {
    // knees forward over the seat edge, short shins, feet apart in front
    p.fill(bottom);
    p.roundRect(x - 9 * s, hipY - 4 * s, 18 * s, 7 * s, 3.5 * s);
    p.fill(female ? skin : bottom);
    const shin = 6 * s;
    p.roundRect(x - 8.5 * s, hipY + 1.5 * s, legW, shin, 2 * s);
    p.roundRect(x + 4 * s, hipY + 1.5 * s, legW, shin, 2 * s);
    for (const [sx, dir] of [[x - 7 * s, -1], [x + 6.5 * s, 1]] as const) {
      p.fill(shoe);
      p.roundRect(sx - 4 * s + dir * 2 * s, hipY + 5.5 * s, 9 * s, 5 * s, 2.5 * s);
      p.fill(0xf4f4f4);
      p.roundRect(sx - 4.4 * s + dir * 2 * s, hipY + 9 * s, 9.8 * s, 2.2 * s, 1.1 * s);
    }
  } else {
  // Legs (pants)
  p.fill(female ? skin : bottom);
  p.roundRect(x - 5.5 * s + legSwing * 0.4 - legW / 2 + 2 * s, by - legH - 2 * s, legW, legH, 2 * s);
  p.roundRect(x + 1.5 * s - legSwing * 0.4, by - legH - 2 * s, legW, legH, 2 * s);
  if (female) {
    // shorts / skirt in bottom colour
    p.fill(bottom);
    p.poly([
      { x: x - 8 * s, y: by - 24 * s },
      { x: x + 8 * s, y: by - 24 * s },
      { x: x + 9.5 * s, y: by - 14 * s },
      { x: x - 9.5 * s, y: by - 14 * s },
    ]);
  }
  // Sneakers (chunky, white soles)
  for (const [sx, dir] of [[x - 5.5 * s + legSwing * 0.4, -1], [x + 3.5 * s - legSwing * 0.4, 1]] as const) {
    p.fill(shoe);
    p.roundRect(sx - 4 * s + dir * 1.2 * s, by - 6 * s, 9 * s, 5.5 * s, 2.5 * s);
    p.fill(0xf4f4f4);
    p.roundRect(sx - 4.4 * s + dir * 1.2 * s, by - 1.8 * s, 9.8 * s, 2.4 * s, 1.2 * s);
  }
  }

  // Torso
  const bx = x + sway * 0.4;
  const torsoTop = by - 40 * s;
  p.fill(top);
  if (female) {
    p.poly(roundedTorso(bx, torsoTop, 13 * s, 9.5 * s, 18 * s));
  } else {
    p.poly(roundedTorso(bx, torsoTop, 16 * s, 13 * s, 18 * s));
  }
  // belt / waist line
  p.noStroke();
  p.fill(shade(top, 0.75));
  p.rect(bx - (female ? 5 : 6.5) * s, torsoTop + 15.5 * s, (female ? 10 : 13) * s, 2.2 * s);
  p.stroke(lw, OUTLINE);

  // Arms
  const shoulderY = torsoTop + 2.5 * s;
  const armW = 3.6 * s;
  const sleeve = (ax: number, ay: number, len: number, up: boolean) => {
    p.fill(skin);
    p.roundRect(ax - armW / 2, up ? ay - len : ay, armW, len, armW / 2);
    p.fill(top);
    p.roundRect(ax - armW / 2 - 0.4 * s, up ? ay - 5 * s : ay, armW + 0.8 * s, 6 * s, 2 * s);
    p.fill(skin);
    p.circle(ax, up ? ay - len : ay + len, 2.4 * s);
  };
  const shoulderX = (female ? 7 : 8.6) * s;
  if (pose.arms === 'up') {
    const lift = Math.sin(t * 2) * 3 * s;
    sleeve(bx - shoulderX - 1 * s, shoulderY + lift, 15 * s, true);
    sleeve(bx + shoulderX + 1 * s, shoulderY - lift, 15 * s, true);
  } else if (pose.arms === 'drink') {
    sleeve(bx - shoulderX, shoulderY, 15 * s, false);
    sleeve(bx + shoulderX, shoulderY, 10 * s, false);
    p.fill(0x9ff3ff, 0.95);
    p.poly([
      { x: bx + shoulderX - 3 * s, y: shoulderY + 3 * s },
      { x: bx + shoulderX + 5 * s, y: shoulderY + 3 * s },
      { x: bx + shoulderX + 3 * s, y: shoulderY + 12 * s },
      { x: bx + shoulderX - 1 * s, y: shoulderY + 12 * s },
    ]);
  } else if (pose.arms === 'headphones') {
    sleeve(bx - shoulderX, shoulderY, 15 * s, false);
    sleeve(bx + shoulderX + 1 * s, shoulderY + 2 * s, 14 * s, true);
  } else {
    sleeve(bx - shoulderX, shoulderY, 15 * s, false);
    sleeve(bx + shoulderX, shoulderY, 15 * s, false);
  }

  // Neck
  p.fill(skinShade);
  p.rect(bx - 2.5 * s, torsoTop - 3 * s, 5 * s, 4 * s);

  // Head
  const hx = bx + sway * 0.35;
  const hy = torsoTop - 16 * s;
  const headW = 34 * s;
  const headH = 31 * s;
  drawHairBack(p, a.hairStyle, hair, hx, hy, s);
  p.fill(skin);
  p.ellipse(hx, hy, headW, headH);
  // ears
  p.fill(skin);
  p.ellipse(hx - headW / 2 + 0.5 * s, hy + 3 * s, 5 * s, 7 * s);
  p.ellipse(hx + headW / 2 - 0.5 * s, hy + 3 * s, 5 * s, 7 * s);
  p.noStroke();
  p.fill(skin);
  p.ellipse(hx, hy + 1 * s, headW - 2 * s, headH - 3 * s);

  // Eyes: large and glossy, but half-closed under a heavy skin-coloured upper
  // lid with a thick lash line - the cool, sleepy look of the reference art.
  const eyeY = hy + 3.5 * s;
  for (const ex of [hx - 6.8 * s, hx + 6.8 * s]) {
    const outer = ex < hx ? -1 : 1;
    p.fill(0xffffff);
    p.stroke(1.1 * s, OUTLINE);
    p.ellipse(ex, eyeY + 0.5 * s, 9.5 * s, 10 * s);
    p.noStroke();
    p.fill(0x3a2a20);
    p.ellipse(ex + 0.4 * s, eyeY + 1.6 * s, 6.4 * s, 7.6 * s);
    p.fill(0x0b0b10);
    p.ellipse(ex + 0.4 * s, eyeY + 2 * s, 3.6 * s, 4.4 * s);
    // heavy lid covers the top of the eye
    p.fill(skin);
    p.poly([
      { x: ex - 5.8 * s, y: eyeY - 7 * s },
      { x: ex + 5.8 * s, y: eyeY - 7 * s },
      { x: ex + 5.8 * s, y: eyeY + (outer > 0 ? 0.2 : -1.4) * s },
      { x: ex - 5.8 * s, y: eyeY + (outer > 0 ? -1.4 : 0.2) * s },
    ]);
    p.fill(0xffffff);
    p.circle(ex - 1.2 * s, eyeY + 1 * s, 1.3 * s);
    // lash line along the lid edge, thicker towards the outer corner
    p.fill(OUTLINE);
    p.poly([
      { x: ex - 5.4 * s * outer, y: eyeY + (outer > 0 ? -1.2 : 0) * s },
      { x: ex + 5.6 * s * outer, y: eyeY + (outer > 0 ? 0 : -1.2) * s },
      { x: ex + 6 * s * outer, y: eyeY + (outer > 0 ? -2.6 : -3.8) * s },
      { x: ex - 5 * s * outer, y: eyeY + (outer > 0 ? -2.6 : -2) * s },
    ]);
    if (female) {
      p.poly([
        { x: ex + 5.4 * s * outer, y: eyeY - 1.6 * s },
        { x: ex + 8 * s * outer, y: eyeY - 4.2 * s },
        { x: ex + 4.8 * s * outer, y: eyeY - 3.2 * s },
      ]);
    }
  }
  // brows
  p.fill(shade(hair, 0.7));
  p.poly([{ x: hx - 11 * s, y: eyeY - 7.4 * s }, { x: hx - 3.5 * s, y: eyeY - 8.8 * s }, { x: hx - 3.5 * s, y: eyeY - 7.2 * s }, { x: hx - 11 * s, y: eyeY - 5.9 * s }]);
  p.poly([{ x: hx + 3.5 * s, y: eyeY - 8.8 * s }, { x: hx + 11 * s, y: eyeY - 7.4 * s }, { x: hx + 11 * s, y: eyeY - 5.9 * s }, { x: hx + 3.5 * s, y: eyeY - 7.2 * s }]);
  // nose + mouth
  p.fill(skinShade);
  p.ellipse(hx + 0.5 * s, eyeY + 6.5 * s, 2.6 * s, 1.8 * s);
  p.fill(female ? 0xc0394f : shade(skin, 0.5));
  p.ellipse(hx + 0.5 * s, eyeY + 10 * s, female ? 5 * s : 4.5 * s, female ? 2.4 * s : 1.6 * s);

  p.stroke(lw, OUTLINE);
  drawHairFront(p, a.hairStyle, hair, hx, hy, s);

  if (pose.shades) {
    p.noStroke();
    p.fill(0x0b0b10);
    p.roundRect(hx - 13 * s, eyeY - 4.5 * s, 11 * s, 8 * s, 3 * s);
    p.roundRect(hx + 2 * s, eyeY - 4.5 * s, 11 * s, 8 * s, 3 * s);
    p.rect(hx - 3 * s, eyeY - 3 * s, 6 * s, 1.6 * s);
    p.fill(0xffffff, 0.35);
    p.rect(hx - 11 * s, eyeY - 3.5 * s, 4 * s, 1.4 * s);
    p.rect(hx + 4 * s, eyeY - 3.5 * s, 4 * s, 1.4 * s);
  }
  if (pose.headphones) {
    p.fill(0x2a2c33);
    p.stroke(lw, OUTLINE);
    p.poly(arc(hx, hy - 1 * s, 19 * s, 19 * s, Math.PI * 1.02, Math.PI * 1.98, 3.2 * s));
    p.fill(0xd8dde6);
    p.ellipse(hx - 17 * s, hy + 3 * s, 8 * s, 12 * s);
    p.ellipse(hx + 17 * s, hy + 3 * s, 8 * s, 12 * s);
    p.fill(0x00c8ff);
    p.ellipse(hx - 17 * s, hy + 3 * s, 3.5 * s, 6 * s);
    p.ellipse(hx + 17 * s, hy + 3 * s, 3.5 * s, 6 * s);
  }
  p.noStroke();
}

function roundedTorso(cx: number, topY: number, shoulderW: number, waistW: number, h: number): Pt[] {
  return [
    { x: cx - shoulderW / 2 + 1.5, y: topY },
    { x: cx + shoulderW / 2 - 1.5, y: topY },
    { x: cx + shoulderW / 2, y: topY + 3 },
    { x: cx + waistW / 2, y: topY + h },
    { x: cx - waistW / 2, y: topY + h },
    { x: cx - shoulderW / 2, y: topY + 3 },
  ];
}

/** A thick arc band as a polygon (for headbands, brims, headphones). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, thick: number): Pt[] {
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = a0 + ((a1 - a0) * i) / 12;
    outer.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
    inner.push({ x: cx + Math.cos(a) * (rx - thick), y: cy + Math.sin(a) * (ry - thick) });
  }
  return [...outer, ...inner.reverse()];
}

function drawHairBack(p: Painter, style: string, hair: number, hx: number, hy: number, s: number): void {
  p.fill(hair);
  switch (style) {
    case 'long':
      p.roundRect(hx - 19 * s, hy - 12 * s, 38 * s, 40 * s, 12 * s);
      break;
    case 'bob':
      p.roundRect(hx - 19.5 * s, hy - 14 * s, 39 * s, 30 * s, 13 * s);
      break;
    case 'afro':
      p.circle(hx, hy - 6 * s, 23 * s);
      break;
    case 'ponytail':
      p.ellipse(hx + 18 * s, hy + 2 * s, 12 * s, 26 * s);
      break;
    case 'bun':
      p.circle(hx, hy - 20 * s, 8 * s);
      break;
  }
}

function drawHairFront(p: Painter, style: string, hair: number, hx: number, hy: number, s: number): void {
  const hi = shade(hair, 1.35);
  p.fill(hair);
  const cap = () =>
    p.poly([
      { x: hx - 17.5 * s, y: hy + 1 * s },
      { x: hx - 16 * s, y: hy - 10 * s },
      { x: hx - 8 * s, y: hy - 17 * s },
      { x: hx + 4 * s, y: hy - 18 * s },
      { x: hx + 14 * s, y: hy - 13 * s },
      { x: hx + 17.5 * s, y: hy - 2 * s },
      { x: hx + 13 * s, y: hy - 6 * s },
      { x: hx + 4 * s, y: hy - 8 * s },
      { x: hx - 6 * s, y: hy - 7 * s },
      { x: hx - 13 * s, y: hy - 4 * s },
    ]);
  switch (style) {
    case 'short':
      cap();
      break;
    case 'spiky':
      p.poly([
        { x: hx - 17.5 * s, y: hy + 1 * s },
        { x: hx - 20 * s, y: hy - 12 * s },
        { x: hx - 11 * s, y: hy - 13 * s },
        { x: hx - 12 * s, y: hy - 24 * s },
        { x: hx - 3 * s, y: hy - 17 * s },
        { x: hx + 1 * s, y: hy - 27 * s },
        { x: hx + 6 * s, y: hy - 17 * s },
        { x: hx + 15 * s, y: hy - 22 * s },
        { x: hx + 13 * s, y: hy - 12 * s },
        { x: hx + 21 * s, y: hy - 9 * s },
        { x: hx + 17.5 * s, y: hy - 1 * s },
        { x: hx + 8 * s, y: hy - 8 * s },
        { x: hx - 8 * s, y: hy - 7 * s },
      ]);
      break;
    case 'swoop':
      // side-swept fringe falling over one eye, a hallmark of the reference style
      p.poly([
        { x: hx - 17.5 * s, y: hy + 3 * s },
        { x: hx - 17 * s, y: hy - 11 * s },
        { x: hx - 6 * s, y: hy - 19 * s },
        { x: hx + 9 * s, y: hy - 18 * s },
        { x: hx + 18 * s, y: hy - 8 * s },
        { x: hx + 17.5 * s, y: hy + 2 * s },
        { x: hx + 12 * s, y: hy - 3 * s },
        { x: hx + 6 * s, y: hy + 3 * s },
        { x: hx - 2 * s, y: hy - 3 * s },
        { x: hx - 12 * s, y: hy - 4 * s },
      ]);
      break;
    case 'afro':
      p.poly([
        { x: hx - 16 * s, y: hy - 4 * s },
        { x: hx - 10 * s, y: hy - 13 * s },
        { x: hx + 10 * s, y: hy - 13 * s },
        { x: hx + 16 * s, y: hy - 4 * s },
        { x: hx + 6 * s, y: hy - 8 * s },
        { x: hx - 6 * s, y: hy - 8 * s },
      ]);
      break;
    case 'mohawk':
      p.fill(shade(hair, 0.6));
      p.ellipse(hx, hy - 10 * s, 26 * s, 9 * s);
      p.fill(hair);
      p.poly([
        { x: hx - 4 * s, y: hy - 12 * s },
        { x: hx - 3 * s, y: hy - 28 * s },
        { x: hx + 1 * s, y: hy - 24 * s },
        { x: hx + 4 * s, y: hy - 30 * s },
        { x: hx + 5 * s, y: hy - 12 * s },
      ]);
      break;
    case 'long':
    case 'bob':
    case 'ponytail':
      p.poly([
        { x: hx - 18.5 * s, y: hy + 6 * s },
        { x: hx - 17 * s, y: hy - 11 * s },
        { x: hx - 6 * s, y: hy - 19 * s },
        { x: hx + 8 * s, y: hy - 18 * s },
        { x: hx + 18 * s, y: hy - 9 * s },
        { x: hx + 18.5 * s, y: hy + 6 * s },
        { x: hx + 14 * s, y: hy - 4 * s },
        { x: hx + 3 * s, y: hy - 7 * s },
        { x: hx - 9 * s, y: hy - 2 * s },
        { x: hx - 14 * s, y: hy - 3 * s },
      ]);
      break;
    case 'bun':
      cap();
      break;
    case 'beret':
      cap();
      p.fill(hi);
      p.ellipse(hx + 3 * s, hy - 15 * s, 36 * s, 14 * s);
      p.fill(shade(hi, 0.85));
      p.circle(hx + 4 * s, hy - 22 * s, 2.2 * s);
      break;
    case 'fedora':
      p.fill(hair);
      p.ellipse(hx, hy - 11 * s, 44 * s, 11 * s);
      p.roundRect(hx - 12 * s, hy - 27 * s, 24 * s, 17 * s, 5 * s);
      p.fill(0x1b1b1b);
      p.rect(hx - 12 * s, hy - 15 * s, 24 * s, 4 * s);
      break;
    case 'beanie':
      p.fill(hair);
      p.poly(arc(hx, hy - 2 * s, 18 * s, 19 * s, Math.PI, Math.PI * 2, 19 * s));
      p.fill(shade(hair, 0.75));
      p.roundRect(hx - 18 * s, hy - 7 * s, 36 * s, 6 * s, 3 * s);
      break;
  }
  if (style !== 'fedora' && style !== 'beanie' && style !== 'mohawk') {
    // glossy highlight streak
    p.noStroke();
    p.fill(hi, 0.7);
    p.ellipse(hx - 5 * s, hy - 13 * s, 10 * s, 3 * s);
  }
}
