/**
 * CSV import for decks that are maintained in a spreadsheet: one row per card,
 * referring to already-uploaded images by file name (or by the name shown in
 * the library). Keeps the deck's order, names and copy counts in one place
 * instead of clicking them together in the manager.
 */

export interface CsvCardRow {
  name?: string;
  front?: string;
  back?: string;
  count?: number;
}

const HEADER_ALIASES: Record<string, keyof CsvCardRow> = {
  name: 'name',
  nazev: 'name',
  název: 'name',
  karta: 'name',
  titel: 'name',
  nombre: 'name',
  front: 'front',
  lic: 'front',
  líc: 'front',
  vorderseite: 'front',
  anverso: 'front',
  back: 'back',
  rub: 'back',
  ruckseite: 'back',
  rückseite: 'back',
  reverso: 'back',
  count: 'count',
  copies: 'count',
  pocet: 'count',
  počet: 'count',
  anzahl: 'count',
  cantidad: 'count',
};

/**
 * Splits CSV text into rows of raw fields. Handles quoted fields (including
 * embedded separators, newlines and doubled quotes) and auto-detects a comma
 * or semicolon separator, since spreadsheets in a Czech locale export `;`.
 */
export function parseCsv(text: string): string[][] {
  const separator = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // Strip a UTF-8 BOM so the first header cell still matches its alias.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === separator) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      // Treat CRLF as a single break.
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  row.push(field);
  rows.push(row);

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  if (tabs > semicolons && tabs > commas) return '\t';
  return semicolons > commas ? ';' : ',';
}

/**
 * Turns CSV text into card rows. A header line naming the columns (in any
 * supported language) is honoured; without one, columns are read positionally
 * as name, front, back, count.
 */
export function parseCardCsv(text: string): CsvCardRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((c) => normalizeHeader(c));
  const mapped = header.map((h) => HEADER_ALIASES[h]);
  const hasHeader = mapped.some((m) => m !== undefined);

  const columns: Array<keyof CsvCardRow | undefined> = hasHeader
    ? mapped
    : ['name', 'front', 'back', 'count'];
  const bodyRows = hasHeader ? rows.slice(1) : rows;

  return bodyRows.map((cells) => {
    const out: CsvCardRow = {};
    cells.forEach((raw, i) => {
      const key = columns[i];
      if (!key) return;
      const value = raw.trim();
      if (!value) return;
      if (key === 'count') {
        const n = parseInt(value, 10);
        if (!Number.isNaN(n)) out.count = n;
      } else {
        out[key] = value;
      }
    });
    return out;
  });
}

function normalizeHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/^"|"$/g, '');
}

export interface CsvImageRef {
  id: string;
  fileName: string;
  displayName?: string;
}

export interface ResolvedCsvCard {
  name?: string;
  frontImageId: string | null;
  backImageId: string | null;
  count: number;
}

export interface CsvResolution {
  cards: ResolvedCsvCard[];
  /** Image references from the CSV that matched nothing in the library. */
  missing: string[];
}

/**
 * Matches the image references in parsed CSV rows against the library. A
 * reference may be the exact file name, the name shown in the library, or the
 * file name without its extension; matching is case-insensitive.
 */
export function resolveCsvCards(rows: CsvCardRow[], images: CsvImageRef[]): CsvResolution {
  const index = new Map<string, string>();
  for (const image of images) {
    for (const key of [image.fileName, stripExtension(image.fileName), image.displayName]) {
      if (!key) continue;
      const normalized = key.trim().toLowerCase();
      if (normalized && !index.has(normalized)) index.set(normalized, image.id);
    }
  }

  const missing: string[] = [];
  function lookup(ref: string | undefined): string | null {
    if (!ref) return null;
    const id = index.get(ref.trim().toLowerCase());
    if (!id) {
      if (!missing.includes(ref)) missing.push(ref);
      return null;
    }
    return id;
  }

  const cards = rows.map((row) => ({
    name: row.name,
    frontImageId: lookup(row.front),
    backImageId: lookup(row.back),
    count: Math.max(1, Math.floor(row.count ?? 1)),
  }));

  return { cards, missing };
}

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

/** A ready-to-fill example file, offered as a download next to the import button. */
export const CSV_TEMPLATE = 'name,front,back,count\nNilfgaard,nilfgaard_front.png,,2\n';
