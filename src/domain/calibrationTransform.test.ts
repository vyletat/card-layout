import { describe, expect, it } from 'vitest';
import {
  calibrationCssTransform,
  calibrationPdfMatrix,
  isIdentityCalibration,
  type CalibrationTransform,
} from './calibrationTransform';
import { mmToPt } from './units';

const identity: CalibrationTransform = {
  offsetXMm: 0,
  offsetYMm: 0,
  scaleXPct: 100,
  scaleYPct: 100,
  rotationDeg: 0,
};

describe('isIdentityCalibration', () => {
  it('is true only when nothing is corrected', () => {
    expect(isIdentityCalibration(identity)).toBe(true);
    expect(isIdentityCalibration({ ...identity, offsetXMm: 0.2 })).toBe(false);
    expect(isIdentityCalibration({ ...identity, scaleYPct: 100.4 })).toBe(false);
  });
});

describe('calibrationCssTransform', () => {
  it('returns none when there is nothing to correct', () => {
    expect(calibrationCssTransform(identity)).toBe('none');
  });

  it('composes translate, rotate and scale', () => {
    expect(
      calibrationCssTransform({
        offsetXMm: 1,
        offsetYMm: -2,
        scaleXPct: 101,
        scaleYPct: 99.5,
        rotationDeg: 0.3,
      }),
    ).toBe('translate(1mm, -2mm) rotate(0.3deg) scale(1.01, 0.995)');
  });
});

describe('calibrationPdfMatrix', () => {
  const pageW = mmToPt(210);
  const pageH = mmToPt(297);

  it('is the identity matrix when nothing is corrected', () => {
    const m = calibrationPdfMatrix(identity, pageW, pageH);
    expect(m[0]).toBeCloseTo(1, 9);
    expect(m[1]).toBeCloseTo(0, 9);
    expect(m[2]).toBeCloseTo(0, 9);
    expect(m[3]).toBeCloseTo(1, 9);
    expect(m[4]).toBeCloseTo(0, 9);
    expect(m[5]).toBeCloseTo(0, 9);
  });

  it('moves a point right and down for a positive x/y offset', () => {
    const m = calibrationPdfMatrix({ ...identity, offsetXMm: 2, offsetYMm: 3 }, pageW, pageH);
    // Apply the matrix to the page centre.
    const x = m[0] * (pageW / 2) + m[2] * (pageH / 2) + m[4];
    const y = m[1] * (pageW / 2) + m[3] * (pageH / 2) + m[5];
    expect(x - pageW / 2).toBeCloseTo(mmToPt(2), 6);
    // Down on paper is -y in PDF space.
    expect(y - pageH / 2).toBeCloseTo(-mmToPt(3), 6);
  });

  it('scales about the page centre, leaving the centre fixed', () => {
    const m = calibrationPdfMatrix({ ...identity, scaleXPct: 102, scaleYPct: 98 }, pageW, pageH);
    const x = m[0] * (pageW / 2) + m[2] * (pageH / 2) + m[4];
    const y = m[1] * (pageW / 2) + m[3] * (pageH / 2) + m[5];
    expect(x).toBeCloseTo(pageW / 2, 6);
    expect(y).toBeCloseTo(pageH / 2, 6);

    // A point one inch to the right of the centre moves out by 2%.
    const px = pageW / 2 + 72;
    const movedX = m[0] * px + m[2] * (pageH / 2) + m[4];
    expect(movedX - pageW / 2).toBeCloseTo(72 * 1.02, 6);
  });

  it('rotates clockwise on paper for a positive angle', () => {
    const m = calibrationPdfMatrix({ ...identity, rotationDeg: 90 }, pageW, pageH);
    // A point directly above the centre on paper (= +y in PDF) must end up to
    // its right after a clockwise quarter turn.
    const px = pageW / 2;
    const py = pageH / 2 + 72;
    const x = m[0] * px + m[2] * py + m[4];
    const y = m[1] * px + m[3] * py + m[5];
    expect(x - pageW / 2).toBeCloseTo(72, 6);
    expect(y - pageH / 2).toBeCloseTo(0, 6);
  });
});
