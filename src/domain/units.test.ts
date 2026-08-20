import { describe, expect, it } from 'vitest';
import { fromMm, mmToPt, mmToPx, ptToMm, pxToMm, toMm } from './units';

describe('unit conversions', () => {
  it('converts cm and inch to mm', () => {
    expect(toMm(1, 'cm')).toBeCloseTo(10);
    expect(toMm(1, 'in')).toBeCloseTo(25.4);
    expect(toMm(10, 'mm')).toBe(10);
  });

  it('converts mm back to cm and inch', () => {
    expect(fromMm(10, 'cm')).toBeCloseTo(1);
    expect(fromMm(25.4, 'in')).toBeCloseTo(1);
  });

  it('roundtrips mm -> pt -> mm', () => {
    expect(ptToMm(mmToPt(210))).toBeCloseTo(210);
  });

  it('roundtrips mm -> px -> mm at a given dpi', () => {
    expect(pxToMm(mmToPx(210, 300), 300)).toBeCloseTo(210);
  });

  it('mmToPt matches the 1pt = 1/72in definition', () => {
    // 25.4mm (1 inch) must equal exactly 72pt
    expect(mmToPt(25.4)).toBeCloseTo(72);
  });
});
