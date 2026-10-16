import {
  BOTTOM_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  SHOE_COLORS,
  SKIN_TONES,
  TOP_COLORS,
  appearanceFromSeed,
  type AvatarAppearance,
  type Gender,
} from '../data/appearanceCatalog';
import { drawAvatar } from '../render/avatarArt';
import { CanvasPainter } from '../render/painter';
import { h } from './dom';
import { ICONS } from './icons';
import { portrait } from './portrait';

type Tab = 'hairStyle' | 'top' | 'bottom' | 'shoes';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'hairStyle', icon: ICONS.hair, label: 'Hair & hats' },
  { key: 'top', icon: ICONS.shirt, label: 'Tops' },
  { key: 'bottom', icon: ICONS.pants, label: 'Bottoms' },
  { key: 'shoes', icon: ICONS.shoe, label: 'Shoes' },
];

/**
 * Dressing room laid out like the original (Gamezebo screenshot, CONFIRMED
 * structure): GENDER with a randomize dice and SKIN COLOR on the left, a large
 * preview in the centre, HEAD COLORS on the right, a green OK button, and a
 * blue band of category tabs with "Free" items along the bottom.
 * Edits a draft; nothing persists until OK.
 */
export function openDressingRoom(current: AvatarAppearance, onSave: (a: AvatarAppearance) => void, onClose: () => void): HTMLElement {
  let draft: AvatarAppearance = { ...current };
  let tab: Tab = 'hairStyle';
  const canvas = h('canvas', { width: 260, height: 300, class: 'dr-canvas' });
  const left = h('div', { class: 'dr-col' });
  const right = h('div', { class: 'dr-col' });
  const tabs = h('div', { class: 'dr-tabs' });
  const items = h('div', { class: 'dr-items' });
  let raf = 0;

  const paint = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createRadialGradient(130, 250, 10, 130, 200, 170);
    g.addColorStop(0, 'rgba(120,180,255,.35)');
    g.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawAvatar(new CanvasPainter(ctx), draft, 130, 288, 3.4, { phase: (performance.now() / 1600) % 1, dancing: false, walking: false, arms: 'down' });
    raf = requestAnimationFrame(paint);
  };

  const swatches = (options: readonly string[], key: 'skin' | 'hairColor') =>
    h(
      'div',
      { class: 'swatches' },
      ...options.map((o) =>
        h('button', {
          class: `sw${draft[key] === o ? ' active' : ''}`,
          style: `background:${o}`,
          'aria-label': `${key === 'skin' ? 'Skin' : 'Hair'} color ${o}`,
          onclick: () => {
            draft = { ...draft, [key]: o };
            render();
          },
        }),
      ),
    );

  const render = () => {
    left.replaceChildren(
      h(
        'div',
        { class: 'dr-box' },
        h('div', { class: 'dr-box-title' }, 'GENDER'),
        h(
          'div',
          { class: 'gender-row' },
          ...(['m', 'f'] as Gender[]).map((g) =>
            h('button', {
              class: `gender${draft.gender === g ? ' active' : ''}`,
              'aria-label': g === 'm' ? 'Male' : 'Female',
              html: g === 'm' ? ICONS.male : ICONS.female,
              onclick: () => {
                draft = { ...draft, gender: g };
                render();
              },
            }),
          ),
          h('button', {
            class: 'gender dice',
            title: 'Randomize',
            'aria-label': 'Randomize look',
            html: ICONS.dice,
            onclick: () => {
              draft = appearanceFromSeed(Math.floor(Math.random() * 1e9));
              render();
            },
          }),
        ),
      ),
      h('div', { class: 'dr-box' }, h('div', { class: 'dr-box-title' }, 'SKIN COLOR'), swatches(SKIN_TONES, 'skin')),
    );
    right.replaceChildren(h('div', { class: 'dr-box' }, h('div', { class: 'dr-box-title' }, 'HEAD COLORS'), swatches(HAIR_COLORS, 'hairColor')));
    tabs.replaceChildren(
      ...TABS.map((t) =>
        h('button', {
          class: `dr-tab${t.key === tab ? ' active' : ''}`,
          title: t.label,
          'aria-label': t.label,
          html: t.icon,
          onclick: () => {
            tab = t.key;
            render();
          },
        }),
      ),
    );
    if (tab === 'hairStyle') {
      items.replaceChildren(
        ...HAIR_STYLES.map((st) =>
          h(
            'button',
            {
              class: `dr-item${draft.hairStyle === st ? ' active' : ''}`,
              'aria-label': `Hair ${st}`,
              onclick: () => {
                draft = { ...draft, hairStyle: st };
                render();
              },
            },
            portrait({ ...draft, hairStyle: st }, 56),
            h('span', {}, 'Free'),
          ),
        ),
      );
    } else {
      const opts = tab === 'top' ? TOP_COLORS : tab === 'bottom' ? BOTTOM_COLORS : SHOE_COLORS;
      items.replaceChildren(
        ...opts.map((o) =>
          h(
            'button',
            {
              class: `dr-item${draft[tab] === o ? ' active' : ''}`,
              'aria-label': `${tab} ${o}`,
              onclick: () => {
                draft = { ...draft, [tab]: o };
                render();
              },
            },
            h('div', { class: 'dr-chip', html: (TABS.find((t) => t.key === tab)!.icon).replace(/#fff"|#5aa0e8"|#f4e6d8"/, `${o}"`) }),
            h('span', {}, 'Free'),
          ),
        ),
      );
    }
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
      { class: 'dressing-room', role: 'dialog', 'aria-label': 'Dressing Room' },
      h(
        'div',
        { class: 'dr-top' },
        h('div', { class: 'dr-heading' }, 'Dressing Room'),
        h('div', { class: 'dr-buttons' }, h('button', { class: 'btn', onclick: close }, 'Cancel'), h(
          'button',
          {
            class: 'btn ok big',
            onclick: () => {
              onSave({ ...draft });
              close();
            },
          },
          'OK',
        )),
      ),
      h('div', { class: 'dr-stage' }, left, h('div', { class: 'dr-preview' }, canvas), right),
      h('div', { class: 'dr-band' }, tabs, items),
      h('div', { class: 'placeholder-note dark' }, 'All clothing is free in this build. Art is original replacement art.'),
    ),
  );
  render();
  paint();
  return root;
}
