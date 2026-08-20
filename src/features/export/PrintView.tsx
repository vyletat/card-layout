import { useProjectStore } from '../../state/projectStore';
import { resolveSideTransform } from '../../state/selectors';
import { useSheetData } from '../../state/useSheetData';
import { useImageUrl } from '../../hooks/useImageUrl';
import type { ImageTransform, Project } from '../../state/types';
import type { Sheet } from '../../domain/sheetLayout';
import { computeFitScale } from '../../domain/imageFit';
import { calibrationCssTransform } from '../../domain/calibrationTransform';
import {
  registrationMarkPositions,
  REGISTRATION_RADIUS_MM,
} from '../../domain/registrationMarks';
import { CalibrationSheet } from '../calibration/CalibrationSheet';
import { scopeIncludes, type PrintScope } from './printScope';
import './PrintView.css';

const CROP_MARK_LENGTH_MM = 3;
const CROP_MARK_GAP_MM = 1;

export type PrintMode = 'cards' | 'calibration';

/** Renders every sheet at true mm size, hidden on screen and shown only via @media print. */
export function PrintView({ mode, scope = 'both' }: { mode: PrintMode; scope?: PrintScope }) {
  const project = useProjectStore((s) => s.project);
  const { paper, bleedMm, grid, sheetPairs } = useSheetData(project);
  const settings = project.settings;

  if (mode === 'calibration') {
    return (
      <div className="print-view">
        <style>{`@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }`}</style>
        <CalibrationSheet paperWidthMm={paper.widthMm} paperHeightMm={paper.heightMm} duplexMode={settings.duplexMode} />
      </div>
    );
  }

  return (
    <div className="print-view">
      <style>{`@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }`}</style>
      {sheetPairs.flatMap((pair, i) => {
        const pages = [];
        if (scopeIncludes(scope, 'front')) {
          pages.push(<SheetPage key={`f${i}`} project={project} sheet={pair.front} side="front" />);
        }
        if (scopeIncludes(scope, 'back')) {
          pages.push(<SheetPage key={`b${i}`} project={project} sheet={pair.back} side="back" />);
        }
        return pages;
      })}
    </div>
  );

  function SheetPage({
    project,
    sheet,
    side,
  }: {
    project: Project;
    sheet: Sheet;
    side: 'front' | 'back';
  }) {
    // The whole back page — marks included — is corrected, so a calibrated
    // printer lines the two sides up exactly.
    const correction =
      side === 'back'
        ? calibrationCssTransform({
            offsetXMm: settings.calibrationOffsetXMm,
            offsetYMm: settings.calibrationOffsetYMm,
            scaleXPct: settings.calibrationScaleXPct,
            scaleYPct: settings.calibrationScaleYPct,
            rotationDeg: settings.calibrationRotationDeg,
          })
        : 'none';

    return (
      <div className="sheet-page" style={{ width: `${paper.widthMm}mm`, height: `${paper.heightMm}mm` }}>
        <div className="sheet-content" style={{ transform: correction }}>
          {sheet.cells.map((cell) => {
            const card = cell.cardId ? project.cards.find((c) => c.id === cell.cardId) : null;
            const transform = card ? resolveSideTransform(project, card, side) : null;
            return (
              <PrintCell
                key={cell.index}
                xMm={cell.xMm}
                yMm={cell.yMm}
                cellWidthMm={grid.cellWidthMm}
                cellHeightMm={grid.cellHeightMm}
                bleedMm={bleedMm}
                cornerRadiusMm={settings.cornerRadiusMm}
                cropMarksEnabled={settings.cropMarksEnabled}
                cardNumber={settings.cardNumbersEnabled ? cell.cardNumber : null}
                imageId={cell.imageId}
                transform={transform}
              />
            );
          })}
          {settings.registrationMarksEnabled &&
            registrationMarkPositions(paper.widthMm, paper.heightMm).map((mark, i) => (
              <RegistrationTarget key={i} xMm={mark.xMm} yMm={mark.yMm} />
            ))}
        </div>
      </div>
    );
  }
}

