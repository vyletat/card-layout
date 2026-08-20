export type IconName =
  | 'upload'
  | 'trash'
  | 'pencil'
  | 'x'
  | 'plus'
  | 'check'
  | 'grip'
  | 'swap'
  | 'photo'
  | 'photo-plus'
  | 'images'
  | 'sidebar'
  | 'sidebar-right'
  | 'settings'
  | 'printer'
  | 'sun'
  | 'moon'
  | 'save'
  | 'folder'
  | 'file-pdf'
  | 'target'
  | 'ruler'
  | 'globe'
  | 'copy'
  | 'lock'
  | 'unlock'
  | 'maximize'
  | 'minimize'
  | 'keyboard'
  | 'warning'
  | 'table'
  | 'layers'
  | 'clock'
  | 'zoom-in'
  | 'zoom-out'
  | 'eye'
  | 'square'
  | 'square-check'
  | 'download'
  | 'chevron-left'
  | 'chevron-right'
  | 'undo'
  | 'redo';

const PATHS: Record<IconName, string> = {
  upload: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2 M7 9l5-5 5 5 M12 4v12',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12 M9 7V4h6v3',
  pencil: 'M4 20h4l10-10a1.5 1.5 0 0 0-4-4L4 16v4 M13.5 6.5l4 4',
  x: 'M18 6 6 18 M6 6l12 12',
  plus: 'M12 5v14 M5 12h14',
  check: 'M5 12l5 5L20 7',
  grip: 'M9 5h.01 M9 12h.01 M9 19h.01 M15 5h.01 M15 12h.01 M15 19h.01',
  swap: 'M7 8h14l-4-4 M17 16H3l4 4',
  photo: 'M4 5h16v14H4z M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M4 17l5-5 4 4 3-3 4 4',
  'photo-plus': 'M15 8h.01 M4 5h11v6 M4 5v14h14v-4 M4 15l4-4 3 3 M18 15h4 M20 13v4',
  images: 'M7 4h13v13H7z M4 8v11a1 1 0 0 0 1 1h11 M11 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M7 14l3-3 3 3 3-3 4 4',
  sidebar: 'M4 5h16v14H4z M10 5v14',
  'sidebar-right': 'M4 5h16v14H4z M14 5v14',
  settings: 'M10.3 4.3a1 1 0 0 1 3.4 0l.2.9a1 1 0 0 0 1.4.8l.8-.4a1 1 0 0 1 1.4 1.4l-.4.8a1 1 0 0 0 .8 1.4l.9.2a1 1 0 0 1 0 3.4l-.9.2a1 1 0 0 0-.8 1.4l.4.8a1 1 0 0 1-1.4 1.4l-.8-.4a1 1 0 0 0-1.4.8l-.2.9a1 1 0 0 1-3.4 0l-.2-.9a1 1 0 0 0-1.4-.8l-.8.4a1 1 0 0 1-1.4-1.4l.4-.8a1 1 0 0 0-.8-1.4l-.9-.2a1 1 0 0 1 0-3.4l.9-.2a1 1 0 0 0 .8-1.4l-.4-.8a1 1 0 0 1 1.4-1.4l.8.4a1 1 0 0 0 1.4-.8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  printer: 'M6 9V3h12v6 M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2 M6 14h12v7H6z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10 M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5z',
  save: 'M5 4h11l3 3v13H5z M8 4v5h7 M8 15h8v5H8z',
  folder: 'M4 6a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z',
  'file-pdf': 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z M14 3v4h4 M9 13h1.5a1.5 1.5 0 0 1 0 3H9v-3z M9 16v2',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M12 12h.01',
  ruler: 'M4 16 16 4l4 4L8 20z M9 9l2 2 M12 6l2 2 M6 12l2 2',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18',
  copy: 'M9 9h11v11H9z M15 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h4',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  unlock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 7.6-1.4',
  maximize: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5',
  minimize: 'M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5',
  keyboard: 'M3 6h18v12H3z M7 10h.01 M11 10h.01 M15 10h.01 M17.5 10h.01 M7 14h10',
  warning: 'M12 4 2.5 20h19z M12 10v4 M12 17.4h.01',
  table: 'M4 5h16v14H4z M4 10h16 M10 10v9',
  layers: 'M12 3 3 8l9 5 9-5z M3 14l9 5 9-5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 7v5l3.5 2',
  'zoom-in': 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M20.5 20.5 16 16 M11 8v6 M8 11h6',
  'zoom-out': 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M20.5 20.5 16 16 M8 11h6',
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  square: 'M4.5 4.5h15v15h-15z',
  'square-check': 'M4.5 4.5h15v15h-15z M8.5 12l2.5 2.5 4.5-5',
  download: 'M12 4v11 M7.5 10.5 12 15l4.5-4.5 M4 20h16',
  'chevron-left': 'M15 5 8 12l7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  undo: 'M9 14 4 9l5-5 M4 9h9.5a5.5 5.5 0 0 1 0 11H8',
  redo: 'M15 14l5-5-5-5 M20 9h-9.5a5.5 5.5 0 0 0 0 11H16',
};

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
