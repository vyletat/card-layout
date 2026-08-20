import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Transformer, Rect, Circle, Line } from 'react-konva';
import type Konva from 'konva';
import { useTranslation } from 'react-i18next';
import {
  registrationMarkPositions,
  REGISTRATION_RADIUS_MM,
} from '../../domain/registrationMarks';
import { useProjectStore } from '../../state/projectStore';
import { resolveSideTransform, usesSharedBack } from '../../state/selectors';
import { useSheetData } from '../../state/useSheetData';
import { useElementSize } from '../../hooks/useElementSize';
import { CardCell } from './CardCell';
import { GhostCardCell } from './GhostCardCell';
import { clampZoom, type Pan } from './canvasView';

export const PX_PER_MM = 3;

const ZOOM_WHEEL_STEP = 1.12;
/**
 * Gap kept between the paper and the edge of the canvas at 100 %. Without it
 * the fit-constrained axis touches the edge exactly and the paper — along with
 * its drop shadow — reads as cut off.
 */
const FIT_MARGIN_PX = 18;

export function GridCanvas({
  side,
  sheetIndex,
  selectedCardId,
  onSelectCard,
  zoom,
  onZoomChange,
  pan,
  onPanChange,
  showOverlay,
}: {
  side: 'front' | 'back';
  sheetIndex: number;
  selectedCardId: string | null;
  onSelectCard: (cardId: string | null) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  pan: Pan;
  onPanChange: (pan: Pan) => void;
  showOverlay: boolean;
}) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const updateCardTransform = useProjectStore((s) => s.updateCardTransform);
  const updateSharedBackTransform = useProjectStore((s) => s.updateSharedBackTransform);
  const undoTransform = useProjectStore((s) => s.undoTransform);
  const redoTransform = useProjectStore((s) => s.redoTransform);

  const nodesRef = useRef<Map<string, Konva.Image>>(new Map());
  const transformerRef = useRef<Konva.Transformer>(null);
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null);
  const [viewportRef, viewportSize] = useElementSize<HTMLDivElement>();

  const settings = project.settings;
  const { paper, bleedMm, grid, sheetPairs } = useSheetData(project);
  const sheet = sheetPairs[sheetIndex]?.[side];

  const paperWidthPx = paper.widthMm * PX_PER_MM;
  const paperHeightPx = paper.heightMm * PX_PER_MM;

  // Scale the paper down so it always fits inside the (non-scrolling) viewport.
  // Each axis constrains independently; an unmeasured axis (0) doesn't force a shrink.
  const scaleW =
    viewportSize.width > 0
      ? Math.max(viewportSize.width - 2 * FIT_MARGIN_PX, 1) / paperWidthPx
      : Infinity;
  const scaleH =
    viewportSize.height > 0
      ? Math.max(viewportSize.height - 2 * FIT_MARGIN_PX, 1) / paperHeightPx
      : Infinity;
  const fitScale = Math.min(scaleW, scaleH, 1);
  const scale = fitScale * zoom;

  const stageWidth = viewportSize.width > 0 ? viewportSize.width : paperWidthPx;
  const stageHeight = viewportSize.height > 0 ? viewportSize.height : paperHeightPx;

  // Position that centres the paper in the viewport at the current scale.
  const centerX = (stageWidth - paperWidthPx * scale) / 2;
  const centerY = (stageHeight - paperHeightPx * scale) / 2;

  const registerNode = useCallback((id: string, node: Konva.Image | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    // Nodes are keyed per cell, since copies of one card share a card id.
    const card = selectedCardId ? project.cards.find((c) => c.id === selectedCardId) : null;
    const node =
      card && !card.locked && selectedCellIndex !== null
        ? nodesRef.current.get(`cell-${selectedCellIndex}`)
        : null;
    if (node) {
      const cardTransform = card ? resolveSideTransform(project, card, side) : null;
      transformer.keepRatio(cardTransform?.aspectLocked ?? true);
      transformer.nodes([node]);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoTransform();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redoTransform();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoTransform, redoTransform]);

  /** Zooms around the pointer, so the paper point under the cursor stays put. */
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;

    const factor = e.evt.deltaY < 0 ? ZOOM_WHEEL_STEP : 1 / ZOOM_WHEEL_STEP;
    const nextZoom = clampZoom(zoom * factor);
    if (nextZoom === zoom) return;

    const nextScale = fitScale * nextZoom;
    const layerX = centerX + pan.x;
    const layerY = centerY + pan.y;
    const worldX = (pointer.x - layerX) / scale;
    const worldY = (pointer.y - layerY) / scale;

    const nextCenterX = (stageWidth - paperWidthPx * nextScale) / 2;
    const nextCenterY = (stageHeight - paperHeightPx * nextScale) / 2;

    onZoomChange(nextZoom);
    onPanChange({
      x: pointer.x - worldX * nextScale - nextCenterX,
      y: pointer.y - worldY * nextScale - nextCenterY,
    });
  }

  const safeMarginMm = settings.safeMarginEnabled ? settings.safeMarginMm : 0;
  const registrationMarks = settings.registrationMarksEnabled
    ? registrationMarkPositions(paper.widthMm, paper.heightMm)
    : [];
  // The back is what the calibration correction shifts, so preview it there.
  const overlayOffsetXMm = side === 'front' ? settings.calibrationOffsetXMm : -settings.calibrationOffsetXMm;
  const overlayOffsetYMm = side === 'front' ? settings.calibrationOffsetYMm : -settings.calibrationOffsetYMm;

  return (
    <div className="canvas-viewport" ref={viewportRef}>
      {!sheet ? (
        <p className="empty-state">{t('editor.emptySheet')}</p>
      ) : (
        <Stage
          width={stageWidth}
          height={stageHeight}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            // Clicking the paper or the empty area around it clears the selection.
            if (e.target === e.target.getStage() || e.target.name() === 'paper') {
              setSelectedCellIndex(null);
              onSelectCard(null);
            }
          }}
        >
          <Layer
            x={centerX + pan.x}
            y={centerY + pan.y}
            scaleX={scale}
            scaleY={scale}
            draggable
            onDragEnd={(e) => {
              // Only the layer itself panning should move the viewport.
              if (e.target !== e.currentTarget) return;
              onPanChange({ x: e.target.x() - centerX, y: e.target.y() - centerY });
            }}
          >
            <Rect
              name="paper"
              width={paperWidthPx}
              height={paperHeightPx}
              fill="#ffffff"
              shadowColor="rgba(16,24,40,0.35)"
              shadowBlur={18 / Math.max(scale, 0.001)}
              shadowOpacity={0.5}
            />

            {sheet.cells.map((cell) => {
              const card = cell.cardId ? project.cards.find((c) => c.id === cell.cardId) : null;
              const transform = card ? resolveSideTransform(project, card, side) : null;
              return (
                <CardCell
                  key={cell.index}
                  xMm={cell.xMm}
                  yMm={cell.yMm}
                  cellWidthMm={grid.cellWidthMm}
                  cellHeightMm={grid.cellHeightMm}
                  bleedMm={bleedMm}
                  safeMarginMm={safeMarginMm}
                  cornerRadiusMm={settings.cornerRadiusMm}
                  cropMarksEnabled={settings.cropMarksEnabled}
                  cardNumber={settings.cardNumbersEnabled ? cell.cardNumber : null}
                  pxPerMm={PX_PER_MM}
                  cardId={cell.cardId}
                  nodeId={`cell-${cell.index}`}
                  imageId={cell.imageId}
                  transform={transform}
                  locked={!!card?.locked}
                  onSelect={() => {
                    if (!cell.cardId) return;
                    setSelectedCellIndex(cell.index);
                    onSelectCard(cell.cardId);
                  }}
                  onChange={(patch) => {
                    if (!card) return;
                    // Reframing a shared back moves it for every card using it.
                    if (usesSharedBack(project, card, side)) updateSharedBackTransform(patch);
                    else updateCardTransform(card.id, side, patch);
                  }}
                  registerNode={registerNode}
                />
              );
            })}

            {registrationMarks.map((mark, i) => (
              <RegistrationTarget key={i} xMm={mark.xMm} yMm={mark.yMm} pxPerMm={PX_PER_MM} />
            ))}

            {showOverlay &&
              sheet.cells.map((cell) => {
                const card = cell.cardId ? project.cards.find((c) => c.id === cell.cardId) : null;
                if (!card) return null;
                // The other side of the very same card is what ends up behind
                // this cell once the sheet is printed duplex and flipped.
                const otherImageId =
                  side === 'front'
                    ? (card.backImageId ?? project.sharedBackImageId)
                    : card.frontImageId;
                if (!otherImageId) return null;
                const transform = resolveSideTransform(project, card, side === 'front' ? 'back' : 'front');
                return (
                  <GhostCardCell
                    key={`ghost-${cell.index}`}
                    xMm={cell.xMm + overlayOffsetXMm}
                    yMm={cell.yMm + overlayOffsetYMm}
                    cellWidthMm={grid.cellWidthMm}
                    cellHeightMm={grid.cellHeightMm}
                    cornerRadiusMm={settings.cornerRadiusMm}
                    pxPerMm={PX_PER_MM}
                    imageId={otherImageId}
                    transform={transform}
                  />
                );
              })}

            <Transformer ref={transformerRef} rotateEnabled boundBoxFunc={(_oldBox, newBox) => newBox} />
          </Layer>
        </Stage>
      )}
    </div>
  );
}

function RegistrationTarget({ xMm, yMm, pxPerMm }: { xMm: number; yMm: number; pxPerMm: number }) {
  const x = xMm * pxPerMm;
  const y = yMm * pxPerMm;
  const r = REGISTRATION_RADIUS_MM * pxPerMm;
  const arm = r * 1.6;

  return (
    <>
      <Circle x={x} y={y} radius={r} stroke="#000" strokeWidth={0.4} listening={false} />
      <Line points={[x - arm, y, x + arm, y]} stroke="#000" strokeWidth={0.4} listening={false} />
      <Line points={[x, y - arm, x, y + arm]} stroke="#000" strokeWidth={0.4} listening={false} />
    </>
  );
}
