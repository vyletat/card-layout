import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from './Icon';
import './confirmDialog.css';

/**
 * Blocking yes/no confirmation, portaled to <body> so it stacks above the
 * image manager. Escape cancels; the confirm button takes focus on open so
 * Enter confirms without reaching for the mouse.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  icon = 'warning',
  danger = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: IconName;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // Swallow it, so the dialog underneath doesn't close at the same time.
      e.stopPropagation();
      e.preventDefault();
      onCancel();
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return createPortal(
    <div className="confirm-overlay" onMouseDown={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`confirm-icon ${danger ? 'is-danger' : ''}`}>
          <Icon name={icon} size={20} />
        </div>
        <div className="confirm-body">
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-message">{message}</p>
        </div>
        <div className="confirm-actions">
          <button type="button" onClick={onCancel}>
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
