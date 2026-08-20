export type DuplexMode = 'short-edge' | 'long-edge';

/**
 * Given a grid cell index on the FRONT sheet, returns the index of the cell
 * on the BACK sheet where the corresponding back-side content must be placed
 * so that, once the physically printed sheet is flipped over along the
 * chosen axis, the back design lands exactly on top of the front card.
 *
 * Physically flipping a sheet in place (not around a distant hinge) mirrors
 * it across an axis through the sheet's own center:
 *  - "short-edge" flip (axis parallel to the short edge, e.g. a notepad
 *    flipped top-to-bottom) mirrors rows (top<->bottom), columns unchanged.
 *  - "long-edge" flip (axis parallel to the long edge, e.g. a book page
 *    flipped left-to-right) mirrors columns (left<->right), rows unchanged.
 *
 * The mapping only decides which cell slot a back image goes into - it does
 * not mirror the image's own pixels, since card backs should read normally.
 *
 * The mapping is its own inverse (applying it twice returns the original
 * index), so the same function can be used to go front->back or back->front.
 */
export function mapDuplexCellIndex(
  index: number,
  cols: number,
  rows: number,
  mode: DuplexMode,
): number {
  const row = Math.floor(index / cols);
  const col = index % cols;

  const mappedRow = mode === 'short-edge' ? rows - 1 - row : row;
  const mappedCol = mode === 'long-edge' ? cols - 1 - col : col;

  return mappedRow * cols + mappedCol;
}

/**
 * Mirrors a raw page coordinate (mm, top-left origin) the same way physical
 * duplex flipping mirrors card cells in mapDuplexCellIndex - used to place
 * calibration marks on the back sheet at the point that should land exactly
 * on top of the corresponding front mark once the sheet is flipped.
 */
export function mirrorPointForDuplex(
  xMm: number,
  yMm: number,
  paperWidthMm: number,
  paperHeightMm: number,
  mode: DuplexMode,
): { xMm: number; yMm: number } {
  return {
    xMm: mode === 'long-edge' ? paperWidthMm - xMm : xMm,
    yMm: mode === 'short-edge' ? paperHeightMm - yMm : yMm,
  };
}
