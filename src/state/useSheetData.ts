import { useMemo } from 'react';
import { computeGridLayout, type GridLayoutResult } from '../domain/gridLayout';
import { buildSheetPairs, type SheetPair } from '../domain/sheetLayout';
import { resolveEffectiveCards, resolvePaperDimensions } from './selectors';
import type { Project } from './types';

export interface SheetData {
  paper: { widthMm: number; heightMm: number };
  bleedMm: number;
  grid: GridLayoutResult;
  sheetPairs: SheetPair[];
}

export function useSheetData(project: Project): SheetData {
  const settings = project.settings;
  const paper = resolvePaperDimensions(settings);
  const bleedMm = settings.bleedEnabled ? settings.bleedMm : 0;

  const grid = useMemo(
    () =>
      computeGridLayout({
        paperWidthMm: paper.widthMm,
        paperHeightMm: paper.heightMm,
        cardWidthMm: settings.cardWidthMm,
        cardHeightMm: settings.cardHeightMm,
        bleedMm,
        gutterMm: settings.gutterMm,
      }),
    [paper.widthMm, paper.heightMm, settings.cardWidthMm, settings.cardHeightMm, bleedMm, settings.gutterMm],
  );

  const sheetPairs = useMemo(() => {
    const effectiveCards = resolveEffectiveCards(project);
    return buildSheetPairs(effectiveCards, grid, settings.duplexMode);
  }, [project, grid, settings.duplexMode]);

  return { paper, bleedMm, grid, sheetPairs };
}
