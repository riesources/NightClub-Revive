import type { AvatarAppearance } from '../data/appearanceCatalog';
import type { StaffMember } from '../domain/types';

/** Stable NPC staff appearance from their name; bouncers dress in black. */
export function staffAppearance(s: Pick<StaffMember, 'name' | 'role'>): AvatarAppearance {
  let seed = 7;
  for (const ch of s.name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const looks: AvatarAppearance[] = [
    { gender: 'm', skin: '#c98b5e', hairStyle: 'fedora', hairColor: '#1b1b1b', top: '#262a36', bottom: '#222222', shoes: '#1b1b1b' },
    { gender: 'f', skin: '#f2c9a0', hairStyle: 'ponytail', hairColor: '#a0522d', top: '#ffffff', bottom: '#222222', shoes: '#1b1b1b' },
    { gender: 'm', skin: '#7f4a2a', hairStyle: 'short', hairColor: '#1b1b1b', top: '#e0344a', bottom: '#1f2a44', shoes: '#ffffff' },
    { gender: 'f', skin: '#e3ac7c', hairStyle: 'bob', hairColor: '#1b1b1b', top: '#262a36', bottom: '#1f2a44', shoes: '#e0344a' },
  ];
  const base = looks[seed % looks.length];
  return s.role === 'bouncer' ? { ...base, hairStyle: base.gender === 'm' ? 'short' : 'ponytail', top: '#262a36', bottom: '#222222', shoes: '#1b1b1b' } : base;
}
