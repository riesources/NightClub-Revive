import type { AvatarAppearance } from './appearanceCatalog';

/**
 * Celebrity roster. The *feature* is CONFIRMED (GameYum: celebrities visit
 * briefly, spend big, are expensive to book, and are logged on a celebrity
 * wall; Pixnet screenshot: a Celebrities panel with level-gated cards).
 *
 * The original used parody names of real people. To avoid imitating anyone,
 * every VIP here is an ORIGINAL fictional character. All numbers PROPOSED.
 */
export interface CelebrityDef {
  id: string;
  name: string;
  /** Short description shown on the card. */
  title: string;
  requiredLevel: number;
  cost: number;
  /** How long they stay once they arrive. */
  visitMs: number;
  /** Cash they spend in the club every `spendEveryMs` while present. */
  spendPerTick: number;
  /** Popularity gained when they leave happy. */
  popularityBonus: number;
  look: AvatarAppearance;
}

const L = (gender: 'm' | 'f', skin: string, hairStyle: AvatarAppearance['hairStyle'], hairColor: string, top: string, bottom: string, shoes: string): AvatarAppearance => ({
  gender, skin, hairStyle, hairColor, top, bottom, shoes,
});

export const CELEBRITIES: readonly CelebrityDef[] = [
  { id: 'dj_nova', name: 'DJ Nova Spin', title: 'Underground turntable legend', requiredLevel: 1, cost: 1500, visitMs: 120_000, spendPerTick: 60, popularityBonus: 15, look: L('f', '#e3ac7c', 'bob', '#3fa0ff', '#262a36', '#222222', '#ff3df2') },
  { id: 'max_velvet', name: 'Max Velvet', title: 'Smooth-voiced crooner', requiredLevel: 2, cost: 3000, visitMs: 150_000, spendPerTick: 100, popularityBonus: 25, look: L('m', '#c98b5e', 'fedora', '#1b1b1b', '#e0344a', '#222222', '#1b1b1b') },
  { id: 'lola_glitz', name: 'Lola Glitz', title: 'Pop princess of the charts', requiredLevel: 3, cost: 5000, visitMs: 150_000, spendPerTick: 160, popularityBonus: 40, look: L('f', '#fbe0c8', 'long', '#ff7ac8', '#ffd23f', '#6b4e9e', '#ffffff') },
  { id: 'big_tempo', name: 'Big Tempo', title: 'Hip-hop heavyweight', requiredLevel: 4, cost: 8000, visitMs: 180_000, spendPerTick: 220, popularityBonus: 55, look: L('m', '#5c331c', 'beanie', '#e0344a', '#ffffff', '#1f2a44', '#ffd23f') },
  { id: 'astra_bloom', name: 'Astra Bloom', title: 'Runway supermodel', requiredLevel: 5, cost: 12000, visitMs: 180_000, spendPerTick: 300, popularityBonus: 75, look: L('f', '#a8693f', 'ponytail', '#e8b830', '#ffffff', '#c0c6d0', '#ffffff') },
  { id: 'rex_thunder', name: 'Rex Thunder', title: 'Action-movie star', requiredLevel: 6, cost: 18000, visitMs: 210_000, spendPerTick: 420, popularityBonus: 100, look: L('m', '#f2c9a0', 'spiky', '#c0c0c8', '#262a36', '#3a6ea5', '#1b1b1b') },
  { id: 'kiki_neon', name: 'Kiki Neon', title: 'Electro-pop sensation', requiredLevel: 7, cost: 26000, visitMs: 210_000, spendPerTick: 560, popularityBonus: 130, look: L('f', '#f2c9a0', 'afro', '#8a4cff', '#00c8ff', '#222222', '#3fa0ff') },
  { id: 'baron_bass', name: 'Baron von Bass', title: 'Mysterious masked producer', requiredLevel: 8, cost: 36000, visitMs: 240_000, spendPerTick: 750, popularityBonus: 170, look: L('m', '#7f4a2a', 'mohawk', '#3ddc84', '#9b59ff', '#222222', '#ff3df2') },
];

export const getCelebrity = (id: string) => CELEBRITIES.find((c) => c.id === id);

/** PROPOSED: celebrities arrive a short while after booking. */
export const CELEB_ARRIVAL_DELAY_MS = 5000;
/** PROPOSED: how often a present celebrity spends money. */
export const CELEB_SPEND_EVERY_MS = 10_000;
