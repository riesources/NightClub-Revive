/** Tiny DOM helpers - no framework, so overlays stay light and Flash-like. */
type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export const fmt = (n: number): string => Math.floor(n).toLocaleString('en-US');

export function mmss(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Inline SVG icons (original, simple shapes - no emoji so rendering is consistent). */
export const ICON = {
  cash: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd23f" stroke="#8a5a00" stroke-width="2"/><text x="12" y="17" text-anchor="middle" font-size="13" font-weight="bold" fill="#8a5a00">$</text></svg>',
  pop: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="#ff3d7f" stroke="#7a0b33" stroke-width="1.5"/></svg>',
  lux: '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z" fill="#7df9ff" stroke="#0b6b80" stroke-width="1.5"/><path d="M2 9h20M9 3l3 18 3-18" stroke="#0b6b80" stroke-width="1" fill="none"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21l1.5-7L2 9.3l7-.8z" fill="#ffd23f" stroke="#8a5a00" stroke-width="1.5"/></svg>',
  drink: '<svg viewBox="0 0 24 24"><path d="M5 4h14l-6 8v6h3v2H8v-2h3v-6z" fill="#7df9ff" stroke="#0b6b80" stroke-width="1.5"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" stroke="#ff3df2" stroke-width="2.5" fill="none"/><circle cx="6.5" cy="18" r="3" fill="#ff3df2"/><circle cx="17.5" cy="16" r="3" fill="#ff3df2"/></svg>',
  build: '<svg viewBox="0 0 24 24"><path d="M3 21l7-7M14 3l7 7-4 4-7-7z" stroke="#fff" stroke-width="2.5" fill="#ffd23f"/></svg>',
  dj: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="12" rx="2" fill="#2b2f3a" stroke="#00e5ff" stroke-width="2"/><circle cx="8" cy="13" r="3.5" fill="#00e5ff"/><circle cx="16" cy="13" r="3.5" fill="#ff3df2"/></svg>',
  staff: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4.5" fill="#f8d5b5" stroke="#000" stroke-width="1.2"/><path d="M4 21c0-5 3.5-7 8-7s8 2 8 7z" fill="#3ddc84" stroke="#000" stroke-width="1.2"/></svg>',
  dress: '<svg viewBox="0 0 24 24"><path d="M8 3l-5 4 3 4 2-1v11h8V10l2 1 3-4-5-4c-1 2-2 3-4 3s-3-1-4-3z" fill="#ff3df2" stroke="#000" stroke-width="1.2"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke="#fff" stroke-width="2.5"/></svg>',
  bug: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="13" rx="5" ry="7" fill="#3ddc84" stroke="#000" stroke-width="1.2"/><path d="M7 9L3 6M17 9l4-3M7 14H2M17 14h5M8 18l-3 3M16 18l3 3" stroke="#3ddc84" stroke-width="2"/></svg>',
};
