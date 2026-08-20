import { PAPER_SIZES, getOrientedDimensions, makeCustomPaperSize } from '../domain/paperSizes';
import type { CardEntry } from '../domain/sheetLayout';
import { cardCount, type Card, type ImageTransform, type Project, type ProjectSettings } from './types';

export function resolvePaperDimensions(settings: ProjectSettings): { widthMm: number; heightMm: number } {
  const paper =
    settings.paperSizeId === 'custom'
      ? makeCustomPaperSize(settings.customPaperWidthMm, settings.customPaperHeightMm)
      : (PAPER_SIZES.find((p) => p.id === settings.paperSizeId) ?? PAPER_SIZES[0]);

  return getOrientedDimensions(paper, settings.orientation);
}

/**
 * Resolves each card's back image (falling back to the project's shared back)
 * and expands it into as many consecutive entries as its copy count, so every
 * copy occupies its own grid cell. Copies keep the source card's id, so they
 * share its transforms and stay in sync when edited.
 */
export function resolveEffectiveCards(project: Project): CardEntry[] {
  return project.cards
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((card, index) => {
      const entry: CardEntry = {
        id: card.id,
        frontImageId: card.frontImageId ?? '',
        backImageId: card.backImageId ?? project.sharedBackImageId ?? '',
        // Copies share the source card's deck number, so all copies of card 7
        // are labelled 7 rather than getting numbers of their own.
        number: index + 1,
      };
      return Array.from({ length: cardCount(card) }, () => entry);
    });
}

export type ImageRole =
  | { kind: 'unused' }
  | { kind: 'shared-back' }
  | { kind: 'front'; cardIndex: number }
  | { kind: 'back'; cardIndex: number };

/**
 * Maps each image id to how it's currently used in the project. An image may
 * be used in several places; the first match wins in this priority order:
 * shared back, then the lowest-index card front, then card back.
 */
export function computeImageRoles(project: Project): Map<string, ImageRole> {
  const roles = new Map<string, ImageRole>();
  const sorted = project.cards.slice().sort((a, b) => a.order - b.order);

  if (project.sharedBackImageId) {
    roles.set(project.sharedBackImageId, { kind: 'shared-back' });
  }
  sorted.forEach((card, index) => {
    if (card.frontImageId && !roles.has(card.frontImageId)) {
      roles.set(card.frontImageId, { kind: 'front', cardIndex: index });
    }
    if (card.backImageId && !roles.has(card.backImageId)) {
      roles.set(card.backImageId, { kind: 'back', cardIndex: index });
    }
  });

  return roles;
}

/**
 * The transform that frames one side of a card. A card that falls back to the
 * project's shared back is framed by the shared back's own transform, so the
 * common back is positioned once for the whole deck rather than per card.
 */
export function resolveSideTransform(
  project: Project,
  card: Card,
  side: 'front' | 'back',
): ImageTransform {
  if (side === 'front') return card.frontTransform;
  return card.backImageId ? card.backTransform : project.sharedBackTransform;
}

/** True when editing this side would move the shared back for every card using it. */
export function usesSharedBack(project: Project, card: Card, side: 'front' | 'back'): boolean {
  return side === 'back' && !card.backImageId && project.sharedBackImageId !== null;
}
