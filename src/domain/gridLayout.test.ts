import { describe, expect, it } from 'vitest';
import { computeGridLayout } from './gridLayout';

describe('computeGridLayout', () => {
  it('fits a standard poker-size card (63x88mm) on A4 with no gutter/bleed', () => {
    const result = computeGridLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      cardWidthMm: 63,
      cardHeightMm: 88,
    });

    expect(result.cols).toBe(3); // floor(210/63) = 3
    expect(result.rows).toBe(3); // floor(297/88) = 3
    expect(result.cells).toHaveLength(9);
  });

  it('centers the grid on the page', () => {
    const result = computeGridLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      cardWidthMm: 63,
      cardHeightMm: 88,
    });

    expect(result.marginXMm).toBeCloseTo((210 - result.contentWidthMm) / 2);
    expect(result.marginYMm).toBeCloseTo((297 - result.contentHeightMm) / 2);
    // symmetric: first cell's left margin equals the leftover space on the right
    const rightover = 210 - (result.marginXMm + result.contentWidthMm);
    expect(rightover).toBeCloseTo(result.marginXMm);
  });

  it('accounts for gutter between cells', () => {
    const noGutter = computeGridLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      cardWidthMm: 63,
      cardHeightMm: 88,
    });
    const withGutter = computeGridLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      cardWidthMm: 63,
      cardHeightMm: 88,
      gutterMm: 5,
    });

    // Same card still fits 3x3 (63*3+5*2=199<=210, 88*3+5*2=274<=297)
    expect(withGutter.cols).toBe(3);
    expect(withGutter.rows).toBe(3);
    expect(withGutter.contentWidthMm).toBeGreaterThan(noGutter.contentWidthMm);
  });

  it('grows the cell footprint by bleed on every side', () => {
    const result = computeGridLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      cardWidthMm: 63,
      cardHeightMm: 88,
      bleedMm: 3,
    });

    expect(result.cellWidthMm).toBe(63 + 2 * 3);
    expect(result.cellHeightMm).toBe(88 + 2 * 3);
  });

  it('returns zero rows/cols when the card does not fit on the page at all', () => {
    const result = computeGridLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      cardWidthMm: 500,
      cardHeightMm: 500,
    });

    expect(result.cols).toBe(0);
    expect(result.rows).toBe(0);
    expect(result.cells).toHaveLength(0);
  });

  it('lays out cells in row-major order matching row/col fields', () => {
    const result = computeGridLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      cardWidthMm: 63,
      cardHeightMm: 88,
    });

    result.cells.forEach((cell, i) => {
      expect(cell.index).toBe(i);
      expect(cell.row).toBe(Math.floor(i / result.cols));
      expect(cell.col).toBe(i % result.cols);
    });
  });
});
