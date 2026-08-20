import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { roundedRectPath } from './roundedRectPath';
import { CropMarks } from './CropMarks';
import { CardImageNode } from './CardImageNode';
import type { ImageTransform } from '../../state/types';

/** Height of the printed card number, in mm. */
const NUMBER_SIZE_MM = 2.6;
const NUMBER_INSET_MM = 1.2;

export function CardCell({
  xMm,
  yMm,
  cellWidthMm,
  cellHeightMm,
  bleedMm,
  safeMarginMm,
  cornerRadiusMm,
  cropMarksEnabled,
  cardNumber,
  pxPerMm,
  cardId,
  nodeId,
  imageId,
  transform,
  locked,
  onSelect,
  onChange,
  registerNode,
}: {
  xMm: number;
  yMm: number;
  cellWidthMm: number;
  cellHeightMm: number;
  bleedMm: number;
  /** Distance inside the trim edge that artwork should stay clear of. 0 hides the guide. */
  safeMarginMm: number;
  cornerRadiusMm: number;
  cropMarksEnabled: boolean;
  /** Deck number to draw in the corner, or null when numbering is off/empty. */
  cardNumber: number | null;
  pxPerMm: number;
  cardId: string | null;
  /** Unique per grid cell — copies of one card share a card id, so it can't key nodes. */
  nodeId: string;
  imageId: string | null;
  transform: ImageTransform | null;
  locked: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<ImageTransform>) => void;
  registerNode: (id: string, node: Konva.Image | null) => void;
}) {
  const cellWidthPx = cellWidthMm * pxPerMm;
  const cellHeightPx = cellHeightMm * pxPerMm;
  const bleedPx = bleedMm * pxPerMm;
  const safePx = (bleedMm + safeMarginMm) * pxPerMm;

  return (
    <Group x={xMm * pxPerMm} y={yMm * pxPerMm} onClick={onSelect} onTap={onSelect}>
      <Group clipFunc={(ctx) => roundedRectPath(ctx, cellWidthPx, cellHeightPx, cornerRadiusMm * pxPerMm)}>
        <Rect width={cellWidthPx} height={cellHeightPx} fill="#f2f2f2" stroke="#ccc" strokeWidth={1} />
        {cardId && imageId && transform && (
          <CardImageNode
            nodeId={nodeId}
            imageId={imageId}
            transform={transform}
            cellWidthMm={cellWidthMm}
            cellHeightMm={cellHeightMm}
            pxPerMm={pxPerMm}
            locked={locked}
            onSelect={onSelect}
            onChange={onChange}
            registerNode={registerNode}
          />
        )}
      </Group>

      {bleedMm > 0 && (
        <Rect
          x={bleedPx}
          y={bleedPx}
          width={cellWidthPx - 2 * bleedPx}
          height={cellHeightPx - 2 * bleedPx}
          stroke="#2563eb"
          dash={[4, 4]}
          strokeWidth={0.75}
          listening={false}
        />
      )}

      {safeMarginMm > 0 && (
        <Rect
          x={safePx}
          y={safePx}
          width={cellWidthPx - 2 * safePx}
          height={cellHeightPx - 2 * safePx}
          stroke="#16a34a"
          dash={[2, 3]}
          strokeWidth={0.75}
          listening={false}
        />
      )}

      {cardNumber !== null && (
        <Text
          x={bleedPx + NUMBER_INSET_MM * pxPerMm}
          y={bleedPx + NUMBER_INSET_MM * pxPerMm}
          text={String(cardNumber)}
          fontSize={NUMBER_SIZE_MM * pxPerMm}
          fill="rgba(0,0,0,0.55)"
          listening={false}
        />
      )}

      {locked && (
        <Rect
          width={cellWidthPx}
          height={cellHeightPx}
          stroke="#ea580c"
          dash={[6, 3]}
          strokeWidth={1}
          listening={false}
        />
      )}

      {cropMarksEnabled && (
        <CropMarks
          trimXPx={bleedPx}
          trimYPx={bleedPx}
          trimWidthPx={cellWidthPx - 2 * bleedPx}
          trimHeightPx={cellHeightPx - 2 * bleedPx}
          markLengthPx={3 * pxPerMm}
          gapPx={1 * pxPerMm}
        />
      )}
    </Group>
  );
}
