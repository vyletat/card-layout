import { describe, expect, it } from 'vitest';
import { effectiveDpi, isLowDpi, printDpi, LOW_DPI_THRESHOLD } from './resolution';

describe('effectiveDpi', () => {
  it('converts pixels across a length in mm to dots per inch', () => {
    // 300 px over exactly one inch is 300 DPI.
    expect(effectiveDpi(300, 25.4)).toBeCloseTo(300, 6);
  });

  it('returns 0 for degenerate input', () => {
    expect(effectiveDpi(0, 25.4)).toBe(0);
    expect(effectiveDpi(300, 0)).toBe(0);
  });
});

describe('printDpi', () => {
  it('uses the contain fit, so the constraining axis sets the DPI', () => {
    // A 750x1050 px image on a 63.5x88.9 mm card = 2.5x3.5 in = 300 DPI both ways.
    const dpi = printDpi({ widthPx: 750, heightPx: 1050, cellWidthMm: 63.5, cellHeightMm: 88.9 });
    expect(dpi).toBeCloseTo(300, 1);
  });

  it('drops as the user scales the image up', () => {
    const base = printDpi({ widthPx: 750, heightPx: 1050, cellWidthMm: 63.5, cellHeightMm: 88.9 });
    const zoomed = printDpi({
      widthPx: 750,
      heightPx: 1050,
      cellWidthMm: 63.5,
      cellHeightMm: 88.9,
      scaleX: 2,
      scaleY: 2,
    });
    expect(zoomed).toBeCloseTo(base / 2, 1);
  });

  it('reports the lower axis when the image is stretched unevenly', () => {
    const dpi = printDpi({
      widthPx: 750,
      heightPx: 1050,
      cellWidthMm: 63.5,
      cellHeightMm: 88.9,
      scaleX: 3,
      scaleY: 1,
    });
    expect(dpi).toBeCloseTo(100, 1);
  });

  it('returns 0 for an image with no pixels', () => {
    expect(printDpi({ widthPx: 0, heightPx: 0, cellWidthMm: 63, cellHeightMm: 88 })).toBe(0);
  });
});

describe('isLowDpi', () => {
  it('flags values under the threshold but not unknown (0) ones', () => {
    expect(isLowDpi(150)).toBe(true);
    expect(isLowDpi(LOW_DPI_THRESHOLD)).toBe(false);
    expect(isLowDpi(0)).toBe(false);
  });
});
