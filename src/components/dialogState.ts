const OVERLAY_SELECTOR = '.im-overlay, .sc-overlay, .pj-overlay, .confirm-overlay';

/**
 * True while a modal overlay is on screen. Global single-key shortcuts check
 * this so typing in a dialog doesn't also drive the editor behind it.
 */
export function isDialogOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector(OVERLAY_SELECTOR) !== null;
}

/** True when the event target is a text field, where single-key shortcuts must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}
