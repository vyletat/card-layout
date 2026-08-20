import { describe, expect, it } from 'vitest';
import { resolveEffectiveCards, resolveSideTransform, usesSharedBack } from './selectors';
import { createEmptyProject, DEFAULT_IMAGE_TRANSFORM, type Card, type Project } from './types';

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    order: 0,
    frontImageId: 'front',
    frontTransform: { ...DEFAULT_IMAGE_TRANSFORM },
    backImageId: null,
    backTransform: { ...DEFAULT_IMAGE_TRANSFORM },
    ...overrides,
  };
}

function project(overrides: Partial<Project> = {}): Project {
  return { ...createEmptyProject(), ...overrides };
}

describe('resolveEffectiveCards', () => {
  it('numbers cards by deck position and repeats a card once per copy', () => {
    const p = project({
      cards: [
        card({ id: 'a', order: 0 }),
        card({ id: 'b', order: 1, count: 3 }),
        card({ id: 'c', order: 2 }),
      ],
    });

    expect(resolveEffectiveCards(p).map((e) => [e.id, e.number])).toEqual([
      ['a', 1],
      ['b', 2],
      ['b', 2],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('falls back to the shared back for cards without one of their own', () => {
    const p = project({
      sharedBackImageId: 'shared',
      cards: [card({ id: 'a', order: 0 }), card({ id: 'b', order: 1, backImageId: 'own' })],
    });

    expect(resolveEffectiveCards(p).map((e) => e.backImageId)).toEqual(['shared', 'own']);
  });

  it('lays cards out in order, not in array position', () => {
    const p = project({ cards: [card({ id: 'second', order: 1 }), card({ id: 'first', order: 0 })] });

    expect(resolveEffectiveCards(p).map((e) => e.id)).toEqual(['first', 'second']);
  });
});

describe('resolveSideTransform', () => {
  it('uses the card transform for the front', () => {
    const c = card({ frontTransform: { ...DEFAULT_IMAGE_TRANSFORM, offsetXMm: 2 } });

    expect(resolveSideTransform(project(), c, 'front').offsetXMm).toBe(2);
  });

  it('uses the shared back transform when the card has no back of its own', () => {
    const p = project({
      sharedBackImageId: 'shared',
      sharedBackTransform: { ...DEFAULT_IMAGE_TRANSFORM, offsetYMm: 4 },
    });

    expect(resolveSideTransform(p, card(), 'back').offsetYMm).toBe(4);
  });

  it('uses the card transform once the card has its own back', () => {
    const p = project({
      sharedBackImageId: 'shared',
      sharedBackTransform: { ...DEFAULT_IMAGE_TRANSFORM, offsetYMm: 4 },
    });
    const c = card({ backImageId: 'own', backTransform: { ...DEFAULT_IMAGE_TRANSFORM, offsetYMm: 1 } });

    expect(resolveSideTransform(p, c, 'back').offsetYMm).toBe(1);
  });
});

describe('usesSharedBack', () => {
  it('is true only for the back of a card that falls back to an existing shared back', () => {
    const withShared = project({ sharedBackImageId: 'shared' });

    expect(usesSharedBack(withShared, card(), 'back')).toBe(true);
    expect(usesSharedBack(withShared, card(), 'front')).toBe(false);
    expect(usesSharedBack(withShared, card({ backImageId: 'own' }), 'back')).toBe(false);
    expect(usesSharedBack(project(), card(), 'back')).toBe(false);
  });
});
