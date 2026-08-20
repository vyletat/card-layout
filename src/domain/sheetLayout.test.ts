import { describe, expect, it } from 'vitest';
import { buildSheetPairs, type CardEntry } from './sheetLayout';
import { computeGridLayout } from './gridLayout';

function makeCards(n: number): CardEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `card-${i}`,
    frontImageId: `front-${i}`,
    backImageId: `back-${i}`,
  }));
}

describe('buildSheetPairs', () => {
  // 3 cols x 2 rows grid (6 cells) via a card that fits exactly that on a fake page
  const grid = computeGridLayout({
    paperWidthMm: 189, // 3 * 63
    paperHeightMm: 176, // 2 * 88
    cardWidthMm: 63,
    cardHeightMm: 88,
  });

  it('computes the expected capacity grid', () => {
    expect(grid.cols).toBe(3);
    expect(grid.rows).toBe(2);
  });

  it('places cards front-facing in row-major order matching the front image ids', () => {
    const cards = makeCards(6);
    const [pair] = buildSheetPairs(cards, grid, 'short-edge');

    expect(pair.front.cells.map((c) => c.imageId)).toEqual([
      'front-0', 'front-1', 'front-2',
      'front-3', 'front-4', 'front-5',
    ]);
  });

  it('remaps back cells under short-edge duplex so flipping aligns front/back', () => {
    const cards = makeCards(6);
    const [pair] = buildSheetPairs(cards, grid, 'short-edge');

    // short-edge mirrors rows: back cell 0 (top-left) must show the back of
    // the card sitting at front cell 3 (bottom-left), etc.
    expect(pair.back.cells.map((c) => c.imageId)).toEqual([
      'back-3', 'back-4', 'back-5',
      'back-0', 'back-1', 'back-2',
    ]);
  });

  it('remaps back cells under long-edge duplex (mirrors columns)', () => {
    const cards = makeCards(6);
    const [pair] = buildSheetPairs(cards, grid, 'long-edge');

    expect(pair.back.cells.map((c) => c.imageId)).toEqual([
      'back-2', 'back-1', 'back-0',
      'back-5', 'back-4', 'back-3',
    ]);
  });

  it('splits a deck larger than one sheet into multiple sheet pairs', () => {
    const cards = makeCards(8); // 6 fit on sheet 1, 2 spill onto sheet 2
    const pairs = buildSheetPairs(cards, grid, 'short-edge');

    expect(pairs).toHaveLength(2);
    expect(pairs[1].front.cells.map((c) => c.imageId)).toEqual([
      'front-6', 'front-7', null, null, null, null,
    ]);
  });

  it('leaves unfilled cells blank (null) rather than repeating cards', () => {
    const cards = makeCards(1);
    const [pair] = buildSheetPairs(cards, grid, 'short-edge');

    const nonNullCount = pair.front.cells.filter((c) => c.imageId !== null).length;
    expect(nonNullCount).toBe(1);
  });

  it('returns no sheets for an empty deck', () => {
    expect(buildSheetPairs([], grid, 'short-edge')).toEqual([]);
  });
});