function PrintCell({
  xMm,
  yMm,
  cellWidthMm,
  cellHeightMm,
  bleedMm,
  cornerRadiusMm,
  cropMarksEnabled,
  cardNumber,
  imageId,
  transform,
}: {
  xMm: number;
  yMm: number;
  cellWidthMm: number;
  cellHeightMm: number;
  bleedMm: number;
  cornerRadiusMm: number;
  cropMarksEnabled: boolean;
  cardNumber: number | null;
  imageId: string | null;
  transform: ImageTransform | null;
}) {
  const trimXMm = xMm + bleedMm;
  const trimYMm = yMm + bleedMm;
  const trimWidthMm = cellWidthMm - 2 * bleedMm;
  const trimHeightMm = cellHeightMm - 2 * bleedMm;

  return (
    <>
      <div
        className="print-cell"
        style={{
          left: `${xMm}mm`,
          top: `${yMm}mm`,
          width: `${cellWidthMm}mm`,
          height: `${cellHeightMm}mm`,
          borderRadius: `${cornerRadiusMm}mm`,
        }}
      >
        {imageId && transform && (
          <PrintImage imageId={imageId} transform={transform} cellWidthMm={cellWidthMm} cellHeightMm={cellHeightMm} />
        )}
      </div>
      {cardNumber !== null && (
        <div className="print-card-number" style={{ left: `${trimXMm + 1.2}mm`, top: `${trimYMm + 1.2}mm` }}>
          {cardNumber}
        </div>
      )}
      {cropMarksEnabled && (
        <PrintCropMarks trimXMm={trimXMm} trimYMm={trimYMm} trimWidthMm={trimWidthMm} trimHeightMm={trimHeightMm} />
      )}
    </>
  );
}

function PrintImage({
  imageId,
  transform,
  cellWidthMm,
  cellHeightMm,
}: {
  imageId: string;
  transform: ImageTransform;
  cellWidthMm: number;
  cellHeightMm: number;
}) {
  const url = useImageUrl(imageId);
  const meta = useProjectStore((s) => s.images[imageId]);
  if (!url || !meta) return null;

  const baseFit = computeFitScale(meta.widthPx, meta.heightPx, cellWidthMm, cellHeightMm, 'contain');
  const widthMm = meta.widthPx * baseFit.mmPerPxX * transform.scaleX;
  const heightMm = meta.heightPx * baseFit.mmPerPxY * transform.scaleY;
  const leftMm = cellWidthMm / 2 + transform.offsetXMm;
  const topMm = cellHeightMm / 2 + transform.offsetYMm;

  return (
    <img
      src={url}
      alt=""
      className="print-image"
      style={{
        left: `${leftMm}mm`,
        top: `${topMm}mm`,
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        transform: `translate(-50%, -50%) rotate(${transform.rotationDeg}deg)`,
      }}
    />
  );
}

function RegistrationTarget({ xMm, yMm }: { xMm: number; yMm: number }) {
  const d = REGISTRATION_RADIUS_MM * 2;
  const arm = REGISTRATION_RADIUS_MM * 3.2;

  return (
    <>
      <div
        className="reg-ring"
        style={{
          left: `${xMm - REGISTRATION_RADIUS_MM}mm`,
          top: `${yMm - REGISTRATION_RADIUS_MM}mm`,
          width: `${d}mm`,
          height: `${d}mm`,
        }}
      />
      <div
        className="crop-mark crop-mark-h"
        style={{ left: `${xMm - arm / 2}mm`, top: `${yMm}mm`, width: `${arm}mm` }}
      />
      <div
        className="crop-mark crop-mark-v"
        style={{ left: `${xMm}mm`, top: `${yMm - arm / 2}mm`, height: `${arm}mm` }}
      />
    </>
  );
}

function PrintCropMarks({
  trimXMm,
  trimYMm,
  trimWidthMm,
  trimHeightMm,
}: {
  trimXMm: number;
  trimYMm: number;
  trimWidthMm: number;
  trimHeightMm: number;
}) {
  const left = trimXMm;
  const right = trimXMm + trimWidthMm;
  const top = trimYMm;
  const bottom = trimYMm + trimHeightMm;

  const corners: Array<{ x: number; y: number; dx: -1 | 1; dy: -1 | 1 }> = [
    { x: left, y: top, dx: -1, dy: -1 },
    { x: right, y: top, dx: 1, dy: -1 },
    { x: left, y: bottom, dx: -1, dy: 1 },
    { x: right, y: bottom, dx: 1, dy: 1 },
  ];

  return (
    <>
      {corners.map((c, i) => (
        <div
          key={`${i}-h`}
          className="crop-mark crop-mark-h"
          style={{
            left: `${c.dx === -1 ? c.x - CROP_MARK_GAP_MM - CROP_MARK_LENGTH_MM : c.x + CROP_MARK_GAP_MM}mm`,
            top: `${c.y}mm`,
            width: `${CROP_MARK_LENGTH_MM}mm`,
          }}
        />
      ))}
      {corners.map((c, i) => (
        <div
          key={`${i}-v`}
          className="crop-mark crop-mark-v"
          style={{
            left: `${c.x}mm`,
            top: `${c.dy === -1 ? c.y - CROP_MARK_GAP_MM - CROP_MARK_LENGTH_MM : c.y + CROP_MARK_GAP_MM}mm`,
            height: `${CROP_MARK_LENGTH_MM}mm`,
          }}
        />
      ))}
    </>
  );
}
