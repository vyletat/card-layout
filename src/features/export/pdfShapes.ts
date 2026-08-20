/**
 * Pure geometry for the PDF exporter. Deliberately free of any pdf-lib import:
 * a static one here would pull the whole library into the initial bundle and
 * undo the lazy import in exportPdf.
 */

const BEZIER_KAPPA = 0.5522847498;

export type PathSegment =
  | { kind: 'move'; x: number; y: number }
  | { kind: 'line'; x: number; y: number }
  | { kind: 'curve'; x1: number; y1: number; x2: number; y2: number; x: number; y: number };

/**
 * The outline of a rounded rect as drawing segments the caller turns into PDF
 * operators. x,y is the BOTTOM-LEFT corner in PDF space (y-up), matching
 * page.drawRectangle conventions.
 */
export function roundedRectPathSegments(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): PathSegment[] {
  const r = Math.min(radius, width / 2, height / 2);
  const k = r * BEZIER_KAPPA;

  return [
    { kind: 'move', x: x + r, y },
    { kind: 'line', x: x + width - r, y },
    { kind: 'curve', x1: x + width - r + k, y1: y, x2: x + width, y2: y + r - k, x: x + width, y: y + r },
    { kind: 'line', x: x + width, y: y + height - r },
    {
      kind: 'curve',
      x1: x + width,
      y1: y + height - r + k,
      x2: x + width - r + k,
      y2: y + height,
      x: x + width - r,
      y: y + height,
    },
    { kind: 'line', x: x + r, y: y + height },
    { kind: 'curve', x1: x + r - k, y1: y + height, x2: x, y2: y + height - r + k, x, y: y + height - r },
    { kind: 'line', x, y: y + r },
    { kind: 'curve', x1: x, y1: y + r - k, x2: x + r - k, y2: y, x: x + r, y },
  ];
}

export interface CropMarkLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Classic corner crop marks around a trim rect (PDF space, bottom-left origin). */
export function cropMarkLines(
  trimX: number,
  trimY: number,
  trimWidth: number,
  trimHeight: number,
  markLength: number,
  gap: number,
): CropMarkLine[] {
  const left = trimX;
  const right = trimX + trimWidth;
  const bottom = trimY;
  const top = trimY + trimHeight;

  const corners: Array<{ x: number; y: number; dx: -1 | 1; dy: -1 | 1 }> = [
    { x: left, y: top, dx: -1, dy: 1 },
    { x: right, y: top, dx: 1, dy: 1 },
    { x: left, y: bottom, dx: -1, dy: -1 },
    { x: right, y: bottom, dx: 1, dy: -1 },
  ];

  const lines: CropMarkLine[] = [];
  for (const c of corners) {
    lines.push({ x1: c.x + c.dx * gap, y1: c.y, x2: c.x + c.dx * (gap + markLength), y2: c.y });
    lines.push({ x1: c.x, y1: c.y + c.dy * gap, x2: c.x, y2: c.y + c.dy * (gap + markLength) });
  }
  return lines;
}
