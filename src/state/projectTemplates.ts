import { CARD_PRESETS } from '../domain/cardPresets';
import type { ProjectSettings } from './types';

/**
 * Starting points for a new project: paper, card size and the print options
 * that usually go with them. Applying a template only changes layout settings
 * — images, cards and calibration stay untouched.
 */
export interface ProjectTemplate {
  id: string;
  /** Key under `templates.names` in the translation resources. */
  nameKey: string;
  settings: Partial<ProjectSettings>;
}

function preset(id: string): { cardWidthMm: number; cardHeightMm: number } {
  const found = CARD_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown card preset: ${id}`);
  return { cardWidthMm: found.widthMm, cardHeightMm: found.heightMm };
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'poker-a4',
    nameKey: 'pokerA4',
    settings: {
      paperSizeId: 'a4',
      orientation: 'portrait',
      ...preset('poker'),
      bleedEnabled: false,
      gutterMm: 0,
      cornerRadiusMm: 3,
      duplexMode: 'short-edge',
      cropMarksEnabled: true,
    },
  },
  {
    id: 'poker-a4-bleed',
    nameKey: 'pokerA4Bleed',
    settings: {
      paperSizeId: 'a4',
      orientation: 'portrait',
      ...preset('poker'),
      bleedEnabled: true,
      bleedMm: 3,
      gutterMm: 0,
      cornerRadiusMm: 3,
      duplexMode: 'short-edge',
      cropMarksEnabled: true,
      safeMarginEnabled: true,
      safeMarginMm: 3,
    },
  },
  {
    id: 'mini-euro-a4',
    nameKey: 'miniEuroA4',
    settings: {
      paperSizeId: 'a4',
      orientation: 'portrait',
      ...preset('mini-euro'),
      bleedEnabled: false,
      gutterMm: 0,
      cornerRadiusMm: 2,
      duplexMode: 'short-edge',
      cropMarksEnabled: true,
    },
  },
  {
    id: 'tarot-a4',
    nameKey: 'tarotA4',
    settings: {
      paperSizeId: 'a4',
      orientation: 'portrait',
      ...preset('tarot'),
      bleedEnabled: false,
      gutterMm: 0,
      cornerRadiusMm: 4,
      duplexMode: 'short-edge',
      cropMarksEnabled: true,
    },
  },
  {
    id: 'poker-a3',
    nameKey: 'pokerA3',
    settings: {
      paperSizeId: 'a3',
      orientation: 'portrait',
      ...preset('poker'),
      bleedEnabled: false,
      gutterMm: 0,
      cornerRadiusMm: 3,
      duplexMode: 'short-edge',
      cropMarksEnabled: true,
    },
  },
  {
    id: 'poker-letter',
    nameKey: 'pokerLetter',
    settings: {
      paperSizeId: 'letter',
      orientation: 'portrait',
      ...preset('poker'),
      bleedEnabled: false,
      gutterMm: 0,
      cornerRadiusMm: 3,
      duplexMode: 'short-edge',
      cropMarksEnabled: true,
    },
  },
  {
    id: 'square-a4',
    nameKey: 'squareA4',
    settings: {
      paperSizeId: 'a4',
      orientation: 'portrait',
      ...preset('small-square'),
      bleedEnabled: false,
      gutterMm: 2,
      cornerRadiusMm: 3,
      duplexMode: 'short-edge',
      cropMarksEnabled: true,
    },
  },
];
