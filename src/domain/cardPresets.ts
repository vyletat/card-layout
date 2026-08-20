export interface CardPreset {
  id: string;
  /** i18n key under settings.cardPresets for the descriptive name. */
  nameKey: string;
  widthMm: number;
  heightMm: number;
}

/**
 * The most widely used card sizes in trading card games and board games,
 * matching the de-facto standards used by sleeve manufacturers (Mayday,
 * Ultra Pro, Dragon Shield, etc.). Dimensions are the card (not sleeve) size.
 */
export const CARD_PRESETS: CardPreset[] = [
  { id: 'poker', nameKey: 'poker', widthMm: 63.5, heightMm: 88 }, // playing cards, MTG, Pokémon, most TCGs
  { id: 'bridge', nameKey: 'bridge', widthMm: 57, heightMm: 88 }, // slimmer playing cards
  { id: 'standard-us', nameKey: 'standardUs', widthMm: 56, heightMm: 87 }, // Munchkin, Dominion promos
  { id: 'standard-euro', nameKey: 'standardEuro', widthMm: 59, heightMm: 92 }, // Ticket to Ride, Dominion
  { id: 'mini-us', nameKey: 'miniUs', widthMm: 41, heightMm: 63 }, // small board-game cards
  { id: 'mini-euro', nameKey: 'miniEuro', widthMm: 45, heightMm: 68 }, // 7 Wonders, Race for the Galaxy
  { id: 'tarot', nameKey: 'tarot', widthMm: 70, heightMm: 120 }, // tarot / oversized
  { id: 'large-square', nameKey: 'largeSquare', widthMm: 80, heightMm: 80 }, // square cards
  { id: 'small-square', nameKey: 'smallSquare', widthMm: 63, heightMm: 63 },
];

const EPS = 0.51; // tolerance in mm when matching current size to a preset

export function findMatchingPreset(widthMm: number, heightMm: number): CardPreset | undefined {
  return CARD_PRESETS.find(
    (p) => Math.abs(p.widthMm - widthMm) <= EPS && Math.abs(p.heightMm - heightMm) <= EPS,
  );
}
