import { describe, expect, it } from 'vitest';
import { parseCardCsv, parseCsv, resolveCsvCards } from './csvImport';

describe('parseCsv', () => {
  it('splits comma-separated rows', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('auto-detects a semicolon separator', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps separators, newlines and doubled quotes inside quoted fields', () => {
    expect(parseCsv('"a,b","line1\nline2","say ""hi"""')).toEqual([
      ['a,b', 'line1\nline2', 'say "hi"'],
    ]);
  });

  it('treats CRLF as one row break and drops blank rows', () => {
    expect(parseCsv('a,b\r\n\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseCardCsv', () => {
  it('reads named columns in any supported language', () => {
    const rows = parseCardCsv('název;líc;rub;počet\nNilfgaard;n_front.png;n_back.png;3');
    expect(rows).toEqual([
      { name: 'Nilfgaard', front: 'n_front.png', back: 'n_back.png', count: 3 },
    ]);
  });

  it('falls back to positional columns when there is no header', () => {
    const rows = parseCardCsv('Nilfgaard,n_front.png,,2');
    expect(rows).toEqual([{ name: 'Nilfgaard', front: 'n_front.png', count: 2 }]);
  });

  it('ignores unknown columns and empty cells', () => {
    const rows = parseCardCsv('name,front,notes\nA,a.png,whatever');
    expect(rows).toEqual([{ name: 'A', front: 'a.png' }]);
  });

  it('returns an empty list for empty input', () => {
    expect(parseCardCsv('')).toEqual([]);
  });
});

describe('resolveCsvCards', () => {
  const images = [
    { id: 'i1', fileName: 'nilfgaard_front.png', displayName: 'Nilfgaard' },
    { id: 'i2', fileName: 'shared_back.png' },
  ];

  it('matches by file name, name without extension, and library name', () => {
    const { cards, missing } = resolveCsvCards(
      [
        { front: 'nilfgaard_front.png', back: 'shared_back.png' },
        { front: 'NILFGAARD_FRONT' },
        { front: 'Nilfgaard' },
      ],
      images,
    );
    expect(cards.map((c) => c.frontImageId)).toEqual(['i1', 'i1', 'i1']);
    expect(cards[0].backImageId).toBe('i2');
    expect(missing).toEqual([]);
  });

  it('reports unmatched references once each and leaves the slot empty', () => {
    const { cards, missing } = resolveCsvCards(
      [{ front: 'ghost.png' }, { front: 'ghost.png' }],
      images,
    );
    expect(cards[0].frontImageId).toBeNull();
    expect(missing).toEqual(['ghost.png']);
  });

  it('defaults the copy count to 1 and never goes below it', () => {
    const { cards } = resolveCsvCards([{ front: 'nilfgaard_front.png' }, { count: 0 }], images);
    expect(cards.map((c) => c.count)).toEqual([1, 1]);
  });
});
