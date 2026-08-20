export type FitMode = 'contain' | 'cover' | 'stretch';

export interface FitScale {
  mmPerPxX: number;
  mmPerPxY: number;
}

/**
 * Computes the mm-per-source-pixel factor(s) needed to fit an image of the
 * given pixel dimensions into a cell of the given mm dimensions, at scale=1
 * (i.e. before the user's own zoom multiplier is applied).
 */
export function computeFitScale(
  imgWidthPx: number,
  imgHeightPx: number,
  cellWidthMm: number,
  cellHeightMm: number,
  mode: FitMode,
): FitScale {
  if (mode === 'stretch') {
    return { mmPerPxX: cellWidthMm / imgWidthPx, mmPerPxY: cellHeightMm / imgHeightPx };
  }

  const widthFactor = cellWidthMm / imgWidthPx;
  const heightFactor = cellHeightMm / imgHeightPx;
  const factor = mode === 'contain' ? Math.min(widthFactor, heightFactor) : Math.max(widthFactor, heightFactor);

  return { mmPerPxX: factor, mmPerPxY: factor };
}
