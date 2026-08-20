import type { DuplexMode } from './duplexMapping';
import { mapDuplexCellIndex } from './duplexMapping';
import type { GridLayoutResult } from './gridLayout';

export interface CardEntry {
  id: string;
  frontImageId: string;
  /** Falls back to the deck's shared back image when the card has no override. */
  backImageId: string;
  /** 1-based position in the deck, printed when card numbering is on. */
  number?: number;
}

export interface SheetCell {
  index: number;
  row: number;
  col: number;
  xMm: number;
  yMm: number;
  cardId: string | null;
  imageId: string | null;
  /** The deck number of the card in this cell, or null when the cell is empty. */
  cardNumber: number | null;
}

export interface Sheet {
  sheetIndex: number;
  side: 'front' | 'back';
  cells: SheetCell[];
}

export interface SheetPair {
  sheetIndex: number;
  front: Sheet;
  back: Sheet;
}

/**
 * Paginates a deck of cards across as many sheets as needed to fit the given
 * grid capacity, pairing each front sheet with a back sheet whose cells are
 * remapped via mapDuplexCellIndex so the two align once physically printed
 * duplex and flipped. Cells beyond the deck's length are left blank.
 */
export function buildSheetPairs(
  cards: CardEntry[],
  grid: GridLayoutResult,
  duplexMode: DuplexMode,
): SheetPair[] {
  const capacity = grid.cols * grid.rows;
  if (capacity === 0 || cards.length === 0) return [];

  const sheetCount = Math.ceil(cards.length / capacity);
  const pairs: SheetPair[] = [];

  for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex++) {
    const frontCells: SheetCell[] = grid.cells.map((cell) => {
      const card = cards[sheetIndex * capacity + cell.index] ?? null;
      return {
        ...cell,
        cardId: card?.id ?? null,
        imageId: card?.frontImageId ?? null,
        cardNumber: card?.number ?? null,
      };
    });

    const backCells: SheetCell[] = grid.cells.map((cell) => {
      const sourceIndex = mapDuplexCellIndex(cell.index, grid.cols, grid.rows, duplexMode);
      const card = cards[sheetIndex * capacity + sourceIndex] ?? null;
      return {
        ...cell,
        cardId: card?.id ?? null,
        imageId: card?.backImageId ?? null,
        cardNumber: card?.number ?? null,
      };
    });

    pairs.push({
      sheetIndex,
      front: { sheetIndex, side: 'front', cells: frontCells },
      back: { sheetIndex, side: 'back', cells: backCells },
    });
  }

  return pairs;
}
