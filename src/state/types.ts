import { newId } from '../domain/ids';
import type { LengthUnit } from '../domain/units';
import type { Orientation } from '../domain/paperSizes';
import type { DuplexMode } from '../domain/duplexMapping';
import type { Language } from '../i18n/languages';

export interface ProjectSettings {
  unit: LengthUnit;
  paperSizeId: string;
  /** Only used when paperSizeId === 'custom'. */
  customPaperWidthMm: number;
  customPaperHeightMm: number;
  orientation: Orientation;

  cardWidthMm: number;
  cardHeightMm: number;

  bleedEnabled: boolean;
  bleedMm: number;

  cornerRadiusMm: number;
  gutterMm: number;

  duplexMode: DuplexMode;
  cropMarksEnabled: boolean;
  /** Corner registration targets, printed identically on both sides. */
  registrationMarksEnabled: boolean;
  /** Prints each card's deck number, so cut cards stay identifiable. */
  cardNumbersEnabled: boolean;

  /** On-screen guide marking how far artwork must stay from the trim edge. */
  safeMarginEnabled: boolean;
  safeMarginMm: number;

  calibrationOffsetXMm: number;
  calibrationOffsetYMm: number;
  /** Back-side scale correction in percent (100 = printer is exact). */
  calibrationScaleXPct: number;
  calibrationScaleYPct: number;
  /** Back-side rotation correction in degrees. */
  calibrationRotationDeg: number;

  language: Language;
  paperTexturePreview: boolean;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  unit: 'mm',
  paperSizeId: 'a4',
  customPaperWidthMm: 210,
  customPaperHeightMm: 297,
  orientation: 'portrait',

  cardWidthMm: 63,
  cardHeightMm: 88,

  bleedEnabled: false,
  bleedMm: 3,

  cornerRadiusMm: 0,
  gutterMm: 0,

  duplexMode: 'short-edge',
  cropMarksEnabled: false,
  registrationMarksEnabled: false,
  cardNumbersEnabled: false,

  safeMarginEnabled: false,
  safeMarginMm: 3,

  calibrationOffsetXMm: 0,
  calibrationOffsetYMm: 0,
  calibrationScaleXPct: 100,
  calibrationScaleYPct: 100,
  calibrationRotationDeg: 0,

  language: 'en',
  paperTexturePreview: false,
};

export type ImageKind = 'front' | 'back';

export interface CardImageMeta {
  id: string;
  /**
   * The project that owns this image. Undefined only for images stored before
   * the library was scoped per project; those are adopted on the next startup.
   */
  projectId?: string;
  /** Original file name at upload time; used for auto-pairing. */
  fileName: string;
  /** User-editable label shown in the library. Falls back to fileName when unset. */
  displayName?: string;
  /** Whether this image is a front (líc) or back (rub). Defaults to front. */
  kind?: ImageKind;
  widthPx: number;
  heightPx: number;
  createdAt: number;
}

/** The label to show for an image in the UI. */
export function imageLabel(meta: CardImageMeta): string {
  return meta.displayName ?? meta.fileName;
}

/** The image's front/back designation, defaulting to front when unset. */
export function imageKind(meta: CardImageMeta): ImageKind {
  return meta.kind ?? 'front';
}

export interface ImageTransform {
  /** Offset of the image center from the cell center, in mm. */
  offsetXMm: number;
  offsetYMm: number;
  /** Multiplier on top of the base contain-fit scale. Independent X/Y allows stretching when unlocked. */
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
  aspectLocked: boolean;
}

export const DEFAULT_IMAGE_TRANSFORM: ImageTransform = {
  offsetXMm: 0,
  offsetYMm: 0,
  scaleX: 1,
  scaleY: 1,
  rotationDeg: 0,
  aspectLocked: true,
};

export interface Card {
  id: string;
  order: number;
  /** User-given card name. Falls back to the front image's label when unset. */
  name?: string;
  frontImageId: string | null;
  frontTransform: ImageTransform;
  /** null = use the project's shared back image. */
  backImageId: string | null;
  backTransform: ImageTransform;
  /** How many copies of this card to lay out. Defaults to 1. */
  count?: number;
  /** Locked cards ignore transform edits, so a finished card can't be nudged. */
  locked?: boolean;
}

export const MAX_CARD_COUNT = 999;

/** The number of copies to print for a card, defaulting to 1. */
export function cardCount(card: Card): number {
  return Math.max(1, Math.min(MAX_CARD_COUNT, Math.floor(card.count ?? 1)));
}

export interface Project {
  id: string;
  name: string;
  settings: ProjectSettings;
  sharedBackImageId: string | null;
  sharedBackTransform: ImageTransform;
  cards: Card[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Fills in settings and card fields that a project saved by an older version
 * doesn't have yet, so loading it never leaves `undefined` in a numeric field.
 */
export function normalizeProject(project: Project): Project {
  return {
    ...project,
    settings: { ...DEFAULT_PROJECT_SETTINGS, ...project.settings },
    cards: project.cards.map((card) => ({
      ...card,
      frontTransform: { ...DEFAULT_IMAGE_TRANSFORM, ...card.frontTransform },
      backTransform: { ...DEFAULT_IMAGE_TRANSFORM, ...card.backTransform },
    })),
    sharedBackTransform: { ...DEFAULT_IMAGE_TRANSFORM, ...project.sharedBackTransform },
  };
}

export function createEmptyProject(name = 'Untitled'): Project {
  const now = Date.now();
  return {
    id: newId(),
    name,
    settings: { ...DEFAULT_PROJECT_SETTINGS },
    sharedBackImageId: null,
    sharedBackTransform: { ...DEFAULT_IMAGE_TRANSFORM },
    cards: [],
    createdAt: now,
    updatedAt: now,
  };
}
