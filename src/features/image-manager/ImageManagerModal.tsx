import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { isTypingTarget } from '../../components/dialogState';
import { ImageLibrary } from './ImageLibrary';
import { CardPairing } from './CardPairing';
import './imageManager.css';

const FULLSCREEN_KEY = 'card-layout-manager-fullscreen';

function readFullscreen(): boolean {
  try {
    return localStorage.getItem(FULLSCREEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function ImageManagerModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [fullscreen, setFullscreen] = useState(readFullscreen);

  useEffect(() => {
    try {
      localStorage.setItem(FULLSCREEN_KEY, fullscreen ? '1' : '0');
    } catch {
      // Private-mode storage failures shouldn't break the dialog.
    }
  }, [fullscreen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      // F11 is the browser's own fullscreen, so the dialog uses plain F.
      if ((e.key === 'f' || e.key === 'F') && !isTypingTarget(e.target)) {
        e.preventDefault();
        setFullscreen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`im-overlay ${fullscreen ? 'is-fullscreen' : ''}`} onMouseDown={onClose}>
      <div
        className={`im-modal ${fullscreen ? 'is-fullscreen' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="im-modal-head">
          <div className="im-modal-title">
            <Icon name="images" size={18} />
            <span>{t('manager.title')}</span>
          </div>
          <div className="im-modal-head-actions">
            <button
              type="button"
              className="im-close"
              aria-label={fullscreen ? t('manager.exitFullscreen') : t('manager.fullscreen')}
              title={`${fullscreen ? t('manager.exitFullscreen') : t('manager.fullscreen')} (F)`}
              aria-pressed={fullscreen}
              onClick={() => setFullscreen((v) => !v)}
            >
              <Icon name={fullscreen ? 'minimize' : 'maximize'} size={18} />
            </button>
            <button type="button" className="im-close" aria-label={t('manager.close')} onClick={onClose}>
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        <div className="im-modal-body">
          <ImageLibrary />
          <CardPairing />
        </div>

        <div className="im-modal-foot">
          <Icon name="images" size={15} />
          {t('manager.footerHint')}
        </div>
      </div>
    </div>
  );
}

