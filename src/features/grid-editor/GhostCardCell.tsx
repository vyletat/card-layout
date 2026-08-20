import { Group, Image as KonvaImage } from 'react-konva';
import { computeFitScale } from '../../domain/imageFit';
import { useHtmlImage } from '../../hooks/useHtmlImage';
import { useImageUrl } from '../../hooks/useImageUrl';
import type { ImageTransform } from '../../state/types';
import { roundedRectPath } from './roundedRectPath';

/**
 * A non-interactive copy of the opposite side's artwork, drawn on top of the
 * current sheet so the two can be compared. Shifted by the calibration
 * correction, it shows where the back will actually land once printed duplex.
 */
export function GhostCardCell({
  xMm,
  yMm,
  cellWidthMm,
  cellHeightMm,
  cornerRadiusMm,
  pxPerMm,
  imageId,
  transform,
}: {
  xMm: number;
  yMm: number;
  cellWidthMm: number;
  cellHeightMm: number;
  cornerRadiusMm: number;
  pxPerMm: number;
  imageId: string;
  transform: ImageTransform;
}) {
  const url = useImageUrl(imageId);
  const htmlImage = useHtmlImage(url);

  if (!htmlImage) return null;

  const cellWidthPx = cellWidthMm * pxPerMm;
  const cellHeightPx = cellHeightMm * pxPerMm;
  const baseFit = computeFitScale(
    htmlImage.naturalWidth,
    htmlImage.naturalHeight,
    cellWidthMm,
    cellHeightMm,
    'contain',
  );

  return (
    <Group x={xMm * pxPerMm} y={yMm * pxPerMm} listening={false} opacity={0.42}>
      <Group clipFunc={(ctx) => roundedRectPath(ctx, cellWidthPx, cellHeightPx, cornerRadiusMm * pxPerMm)}>
        <KonvaImage
          image={htmlImage}
          x={cellWidthPx / 2 + transform.offsetXMm * pxPerMm}
          y={cellHeightPx / 2 + transform.offsetYMm * pxPerMm}
          offsetX={htmlImage.naturalWidth / 2}
          offsetY={htmlImage.naturalHeight / 2}
          scaleX={baseFit.mmPerPxX * transform.scaleX * pxPerMm}
          scaleY={baseFit.mmPerPxY * transform.scaleY * pxPerMm}
          rotation={transform.rotationDeg}
        />
      </Group>
    </Group>
  );
}
