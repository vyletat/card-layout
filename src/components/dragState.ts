import { useSyncExternalStore } from 'react';

let dragging = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
  if (dragging === value) return;
  dragging = value;
  listeners.forEach((l) => l());
}

// Capture phase, so this settles before any component's own drag handlers run.
if (typeof window !== 'undefined') {
  window.addEventListener('dragstart', () => set(true), true);
  window.addEventListener('dragend', () => set(false), true);
  window.addEventListener('drop', () => set(false), true);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * True while any HTML5 drag is in progress, anywhere in the app. Tracked
 * globally because a drag's dragstart fires on the draggable source node, so
 * nested elements (e.g. a thumbnail inside a draggable tile) never see it.
 */
export function useIsDragging(): boolean {
  return useSyncExternalStore(subscribe, () => dragging, () => false);
}
