/**
 * Which sides end up in the output. Splitting them is what makes manual
 * duplex on a single-sided printer practical: print every front, put the
 * stack back in, then print every back.
 */
export type PrintScope = 'both' | 'fronts' | 'backs';

export const PRINT_SCOPES: PrintScope[] = ['both', 'fronts', 'backs'];

export function scopeIncludes(scope: PrintScope, side: 'front' | 'back'): boolean {
  if (scope === 'both') return true;
  return scope === 'fronts' ? side === 'front' : side === 'back';
}
