export type Orientation = 'portrait' | 'landscape';

export interface PaperSize {
  id: string;
  label: string;
  /** Dimensions as manufactured, portrait orientation, in mm. */
  widthMm: number;
  heightMm: number;
  custom?: boolean;
}

export const PAPER_SIZES: PaperSize[] = [
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'a3', label: 'A3', widthMm: 297, heightMm: 420 },
  { id: 'letter', label: 'Letter', widthMm: 215.9, heightMm: 279.4 },
];

export const DEFAULT_PAPER_SIZE_ID = 'a4';

export function makeCustomPaperSize(widthMm: number, heightMm: number): PaperSize {
  return { id: 'custom', label: 'Custom', widthMm, heightMm, custom: true };
}

/** Applies orientation to a paper's portrait-native dimensions. */
export function getOrientedDimensions(
  paper: PaperSize,
  orientation: Orientation,
): { widthMm: number; heightMm: number } {
  const portraitWidth = Math.min(paper.widthMm, paper.heightMm);
  const portraitHeight = Math.max(paper.widthMm, paper.heightMm);

  return orientation === 'portrait'
    ? { widthMm: portraitWidth, heightMm: portraitHeight }
    : { widthMm: portraitHeight, heightMm: portraitWidth };
}
