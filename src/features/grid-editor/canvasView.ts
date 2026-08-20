/** Editor viewport state: zoom is a multiplier on top of the fit-to-window scale. */
export interface Pan {
  x: number;
  y: number;
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 8;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}
