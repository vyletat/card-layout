import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { useIsDirty, useProjectStore } from '../../state/projectStore';

/** How long the button stays in its "saved" state after a click. */
const CONFIRM_MS = 1600;

/**
 * The project writes itself to IndexedDB while you work, so this button only
 * flushes the pending write early. It exists because people reach for a save
 * button anyway, and watching the dot clear on demand is worth the click.
 */
export function SaveButton() {
  const { t } = useTranslation();
  const saveNow = useProjectStore((s) => s.saveNow);
  const isDirty = useIsDirty();
  const [confirmed, setConfirmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function save() {
    await saveNow();
    setConfirmed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setConfirmed(false), CONFIRM_MS);
  }

  // Ctrl/Cmd+S is what the muscle memory reaches for; export sits on Ctrl+Shift+S.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      void save();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const state = confirmed ? ' is-saved' : isDirty ? ' is-dirty' : '';

  return (
    <button
      type="button"
      className={`save-btn${state}`}
      title={t(confirmed ? 'projectFile.savedTitle' : 'projectFile.saveNowTitle')}
      onClick={() => void save()}
    >
      <Icon name={confirmed ? 'check' : 'save'} size={15} />
      {t(confirmed ? 'projectFile.saved' : 'projectFile.saveNow')}
    </button>
  );
}
