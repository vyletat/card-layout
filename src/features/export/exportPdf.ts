import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';
import { computeFitScale } from '../../domain/imageFit';
import { computeGridLayout } from '../../domain/gridLayout';
import { buildSheetPairs, type Sheet } from '../../domain/sheetLayout';
import { mmToPt } from '../../domain/units';
import {
  calibrationPdfMatrix,
  isIdentityCalibration,
  type CalibrationTransform,
} from '../../domain/calibrationTransform';
import {
  registrationMarkPositions,
  REGISTRATION_RADIUS_MM,
} from '../../domain/registrationMarks';
import { getImageBlob } from '../../storage/db';
import {
  resolveEffectiveCards,
  resolvePaperDimensions,
  resolveSideTransform,
} from '../../state/selectors';
import type { ImageTransform, Project } from '../../state/types';
import { cropMarkLines, roundedRectPathSegments } from './pdfShapes';
import { scopeIncludes, type PrintScope } from './printScope';

const CROP_MARK_LENGTH_MM = 3;
const CROP_MARK_GAP_MM = 1;
const CARD_NUMBER_SIZE_MM = 2.6;
const CARD_NUMBER_INSET_MM = 1.2;

export async function generateProjectPdf(
  project: Project,
  scope: PrintScope = 'both',
): Promise<Uint8Array> {
  // pdf-lib is a large dependency that only matters once the user exports, so
  // it is loaded on demand instead of riding along in the initial bundle. The
  // drawing helpers live inside this function because they need its operators.
  const {
    PDFDocument,
    StandardFonts,
    appendBezierCurve,
    clip,
    closePath,
    concatTransformationMatrix,
    endPath,
    lineTo,
    moveTo,
    popGraphicsState,
    pushGraphicsState,
    rgb,
  } = await import('pdf-lib');

  const settings = project.settings;
  const paper = resolvePaperDimensions(settings);
  const bleedMm = settings.bleedEnabled ? settings.bleedMm : 0;

  const grid = computeGridLayout({
    paperWidthMm: paper.widthMm,
    paperHeightMm: paper.heightMm,
    cardWidthMm: settings.cardWidthMm,
    cardHeightMm: settings.cardHeightMm,
    bleedMm,
    gutterMm: settings.gutterMm,
  });

  const effectiveCards = resolveEffectiveCards(project);
  const sheetPairs = buildSheetPairs(effectiveCards, grid, settings.duplexMode);

  const pdfDoc = await PDFDocument.create();
  const embeddedImages = new Map<string, PDFImage>();
  const numberFont: PDFFont | null = settings.cardNumbersEnabled
    ? await pdfDoc.embedFont(StandardFonts.Helvetica)
    : null;

  const calibration: CalibrationTransform = {
    offsetXMm: settings.calibrationOffsetXMm,
    offsetYMm: settings.calibrationOffsetYMm,
    scaleXPct: settings.calibrationScaleXPct,
    scaleYPct: settings.calibrationScaleYPct,
    rotationDeg: settings.calibrationRotationDeg,
  };

  const pageWidthPt = mmToPt(paper.widthMm);
  const pageHeightPt = mmToPt(paper.heightMm);

  async function getEmbedded(imageId: string): Promise<PDFImage | null> {
    const cached = embeddedImages.get(imageId);
    if (cached) return cached;
    const blob = await getImageBlob(imageId);
    if (!blob) return null;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const image = blob.type.includes('png')
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);
    embeddedImages.set(imageId, image);
    return image;
  }

  function drawCardNumber(page: PDFPage, font: PDFFont, trimXMm: number, trimYMm: number, cardNumber: number) {
    // Anchor the text baseline so the glyph box sits inside the corner.
    page.drawText(String(cardNumber), {
      x: mmToPt(trimXMm + CARD_NUMBER_INSET_MM),
      y: mmToPt(paper.heightMm - (trimYMm + CARD_NUMBER_INSET_MM + CARD_NUMBER_SIZE_MM)),
      size: mmToPt(CARD_NUMBER_SIZE_MM),
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  function drawRegistrationTarget(page: PDFPage, xMm: number, yMm: number) {
    const x = mmToPt(xMm);
    const y = mmToPt(paper.heightMm - yMm);
    const r = mmToPt(REGISTRATION_RADIUS_MM);
    const arm = r * 1.6;

    page.drawCircle({ x, y, size: r, borderWidth: 0.4, borderColor: rgb(0, 0, 0) });
    page.drawLine({ start: { x: x - arm, y }, end: { x: x + arm, y }, thickness: 0.4 });
    page.drawLine({ start: { x, y: y - arm }, end: { x, y: y + arm }, thickness: 0.4 });
  }

  function drawCellCropMarks(page: PDFPage, cellXMm: number, cellYMm: number) {
    const trimWidthMm = grid.cellWidthMm - 2 * bleedMm;
    const trimHeightMm = grid.cellHeightMm - 2 * bleedMm;

    // Convert the top-based trim rect to PDF's bottom-left origin.
    const lines = cropMarkLines(
      mmToPt(cellXMm + bleedMm),
      mmToPt(paper.heightMm - (cellYMm + bleedMm + trimHeightMm)),
      mmToPt(trimWidthMm),
      mmToPt(trimHeightMm),
      mmToPt(CROP_MARK_LENGTH_MM),
      mmToPt(CROP_MARK_GAP_MM),
    );
    for (const line of lines) {
      page.drawLine({
        start: { x: line.x1, y: line.y1 },
        end: { x: line.x2, y: line.y2 },
        thickness: 0.5,
      });
    }
  }

  function drawCellImage(
    page: PDFPage,
    image: PDFImage,
    cellXMm: number,
    cellYMm: number,
    transform: ImageTransform,
  ) {
    const { cellWidthMm, cellHeightMm } = grid;

    // Clip the cell to its rounded outline before drawing the artwork.
    const outline = roundedRectPathSegments(
      mmToPt(cellXMm),
      mmToPt(paper.heightMm - (cellYMm + cellHeightMm)),
      mmToPt(cellWidthMm),
      mmToPt(cellHeightMm),
      mmToPt(settings.cornerRadiusMm),
    );
    page.pushOperators(
      pushGraphicsState(),
      ...outline.map((seg) => {
        if (seg.kind === 'move') return moveTo(seg.x, seg.y);
        if (seg.kind === 'line') return lineTo(seg.x, seg.y);
        return appendBezierCurve(seg.x1, seg.y1, seg.x2, seg.y2, seg.x, seg.y);
      }),
      closePath(),
      clip(),
      endPath(),
    );

    const baseFit = computeFitScale(image.width, image.height, cellWidthMm, cellHeightMm, 'contain');
    const drawnWidthPt = mmToPt(image.width * baseFit.mmPerPxX * transform.scaleX);
    const drawnHeightPt = mmToPt(image.height * baseFit.mmPerPxY * transform.scaleY);

    const centerXPt = mmToPt(cellXMm + cellWidthMm / 2 + transform.offsetXMm);
    const centerYPt = mmToPt(paper.heightMm - (cellYMm + cellHeightMm / 2 + transform.offsetYMm));

    const thetaRad = (-transform.rotationDeg * Math.PI) / 180;
    const cos = Math.cos(thetaRad);
    const sin = Math.sin(thetaRad);
    page.pushOperators(concatTransformationMatrix(cos, sin, -sin, cos, centerXPt, centerYPt));

    page.drawImage(image, {
      x: -drawnWidthPt / 2,
      y: -drawnHeightPt / 2,
      width: drawnWidthPt,
      height: drawnHeightPt,
    });

    page.pushOperators(popGraphicsState());
  }

  async function drawSheet(sheet: Sheet, side: 'front' | 'back') {
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

    // The whole back page is corrected as one, marks included, so a calibrated
    // printer puts the two sides exactly on top of each other.
    const corrected = side === 'back' && !isIdentityCalibration(calibration);
    if (corrected) {
      page.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(...calibrationPdfMatrix(calibration, pageWidthPt, pageHeightPt)),
      );
    }

    for (const cell of sheet.cells) {
      if (settings.cropMarksEnabled) drawCellCropMarks(page, cell.xMm, cell.yMm);

      if (!cell.cardId || !cell.imageId) continue;
      const card = project.cards.find((c) => c.id === cell.cardId);
      if (!card) continue;

      const image = await getEmbedded(cell.imageId);
      if (!image) continue;

      drawCellImage(page, image, cell.xMm, cell.yMm, resolveSideTransform(project, card, side));

      if (numberFont && cell.cardNumber !== null) {
        drawCardNumber(page, numberFont, cell.xMm + bleedMm, cell.yMm + bleedMm, cell.cardNumber);
      }
    }

    if (settings.registrationMarksEnabled) {
      for (const mark of registrationMarkPositions(paper.widthMm, paper.heightMm)) {
        drawRegistrationTarget(page, mark.xMm, mark.yMm);
      }
    }

    if (corrected) page.pushOperators(popGraphicsState());
  }

  for (const pair of sheetPairs) {
    if (scopeIncludes(scope, 'front')) await drawSheet(pair.front, 'front');
    if (scopeIncludes(scope, 'back')) await drawSheet(pair.back, 'back');
  }

  return pdfDoc.save();
}
