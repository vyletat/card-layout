import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useImageUrl } from '../hooks/useImageUrl';
import { useIsDragging } from './dragState';

const PREVIEW_MAX_W = 300;
const PREVIEW_MAX_H = 420;
const CURSOR_GAP = 16;
const VIEWPORT_MARGIN = 8;

/**
 * Shows a large floating preview of an image while the pointer hovers its
 * trigger. Rendered through a portal so it escapes the manager modal's
 * clipping, and hidden as soon as a drag starts so it never blocks
 * drag-and-drop feedback.
 */
export function useImageHoverPreview(imageId: string | null): {
  handlers: {
    onMouseEnter: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onDragStart: () => void;
    onMouseDown: () => void;
  };
  preview: ReactNode;
} {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const url = useImageUrl(imageId);
  const isDragging = useIsDragging();

  // Drop the stale hover point when a drag begins, so the preview doesn't pop
  // back up at the old position the moment the drop finishes.
  useEffect(() => {
    if (isDragging) setPoint(null);
  }, [isDragging]);

  const track = useCallback((e: React.MouseEvent) => {
    // A mousemove fires between mousedown and dragstart; ignore it while a
    // drag is running so the preview can't reappear on top of the drop target.
    if (e.buttons !== 0) return;
    setPoint({ x: e.clientX, y: e.clientY });
  }, []);
  const hide = useCallback(() => setPoint(null), []);

  const handlers = {
    onMouseEnter: track,
    onMouseMove: track,
    onMouseLeave: hide,
    onDragStart: hide,
    onMouseDown: hide,
  };

  let preview: ReactNode = null;
  if (point && url && imageId && !isDragging) {
    // Prefer the right/below of the cursor, flipping when it would overflow.
    const spaceRight = window.innerWidth - point.x;
    const left =
      spaceRight > PREVIEW_MAX_W + CURSOR_GAP + VIEWPORT_MARGIN
        ? point.x + CURSOR_GAP
        : Math.max(VIEWPORT_MARGIN, point.x - CURSOR_GAP - PREVIEW_MAX_W);
    const top = Math.min(
      Math.max(VIEWPORT_MARGIN, point.y - PREVIEW_MAX_H / 2),
      Math.max(VIEWPORT_MARGIN, window.innerHeight - PREVIEW_MAX_H - VIEWPORT_MARGIN),
    );

    preview = createPortal(
      <div className="hover-preview" style={{ left, top }}>
        <img src={url} alt="" />
      </div>,
      document.body,
    );
  }

  return { handlers, preview };
}
