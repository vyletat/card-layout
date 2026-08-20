import { useRef, useState, type ReactNode, type DragEvent } from 'react';

function isFileDrag(e: DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes('Files');
}

/**
 * Wraps content in an area that accepts image files dragged from the OS file
 * system. Ignores internal (non-file) drags, so it won't interfere with the
 * app's own drag-and-drop (e.g. library thumbnails onto card slots).
 */
export function FileDropZone({
  onFiles,
  className,
  activeClassName = 'is-drop-active',
  children,
}: {
  onFiles: (files: File[]) => void;
  className?: string;
  activeClassName?: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  return (
    <div
      className={`${className ?? ''} ${active ? activeClassName : ''}`}
      onDragEnter={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        depth.current += 1;
        setActive(true);
      }}
      onDragOver={(e) => {
        if (isFileDrag(e)) e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (!isFileDrag(e)) return;
        depth.current -= 1;
        if (depth.current <= 0) {
          depth.current = 0;
          setActive(false);
        }
      }}
      onDrop={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        depth.current = 0;
        setActive(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) onFiles(files);
      }}
    >
      {children}
    </div>
  );
}
