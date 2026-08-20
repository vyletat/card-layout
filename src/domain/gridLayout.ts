export interface GridLayoutParams {
  paperWidthMm: number;
  paperHeightMm: number;
  /** Trim size of the card, without bleed. */
  cardWidthMm: number;
  cardHeightMm: number;
  /** Extra size added on every side of the card when bleed is enabled. 0 to disable. */
  bleedMm?: number;
  /** Spacing between adjacent card cells. */
  gutterMm?: number;
}

export interface GridCell {
  index: number;
  row: number;
  col: number;
  /** Top-left corner of the cell footprint (including bleed) on the page, in mm. */
  xMm: number;
  yMm: number;
}

export interface GridLayoutResult {
  cols: number;
  rows: number;
  /** Cell footprint size, i.e. card size plus bleed on each side. */
  cellWidthMm: number;
  cellHeightMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
  marginXMm: number;
  marginYMm: number;
  cells: GridCell[];
}

export function computeGridLayout(params: GridLayoutParams): GridLayoutResult {
  const { paperWidthMm, paperHeightMm, cardWidthMm, cardHeightMm } = params;
  const bleedMm = params.bleedMm ?? 0;
  const gutterMm = params.gutterMm ?? 0;

  const cellWidthMm = cardWidthMm + 2 * bleedMm;
  const cellHeightMm = cardHeightMm + 2 * bleedMm;

  // Solving n * cellSize + (n-1) * gutter <= paperSize  =>  n <= (paperSize + gutter) / (cellSize + gutter)
  const cols = Math.max(0, Math.floor((paperWidthMm + gutterMm) / (cellWidthMm + gutterMm)));
  const rows = Math.max(0, Math.floor((paperHeightMm + gutterMm) / (cellHeightMm + gutterMm)));

  const contentWidthMm = cols > 0 ? cols * cellWidthMm + (cols - 1) * gutterMm : 0;
  const contentHeightMm = rows > 0 ? rows * cellHeightMm + (rows - 1) * gutterMm : 0;

  const marginXMm = (paperWidthMm - contentWidthMm) / 2;
  const marginYMm = (paperHeightMm - contentHeightMm) / 2;

  const cells: GridCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        index: row * cols + col,
        row,
        col,
        xMm: marginXMm + col * (cellWidthMm + gutterMm),
        yMm: marginYMm + row * (cellHeightMm + gutterMm),
      });
    }
  }

  return { cols, rows, cellWidthMm, cellHeightMm, contentWidthMm, contentHeightMm, marginXMm, marginYMm, cells };
}
