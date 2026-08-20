import { useEffect, useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { computeFitScale } from '../../domain/imageFit';
import { useHtmlImage } from '../../hooks/useHtmlImage';
import { useImageUrl } from '../../hooks/useImageUrl';
import type { ImageTransform } from '../../state/types';

export function CardImageNode({
  nodeId,
  imageId,
  transform,
  cellWidthMm,
  cellHeightMm,
  pxPerMm,
  locked,
  onSelect,
  onChange,
  registerNode,
}: {
  nodeId: string;
  imageId: string;
  transform: ImageTransform;
  cellWidthMm: number;
  cellHeightMm: number;
  pxPerMm: number;
  /** Locked cards can still be selected, but not dragged or resized. */
  locked: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<ImageTransform>) => void;
  registerNode: (id: string, node: Konva.Image | null) => void;
}) {
  const url = useImageUrl(imageId);
  const htmlImage = useHtmlImage(url);
  const ref = useRef<Konva.Image>(null);

  useEffect(() => {
    registerNode(nodeId, ref.current);
    return () => registerNode(nodeId, null);
  }, [nodeId, registerNode, htmlImage]);

  if (!htmlImage) return null;

  const baseFit = computeFitScale(htmlImage.naturalWidth, htmlImage.naturalHeight, cellWidthMm, cellHeightMm, 'contain');
  const cellCenterXPx = (cellWidthMm / 2) * pxPerMm;
  const cellCenterYPx = (cellHeightMm / 2) * pxPerMm;

  return (
    <KonvaImage
      ref={ref}
      id={nodeId}
      image={htmlImage}
      x={cellCenterXPx + transform.offsetXMm * pxPerMm}
      y={cellCenterYPx + transform.offsetYMm * pxPerMm}
      offsetX={htmlImage.naturalWidth / 2}
      offsetY={htmlImage.naturalHeight / 2}
      scaleX={baseFit.mmPerPxX * transform.scaleX * pxPerMm}
      scaleY={baseFit.mmPerPxY * transform.scaleY * pxPerMm}
      rotation={transform.rotationDeg}
      draggable={!locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const node = e.target;
        onChange({
          offsetXMm: (node.x() - cellCenterXPx) / pxPerMm,
          offsetYMm: (node.y() - cellCenterYPx) / pxPerMm,
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        onChange({
          offsetXMm: (node.x() - cellCenterXPx) / pxPerMm,
          offsetYMm: (node.y() - cellCenterYPx) / pxPerMm,
          scaleX: node.scaleX() / pxPerMm / baseFit.mmPerPxX,
          scaleY: node.scaleY() / pxPerMm / baseFit.mmPerPxY,
          rotationDeg: node.rotation(),
        });
      }}
    />
  );
}
