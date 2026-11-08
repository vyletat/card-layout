import { describe, expect, it, afterEach, vi } from 'vitest';
import { newId } from './ids';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a v4 uuid', () => {
    expect(newId()).toMatch(V4);
  });

  // The reason this helper exists: over plain http the method is undefined.
  it('still returns a v4 uuid without crypto.randomUUID', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });

    const ids = new Set(Array.from({ length: 100 }, newId));

    for (const id of ids) expect(id).toMatch(V4);
    expect(ids.size).toBe(100);
  });
});
