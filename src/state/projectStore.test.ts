import { beforeEach, describe, expect, it, vi } from 'vitest';

// The store persists through IndexedDB, which doesn't exist under Vitest's node
// environment. Every db call is stubbed so the tests cover the state logic only.
vi.mock('../storage/db', () => ({
  putImage: vi.fn().mockResolvedValue(undefined),
  getImageBlob: vi.fn().mockResolvedValue(undefined),
  getImageMeta: vi.fn().mockResolvedValue(undefined),
  getImagesForProject: vi.fn().mockResolvedValue([]),
  getOrphanImageMeta: vi.fn().mockResolvedValue([]),
  updateImageMeta: vi.fn().mockResolvedValue(undefined),
  deleteImage: vi.fn().mockResolvedValue(undefined),
  putProject: vi.fn().mockResolvedValue(undefined),
  getProject: vi.fn().mockResolvedValue(undefined),
  getAllProjects: vi.fn().mockResolvedValue([]),
  deleteProjectWithImages: vi.fn().mockResolvedValue(undefined),
  countImagesForProject: vi.fn().mockResolvedValue(0),
}));

import * as db from '../storage/db';
import { useProjectStore } from './projectStore';
import { createEmptyProject, type CardImageMeta } from './types';

function store() {
  return useProjectStore.getState();
}

function cardsInOrder() {
  return store().project.cards.slice().sort((a, b) => a.order - b.order);
}

function image(id: string, overrides: Partial<CardImageMeta> = {}): CardImageMeta {
  return { id, fileName: `${id}.png`, widthPx: 750, heightPx: 1050, createdAt: 0, ...overrides };
}

beforeEach(() => {
  useProjectStore.setState({
    project: createEmptyProject(),
    images: {},
    transformHistory: [],
    transformFuture: [],
    savedAt: Date.now(),
  });
});

describe('addCards', () => {
  it('appends cards with consecutive order and keeps the given names', () => {
    store().addCards([{ frontImageId: 'a', name: 'Alpha' }, { frontImageId: 'b', name: 'Beta' }]);

    expect(cardsInOrder().map((c) => [c.order, c.name])).toEqual([
      [0, 'Alpha'],
      [1, 'Beta'],
    ]);
  });

  it('leaves count unset for a single copy so the default applies', () => {
    store().addCards([{ frontImageId: 'a' }, { frontImageId: 'b', count: 4 }]);

    expect(cardsInOrder().map((c) => c.count)).toEqual([undefined, 4]);
  });
});

describe('duplicateCard', () => {
  it('inserts the copy directly after the source and renumbers the rest', () => {
    store().addCards([{ frontImageId: 'a', name: 'A' }, { frontImageId: 'b', name: 'B' }]);
    const [first] = cardsInOrder();

    const copyId = store().duplicateCard(first.id);

    expect(cardsInOrder().map((c) => [c.order, c.name])).toEqual([
      [0, 'A'],
      [1, 'A'],
      [2, 'B'],
    ]);
    expect(cardsInOrder()[1].id).toBe(copyId);
  });

  it('clones the transforms, so editing the copy leaves the original alone', () => {
    store().addCards([{ frontImageId: 'a' }]);
    const [source] = cardsInOrder();
    const copyId = store().duplicateCard(source.id)!;

    store().updateCardTransform(copyId, 'front', { offsetXMm: 5 });

    const [original, copy] = cardsInOrder();
    expect(copy.frontTransform.offsetXMm).toBe(5);
    expect(original.frontTransform.offsetXMm).toBe(0);
  });

  it('returns null for an unknown card', () => {
    expect(store().duplicateCard('nope')).toBeNull();
  });
});

describe('removeCard / removeAllCards', () => {
  it('closes the gap in order after a removal', () => {
    store().addCards([{ frontImageId: 'a' }, { frontImageId: 'b' }, { frontImageId: 'c' }]);
    const [, middle] = cardsInOrder();

    store().removeCard(middle.id);

    expect(cardsInOrder().map((c) => c.order)).toEqual([0, 1]);
  });

  it('clears every card and drops the undo history', () => {
    store().addCards([{ frontImageId: 'a' }]);
    store().updateCardTransform(cardsInOrder()[0].id, 'front', { offsetXMm: 1 });
    expect(store().transformHistory).toHaveLength(1);

    store().removeAllCards();

    expect(store().project.cards).toEqual([]);
    expect(store().transformHistory).toEqual([]);
  });
});

