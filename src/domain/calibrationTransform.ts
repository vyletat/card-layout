import { mmToPt } from './units';

/**
 * Correction applied to the back side of every sheet so it lands on the front
 * once printed duplex. Offsets fix a plain shift, the scale percentages fix a
 * printer that stretches one side slightly, and the rotation fixes skew.
 */
export interface CalibrationTransform {
  offsetXMm: number;
  offsetYMm: number;
  /** 100 = no correction. */
  scaleXPct: number;
  scaleYPct: number;
  rotationDeg: number;
}

export function isIdentityCalibration(c: CalibrationTransform): boolean {
  return (
    c.offsetXMm === 0 &&
    c.offsetYMm === 0 &&
    c.scaleXPct === 100 &&
    c.scaleYPct === 100 &&
    c.rotationDeg === 0
  );
}

/**
 * The same correction as a CSS transform for the print view. Applied about the
 * page centre, so `transform-origin: 50% 50%` must be set on the element.
 */
export function calibrationCssTransform(c: CalibrationTransform): string {
  if (isIdentityCalibration(c)) return 'none';
  return [
    `translate(${c.offsetXMm}mm, ${c.offsetYMm}mm)`,
    `rotate(${c.rotationDeg}deg)`,
    `scale(${c.scaleXPct / 100}, ${c.scaleYPct / 100})`,
  ].join(' ');
}

/**
 * The same correction as a PDF transformation matrix [a b c d e f], about the
 * centre of a page of the given size in points.
 *
 * PDF's y axis points up while the app measures downwards, so the vertical
 * offset and the rotation direction are both negated to keep the printed
 * result identical to the CSS version.
 */
export function calibrationPdfMatrix(
  c: CalibrationTransform,
  pageWidthPt: number,
  pageHeightPt: number,
): [number, number, number, number, number, number] {
  const sx = c.scaleXPct / 100;
  const sy = c.scaleYPct / 100;
  const theta = (-c.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const a = sx * cos;
  const b = sx * sin;
  const cc = -sy * sin;
  const d = sy * cos;

  const cx = pageWidthPt / 2;
  const cy = pageHeightPt / 2;
  const tx = mmToPt(c.offsetXMm);
  const ty = -mmToPt(c.offsetYMm);

  return [a, b, cc, d, cx + tx - (a * cx + cc * cy), cy + ty - (b * cx + d * cy)];
}
