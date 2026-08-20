import { describe, expect, it } from 'vitest';
import { computeFitScale } from './imageFit';

describe('computeFitScale', () => {
  it('contain: picks the smaller factor so the whole image is visible', () => {
    // image 1000x500 (2:1) into a 63x88mm cell (portrait, ~0.72:1)
    const { mmPerPxX, mmPerPxY } = computeFitScale(1000, 500, 63, 88, 'contain');
    expect(mmPerPxX).toBe(mmPerPxY);
    // width-limited: 63/1000 = 0.063 vs height-limited: 88/500 = 0.176 -> contain picks smaller
    expect(mmPerPxX).toBeCloseTo(0.063);
  });

  it('cover: picks the larger factor so the cell is fully covered', () => {
    const { mmPerPxX } = computeFitScale(1000, 500, 63, 88, 'cover');
    expect(mmPerPxX).toBeCloseTo(0.176);
  });

  it('stretch: independently fits width and height, ignoring aspect ratio', () => {
    const { mmPerPxX, mmPerPxY } = computeFitScale(1000, 500, 63, 88, 'stretch');
    expect(mmPerPxX).toBeCloseTo(63 / 1000);
    expect(mmPerPxY).toBeCloseTo(88 / 500);
  });
});
