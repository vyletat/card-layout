import { describe, expect, it } from 'vitest';
import { mirrorPointForDuplex, type DuplexMode } from './duplexMapping';
import { registrationMarkPositions } from './registrationMarks';

describe('registrationMarkPositions', () => {
  const width = 210;
  const height = 297;

  it('places one target inset from each corner', () => {
    const marks = registrationMarkPositions(width, height, 8);
    expect(marks).toEqual([
      { xMm: 8, yMm: 8 },
      { xMm: 202, yMm: 8 },
      { xMm: 8, yMm: 289 },
      { xMm: 202, yMm: 289 },
    ]);
  });

  it.each<DuplexMode>(['short-edge', 'long-edge'])(
    'maps onto itself when the sheet is flipped (%s), so both sides can share coordinates',
    (mode) => {
      const marks = registrationMarkPositions(width, height);
      const mirrored = marks
        .map((m) => mirrorPointForDuplex(m.xMm, m.yMm, width, height, mode))
        .map((m) => `${m.xMm},${m.yMm}`)
        .sort();
      const original = marks.map((m) => `${m.xMm},${m.yMm}`).sort();

      expect(mirrored).toEqual(original);
    },
  );
});
