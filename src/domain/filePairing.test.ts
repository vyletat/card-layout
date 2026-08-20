import { describe, expect, it } from 'vitest';
import { deriveDisplayName, detectFileSide, pairImageFiles } from './filePairing';

describe('detectFileSide', () => {
  it('detects back and front tokens, null when absent', () => {
    expect(detectFileSide('card01_back.png')).toBe('back');
    expect(detectFileSide('drak-lic.jpg')).toBe('front');
    expect(detectFileSide('dragon.png')).toBe(null);
  });
});

describe('deriveDisplayName', () => {
  it('strips extension, a trailing side token and separators, keeps casing', () => {
    expect(deriveDisplayName('Nilfgaard_back.png')).toBe('Nilfgaard');
    expect(deriveDisplayName('drak_front.png')).toBe('Drak');
    expect(deriveDisplayName('Dijkstra.png')).toBe('Dijkstra');
    expect(deriveDisplayName('ice_giant_back.png')).toBe('Ice giant');
  });
});

describe('pairImageFiles', () => {
  it('pairs front/back by filename convention with underscore separator', () => {
    const { pairs, unmatched } = pairImageFiles(['card01_front.png', 'card01_back.png']);
    expect(unmatched).toEqual([]);
    expect(pairs).toEqual([
      { groupKey: 'card01', frontFileName: 'card01_front.png', backFileName: 'card01_back.png' },
    ]);
  });

  it('recognizes Czech síde tokens (líc/rub) and dash separators', () => {
    const { pairs } = pairImageFiles(['drak-lic.jpg', 'drak-rub.jpg']);
    expect(pairs).toEqual([
      { groupKey: 'drak', frontFileName: 'drak-lic.jpg', backFileName: 'drak-rub.jpg' },
    ]);
  });

  it('treats a file with no side token as a standalone front-only card', () => {
    const { pairs, unmatched } = pairImageFiles(['dragon.png']);
    expect(unmatched).toEqual([]);
    expect(pairs).toEqual([{ groupKey: 'dragon', frontFileName: 'dragon.png', backFileName: null }]);
  });

  it('flags a lone back file with no matching front as unmatched', () => {
    const { pairs, unmatched } = pairImageFiles(['card01_back.png']);
    expect(pairs).toEqual([]);
    expect(unmatched).toEqual(['card01_back.png']);
  });

  it('flags duplicate sides within the same group as unmatched', () => {
    const { pairs, unmatched } = pairImageFiles(['card01_front.png', 'card01_front_v2.png' /* not a dup, different base */]);
    // sanity: these have different bases so no conflict
    expect(unmatched).toEqual([]);
    expect(pairs).toHaveLength(2);

    const dup = pairImageFiles(['card02_front.png', 'card02_front.jpg']);
    expect(dup.unmatched).toEqual(['card02_front.jpg']);
    expect(dup.pairs).toEqual([
      { groupKey: 'card02', frontFileName: 'card02_front.png', backFileName: null },
    ]);
  });

  it('preserves upload order for standalone and paired cards', () => {
    const { pairs } = pairImageFiles(['b_front.png', 'b_back.png', 'a.png']);
    expect(pairs.map((p) => p.groupKey)).toEqual(['b', 'a']);
  });
});
