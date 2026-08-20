import { describe, expect, it } from 'vitest';
import { mapDuplexCellIndex, mirrorPointForDuplex } from './duplexMapping';

describe('mapDuplexCellIndex', () => {
  // 3 cols x 2 rows grid, indices laid out as:
  // 0 1 2
  // 3 4 5
  const cols = 3;
  const rows = 2;

  it('short-edge mirrors rows (top<->bottom), keeps columns', () => {
    expect(mapDuplexCellIndex(0, cols, rows, 'short-edge')).toBe(3); // top-left -> bottom-left
    expect(mapDuplexCellIndex(2, cols, rows, 'short-edge')).toBe(5); // top-right -> bottom-right
    expect(mapDuplexCellIndex(4, cols, rows, 'short-edge')).toBe(1); // bottom-mid -> top-mid
  });

  it('long-edge mirrors columns (left<->right), keeps rows', () => {
    expect(mapDuplexCellIndex(0, cols, rows, 'long-edge')).toBe(2); // top-left -> top-right
    expect(mapDuplexCellIndex(3, cols, rows, 'long-edge')).toBe(5); // bottom-left -> bottom-right
    expect(mapDuplexCellIndex(1, cols, rows, 'long-edge')).toBe(1); // middle column maps to itself
  });

  it('is its own inverse for every cell and every mode', () => {
    const modes: Array<'short-edge' | 'long-edge'> = ['short-edge', 'long-edge'];
    for (const mode of modes) {
      for (let i = 0; i < cols * rows; i++) {
        const mapped = mapDuplexCellIndex(i, cols, rows, mode);
        expect(mapDuplexCellIndex(mapped, cols, rows, mode)).toBe(i);
      }
    }
  });

  it('leaves a perfectly centered single cell unchanged under short-edge with odd rows', () => {
    // 1 col x 3 rows: middle cell (index 1) is its own mirror
    expect(mapDuplexCellIndex(1, 1, 3, 'short-edge')).toBe(1);
  });
});

describe('mirrorPointForDuplex', () => {
  const paperWidthMm = 210;
  const paperHeightMm = 297;

  it('short-edge mirrors the Y coordinate, keeps X', () => {
    expect(mirrorPointForDuplex(20, 30, paperWidthMm, paperHeightMm, 'short-edge')).toEqual({
      xMm: 20,
      yMm: 267,
    });
  });

  it('long-edge mirrors the X coordinate, keeps Y', () => {
    expect(mirrorPointForDuplex(20, 30, paperWidthMm, paperHeightMm, 'long-edge')).toEqual({
      xMm: 190,
      yMm: 30,
    });
  });

  it('is its own inverse', () => {
    for (const mode of ['short-edge', 'long-edge'] as const) {
      const mirrored = mirrorPointForDuplex(45, 60, paperWidthMm, paperHeightMm, mode);
      const back = mirrorPointForDuplex(mirrored.xMm, mirrored.yMm, paperWidthMm, paperHeightMm, mode);
      expect(back).toEqual({ xMm: 45, yMm: 60 });
    }
  });

  it('leaves the page center unchanged under either mode', () => {
    const center = { xMm: paperWidthMm / 2, yMm: paperHeightMm / 2 };
    expect(mirrorPointForDuplex(center.xMm, center.yMm, paperWidthMm, paperHeightMm, 'short-edge')).toEqual(center);
    expect(mirrorPointForDuplex(center.xMm, center.yMm, paperWidthMm, paperHeightMm, 'long-edge')).toEqual(center);
  });
});
