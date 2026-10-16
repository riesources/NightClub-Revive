import {
  BOTTOM_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  TOP_COLORS,
  type AvatarAppearance,
} from '../data/appearanceCatalog';
import { drawAvatar } from '../render/avatarArt';
import { CanvasPainter } from '../render/painter';
import { h } from './dom';

type Category = { key: keyof AvatarAppearance; label: string; options: readonly string[]; swatch: boolean };

const CATEGORIES: Category[] = [
  { key: 'skin', label: 'Skin', options: SKIN_TONES, swatch: true },
  { key: 'hairStyle', label: 'Hair Style', options: HAIR_STYLES, swatch: false },
  { key: 'hairColor', label: 'Hair Color', options: HAIR_COLORS, swatch: true },
  { key: 'top', label: 'Top', options: TOP_COLORS, swatch: true },
  { key: 'bottom', label: 'Bottoms', options: BOTTOM_COLORS, swatch: true },
];

/**
 * Dressing room: edits a *draft* copy; nothing persists until Save.
 * Randomize is intentionally omitted until a reference screenshot confirms it existed.
 */
export function openDressingRoom(current: AvatarAppearance, onSave: (a: AvatarAppearance) => void, onClose: () => void): HTMLElement {
  const draft: AvatarAppearance = { ...current };
  let tab: Category = CATEGORIES[0];
  const canvas = h('canvas', { width: 220, height: 260, class: 'dr-canvas' });
  const options = h('div', { class: 'dr-options' });
  const tabs = h('div', { class: 'dr-tabs' });
  let raf = 0;

  const paint = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grd = ctx.createRadialGradient(110, 200, 10, 110, 160, 160);
    grd.addColorStop(0, '#2b3a8f');
    grd.addColorStop(1, '#0b0e24');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawAvatar(new CanvasPainter(ctx), draft, 110, 235, 3.2, { phase: (performance.now() / 1400) % 1, dancing: false, walking: false, arms: 'down' });
    raf = requestAnimationFrame(paint);
  };

  const renderOptions = () => {
    tabs.replaceChildren(
      ...CATEGORIES.map((c) =>
        h('button', { class: `tab${c === tab ? ' active' : ''}`, onclick: () => ((tab = c), renderOptions()) }, c.label),
      ),
    );
    options.replaceChildren(
      ...tab.options.map((o) =>
        h(
          'button',
          {
            class: `dr-opt${draft[tab.key] === o ? ' active' : ''}`,
            title: o,
            style: tab.swatch ? `background:${o}` : undefined,
            onclick: () => {
              (draft as unknown as Record<string, string>)[tab.key] = o;
              renderOptions();
            },
          },
          tab.swatch ? '' : o,
        ),
      ),
    );
  };

  const close = () => {
    cancelAnimationFrame(raf);
    root.remove();
    onClose();
  };

  const root = h(
    'div',
    { class: 'modal-backdrop' },
    h(
      'div',
      { class: 'modal dressing-room', role: 'dialog', 'aria-label': 'Dressing Room' },
      h('div', { class: 'modal-title' }, 'Dressing Room'),
      h('div', { class: 'dr-body' }, h('div', { class: 'dr-preview' }, canvas), h('div', { class: 'dr-right' }, tabs, options)),
      h(
        'div',
        { class: 'modal-actions' },
        h('button', { class: 'btn', onclick: close }, 'Cancel'),
        h(
          'button',
          {
            class: 'btn primary',
            onclick: () => {
              onSave({ ...draft });
              close();
            },
          },
          'Save',
        ),
      ),
      h('div', { class: 'placeholder-note' }, 'Replacement art - not original game assets'),
    ),
  );
  renderOptions();
  paint();
  return root;
}
