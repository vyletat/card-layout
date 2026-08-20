export type CardSide = 'front' | 'back';

const SIDE_TOKENS: Record<string, CardSide> = {
  front: 'front',
  f: 'front',
  lic: 'front',
  líc: 'front',
  predni: 'front',
  přední: 'front',
  back: 'back',
  b: 'back',
  rub: 'back',
  zadni: 'back',
  zadní: 'back',
};

const SIDE_SUFFIX_RE = /^(.*?)[\s_.-]+([a-zA-ZíÍ]+)$/;

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

function detectSide(fileName: string): { groupBase: string; side: CardSide | null } {
  const base = stripExtension(fileName);
  const match = base.match(SIDE_SUFFIX_RE);
  if (match) {
    const side = SIDE_TOKENS[match[2].toLowerCase()];
    if (side) return { groupBase: match[1].toLowerCase(), side };
  }
  return { groupBase: base.toLowerCase(), side: null };
}

/** The card side implied by a file name's suffix token, or null if none. */
export function detectFileSide(fileName: string): CardSide | null {
  return detectSide(fileName).side;
}

/**
 * Derives a clean, human-readable card name from a file name: strips the
 * extension and any trailing side token (front/back/líc/rub…), turns
 * separators into spaces, and capitalizes. Preserves the original casing of
 * the core name. E.g. "Nilfgaard-back_v2.png" -> "Nilfgaard v2".
 */
export function deriveDisplayName(fileName: string): string {
  const base = stripExtension(fileName);
  const match = base.match(SIDE_SUFFIX_RE);
  const core = match && SIDE_TOKENS[match[2].toLowerCase()] ? match[1] : base;
  const cleaned = core.replace(/[_.\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return base;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export interface PairedCard {
  groupKey: string;
  frontFileName: string;
  backFileName: string | null;
}

export interface FilePairingResult {
  pairs: PairedCard[];
  /** Files that could not be auto-resolved (e.g. a lone "back" file, or a duplicate side within a group). */
  unmatched: string[];
}

/**
 * Groups uploaded file names into front/back card pairs using filename
 * conventions (e.g. "card01_front.png" / "card01_back.png"). Files with no
 * recognized side token become standalone front-only cards (the common case
 * when the user relies on a single shared back instead of per-card backs).
 */
export function pairImageFiles(fileNames: string[]): FilePairingResult {
  interface Group {
    front?: string;
    back?: string;
    hasConflict: boolean;
  }
  const groups = new Map<string, Group>();
  const order: string[] = [];
  const standalone: string[] = [];
  const unmatched: string[] = [];

  for (const fileName of fileNames) {
    const { groupBase, side } = detectSide(fileName);

    if (side === null) {
      standalone.push(fileName);
      continue;
    }

    if (!groups.has(groupBase)) {
      groups.set(groupBase, { hasConflict: false });
      order.push(groupBase);
    }
    const group = groups.get(groupBase)!;
    if (group[side]) {
      group.hasConflict = true;
      unmatched.push(fileName);
    } else {
      group[side] = fileName;
    }
  }

  const pairs: PairedCard[] = [];
  for (const groupBase of order) {
    const group = groups.get(groupBase)!;
    if (group.front) {
      pairs.push({ groupKey: groupBase, frontFileName: group.front, backFileName: group.back ?? null });
    } else if (group.back) {
      // A back-only group with no matching front can't become a card on its own.
      unmatched.push(group.back);
    }
  }

  for (const fileName of standalone) {
    pairs.push({ groupKey: stripExtension(fileName).toLowerCase(), frontFileName: fileName, backFileName: null });
  }

  return { pairs, unmatched };
}
