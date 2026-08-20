import { describe, expect, it } from 'vitest';
import { PAPER_SIZES, getOrientedDimensions, makeCustomPaperSize } from './paperSizes';

describe('paper sizes', () => {
  it('includes A4, A3 and Letter', () => {
    const ids = PAPER_SIZES.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['a4', 'a3', 'letter']));
  });

  it('returns portrait dimensions unchanged for a portrait-native size', () => {
    const a4 = PAPER_SIZES.find((p) => p.id === 'a4')!;
    expect(getOrientedDimensions(a4, 'portrait')).toEqual({ widthMm: 210, heightMm: 297 });
  });

  it('swaps width/height for landscape', () => {
    const a4 = PAPER_SIZES.find((p) => p.id === 'a4')!;
    expect(getOrientedDimensions(a4, 'landscape')).toEqual({ widthMm: 297, heightMm: 210 });
  });

  it('builds a custom paper size', () => {
    const custom = makeCustomPaperSize(150, 100);
    expect(custom).toMatchObject({ widthMm: 150, heightMm: 100, custom: true });
  });
});
