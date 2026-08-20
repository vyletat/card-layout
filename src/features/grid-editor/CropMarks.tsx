import { Line } from 'react-konva';

/** Classic printer crop marks at the four corners of a trim rect, drawn outward into the margin. */
export function CropMarks({
  trimXPx,
  trimYPx,
  trimWidthPx,
  trimHeightPx,
  markLengthPx,
  gapPx,
}: {
  trimXPx: number;
  trimYPx: number;
  trimWidthPx: number;
  trimHeightPx: number;
  markLengthPx: number;
  gapPx: number;
}) {
  const left = trimXPx;
  const right = trimXPx + trimWidthPx;
  const top = trimYPx;
  const bottom = trimYPx + trimHeightPx;

  const corners: Array<{ x: number; y: number; dx: -1 | 1; dy: -1 | 1 }> = [
    { x: left, y: top, dx: -1, dy: -1 },
    { x: right, y: top, dx: 1, dy: -1 },
    { x: left, y: bottom, dx: -1, dy: 1 },
    { x: right, y: bottom, dx: 1, dy: 1 },
  ];

  return (
    <>
      {corners.map((c, i) => (
        <Line
          key={`${i}-h`}
          points={[c.x + c.dx * gapPx, c.y, c.x + c.dx * (gapPx + markLengthPx), c.y]}
          stroke="#000"
          strokeWidth={0.75}
          listening={false}
        />
      ))}
      {corners.map((c, i) => (
        <Line
          key={`${i}-v`}
          points={[c.x, c.y + c.dy * gapPx, c.x, c.y + c.dy * (gapPx + markLengthPx)]}
          stroke="#000"
          strokeWidth={0.75}
          listening={false}
        />
      ))}
    </>
  );
}