describe('updateCardTransform', () => {
  it('ignores edits to a locked card', () => {
    store().addCards([{ frontImageId: 'a' }]);
    const [card] = cardsInOrder();
    store().setCardLocked(card.id, true);

    store().updateCardTransform(card.id, 'front', { offsetXMm: 9 });

    expect(cardsInOrder()[0].frontTransform.offsetXMm).toBe(0);
  });

  it('applies again once the card is unlocked', () => {
    store().addCards([{ frontImageId: 'a' }]);
    const [card] = cardsInOrder();
    store().setCardLocked(card.id, true);
    store().setCardLocked(card.id, false);

    store().updateCardTransform(card.id, 'front', { offsetXMm: 9 });

    expect(cardsInOrder()[0].frontTransform.offsetXMm).toBe(9);
  });
});

describe('setCardCount', () => {
  it('clamps to at least one copy', () => {
    store().addCards([{ frontImageId: 'a' }]);
    const [card] = cardsInOrder();

    store().setCardCount(card.id, 0);
    expect(cardsInOrder()[0].count).toBe(1);

    store().setCardCount(card.id, 5000);
    expect(cardsInOrder()[0].count).toBe(999);
  });
});

describe('removeImages', () => {
  it('unlinks the deleted images from both card sides and the shared back', async () => {
    useProjectStore.setState({
      images: { front: image('front'), back: image('back'), shared: image('shared') },
    });
    store().addCards([{ frontImageId: 'front', backImageId: 'back' }]);
    store().setSharedBackImage('shared');

    await store().removeImages(['front', 'shared']);

    const [card] = cardsInOrder();
    expect(card.frontImageId).toBeNull();
    // The card's own back was not deleted, so it stays linked.
    expect(card.backImageId).toBe('back');
    expect(store().project.sharedBackImageId).toBeNull();
    expect(Object.keys(store().images).sort()).toEqual(['back']);
  });
});

describe('shared back transform', () => {
  it('is part of the same undo history as card transforms', () => {
    store().addCards([{ frontImageId: 'a' }]);
    const [card] = cardsInOrder();

    store().updateCardTransform(card.id, 'front', { offsetXMm: 3 });
    store().updateSharedBackTransform({ offsetYMm: 2 });

    expect(store().project.sharedBackTransform.offsetYMm).toBe(2);

    store().undoTransform();
    expect(store().project.sharedBackTransform.offsetYMm).toBe(0);
    expect(cardsInOrder()[0].frontTransform.offsetXMm).toBe(3);

    store().undoTransform();
    expect(cardsInOrder()[0].frontTransform.offsetXMm).toBe(0);

    store().redoTransform();
    expect(cardsInOrder()[0].frontTransform.offsetXMm).toBe(3);
  });

  it('does not touch any card transform', () => {
    store().addCards([{ frontImageId: 'a' }]);

    store().updateSharedBackTransform({ offsetXMm: 4 });

    expect(cardsInOrder()[0].backTransform.offsetXMm).toBe(0);
  });
});

describe('addImageFiles ownership', () => {
  it('stamps new images with the open project', async () => {
    // readImageDimensions needs a browser Image and object URLs; node has neither.
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 10;
      naturalHeight = 20;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage);
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });

    const [id] = await store().addImageFiles([new File(['x'], 'card.png', { type: 'image/png' })]);

    expect(store().images[id].projectId).toBe(store().project.id);
    expect(store().images[id].fileName).toBe('card.png');
    vi.unstubAllGlobals();
  });
});

describe('saveNow', () => {
  it('writes the current project and clears the unsaved marker', async () => {
    vi.mocked(db.putProject).mockClear();
    useProjectStore.setState({ savedAt: 0 });
    store().addCard('front-a');
    expect(store().project.updatedAt).toBeGreaterThan(store().savedAt);

    await store().saveNow();

    expect(vi.mocked(db.putProject).mock.calls.at(-1)?.[0].cards).toHaveLength(1);
    expect(store().savedAt).toBe(store().project.updatedAt);
  });
});
