import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import './shortcuts.css';

/** Key combinations, grouped by what they act on. */
const GROUPS: Array<{ titleKey: string; items: Array<{ keys: string[]; labelKey: string }> }> = [
  {
    titleKey: 'project',
    items: [
      { keys: ['Ctrl', 'S'], labelKey: 'saveNow' },
      { keys: ['Ctrl', 'Shift', 'S'], labelKey: 'save' },
      { keys: ['Ctrl', 'O'], labelKey: 'open' },
      { keys: ['Ctrl', 'P'], labelKey: 'print' },
      { keys: ['Ctrl', 'M'], labelKey: 'manager' },
    ],
  },
  {
    titleKey: 'editing',
    items: [
      { keys: ['Ctrl', 'Z'], labelKey: 'undo' },
      { keys: ['Ctrl', 'Y'], labelKey: 'redo' },
      { keys: ['←', '↑', '→', '↓'], labelKey: 'nudge' },
      { keys: ['Shift', '+', '←'], labelKey: 'nudgeFine' },
    ],
  },
  {
    titleKey: 'view',
    items: [
      { keys: ['Wheel'], labelKey: 'zoom' },
      { keys: ['Drag'], labelKey: 'pan' },
      { keys: ['B'], labelKey: 'flipSide' },
      { keys: ['F'], labelKey: 'fullscreen' },
      { keys: ['?'], labelKey: 'help' },
      { keys: ['Esc'], labelKey: 'close' },
    ],
  },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="sc-overlay" onMouseDown={onClose}>
      <div className="sc-dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sc-head">
          <div className="sc-title">
            <Icon name="keyboard" size={18} />
            <span>{t('shortcuts.title')}</span>
          </div>
          <button type="button" className="sc-close" aria-label={t('manager.close')} onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="sc-groups">
          {GROUPS.map((group) => (
            <div key={group.titleKey} className="sc-group">
              <h4>{t(`shortcuts.groups.${group.titleKey}`)}</h4>
              {group.items.map((item) => (
                <div key={item.labelKey} className="sc-row">
                  <span className="sc-keys">
                    {item.keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                  <span className="sc-label">{t(`shortcuts.keys.${item.labelKey}`)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
