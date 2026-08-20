import { computeFitScale } from './imageFit';

const MM_PER_INCH = 25.4;

/** Below this many DPI a printed card visibly softens, so the UI warns about it. */
export const LOW_DPI_THRESHOLD = 300;

/** DPI of `pixels` source pixels stretched across `lengthMm` of paper. */
export function effectiveDpi(pixels: number, lengthMm: number): number {
  if (lengthMm <= 0 || pixels <= 0) return 0;
  return pixels / (lengthMm / MM_PER_INCH);
}

/**
 * The DPI an image actually prints at once it has been contain-fitted into a
 * cell and scaled by the user's transform. The lower of the two axes wins,
 * since that's the direction that will look softest on paper.
 */
export function printDpi(params: {
  widthPx: number;
  heightPx: number;
  cellWidthMm: number;
  cellHeightMm: number;
  scaleX?: number;
  scaleY?: number;
}): number {
  const { widthPx, heightPx, cellWidthMm, cellHeightMm } = params;
  if (widthPx <= 0 || heightPx <= 0) return 0;

  const base = computeFitScale(widthPx, heightPx, cellWidthMm, cellHeightMm, 'contain');
  const printedWidthMm = widthPx * base.mmPerPxX * (params.scaleX ?? 1);
  const printedHeightMm = heightPx * base.mmPerPxY * (params.scaleY ?? 1);

  return Math.min(effectiveDpi(widthPx, printedWidthMm), effectiveDpi(heightPx, printedHeightMm));
}

export function isLowDpi(dpi: number, threshold = LOW_DPI_THRESHOLD): boolean {
  return dpi > 0 && dpi < threshold;
}
