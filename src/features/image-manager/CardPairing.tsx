import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseCardCsv, resolveCsvCards, CSV_TEMPLATE } from '../../domain/csvImport';
import { deriveDisplayName } from '../../domain/filePairing';
import { isLowDpi, printDpi } from '../../domain/resolution';
import { useProjectStore } from '../../state/projectStore';
import { cardCount, MAX_CARD_COUNT, type Card, type ImageTransform } from '../../state/types';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ImageSlot } from './ImageSlot';

export function CardPairing() {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const images = useProjectStore((s) => s.images);
  const setSharedBackImage = useProjectStore((s) => s.setSharedBackImage);
  const updateCardImage = useProjectStore((s) => s.updateCardImage);
  const addCard = useProjectStore((s) => s.addCard);
  const addCards = useProjectStore((s) => s.addCards);
  const duplicateCard = useProjectStore((s) => s.duplicateCard);
  const removeCard = useProjectStore((s) => s.removeCard);
  const removeAllCards = useProjectStore((s) => s.removeAllCards);
  const reorderCards = useProjectStore((s) => s.reorderCards);
  const setCardCount = useProjectStore((s) => s.setCardCount);
  const setCardName = useProjectStore((s) => s.setCardName);
  const setCardLocked = useProjectStore((s) => s.setCardLocked);

  const cards = project.cards.slice().sort((a, b) => a.order - b.order);
  const totalPrints = cards.reduce((sum, c) => sum + cardCount(c), 0);
  // Ref holds the id synchronously (available during drop); state drives the visual cue.
  const dragIdRef = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [csvNotice, setCsvNotice] = useState<string | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const settings = project.settings;
  const bleedMm = settings.bleedEnabled ? settings.bleedMm : 0;
  const cellWidthMm = settings.cardWidthMm + 2 * bleedMm;
  const cellHeightMm = settings.cardHeightMm + 2 * bleedMm;

  function sideResolution(imageId: string | null, transform: ImageTransform): number {
    const meta = imageId ? images[imageId] : undefined;
    if (!meta) return 0;
    return printDpi({
      widthPx: meta.widthPx,
      heightPx: meta.heightPx,
      cellWidthMm,
      cellHeightMm,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
    });
  }

  function moveCard(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ids = cards.map((c) => c.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderCards(ids);
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const rows = parseCardCsv(text);
    const { cards: resolved, missing } = resolveCsvCards(rows, Object.values(images));
    if (resolved.length === 0) {
      setCsvNotice(t('manager.csvEmpty'));
      return;
    }
    addCards(
      resolved.map((c) => ({
        frontImageId: c.frontImageId,
        backImageId: c.backImageId,
        name: c.name,
        count: c.count,
      })),
    );
    setCsvNotice(
      missing.length > 0
        ? t('manager.csvImportedWithMissing', {
            count: resolved.length,
            missing: missing.join(', '),
          })
        : t('manager.csvImported', { count: resolved.length }),
    );
  }

  function downloadCsvTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cards-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="im-cards">
      <div className="im-section-head">
        <span className="im-section-title">{t('manager.cardsTitle')}</span>
        <div className="im-head-actions">
          <button type="button" className="im-link-btn" onClick={() => csvRef.current?.click()}>
            <Icon name="table" /> {t('manager.importCsv')}
          </button>
          <button type="button" className="im-link-btn" onClick={downloadCsvTemplate}>
            <Icon name="download" /> {t('manager.csvTemplate')}
          </button>
          {cards.length > 0 && (
            <button
              type="button"
              className="im-link-btn im-link-danger"
              onClick={() => setConfirmClear(true)}
            >
              <Icon name="trash" /> {t('manager.deleteAllCards')}
            </button>
          )}
        </div>
        <input
          ref={csvRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importCsv(file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="im-count im-cards-count">
        {t('manager.cardCount', { count: cards.length })}
        {totalPrints !== cards.length && ` · ${t('manager.totalPrints', { count: totalPrints })}`}
      </div>

      {csvNotice && (
        <div className="im-notice">
          <span>{csvNotice}</span>
          <button type="button" aria-label={t('manager.close')} onClick={() => setCsvNotice(null)}>
            <Icon name="x" size={13} />
          </button>
        </div>
      )}

      <div className="im-shared-row">
        <ImageSlot
          imageId={project.sharedBackImageId}
          onPick={(id) => setSharedBackImage(id)}
          size="md"
          filterKind="back"
        />
        <div className="im-shared-text">
          <div className="im-shared-title">{t('manager.sharedBack')}</div>
          <div className="im-shared-hint">{t('manager.sharedBackHint')}</div>
        </div>
      </div>

      <div className="im-card-list">
        {cards.map((card, index) => {
          // Both sides get printed, so both are checked; the worse one is shown.
          const backImageId = card.backImageId ?? project.sharedBackImageId;
          const backTransform = card.backImageId ? card.backTransform : project.sharedBackTransform;
          const sideDpi = [
            sideResolution(card.frontImageId, card.frontTransform),
            sideResolution(backImageId, backTransform),
          ].filter((d): d is number => d > 0);
          const dpi = sideDpi.length > 0 ? Math.min(...sideDpi) : 0;

          return (
            <CardRow
              key={card.id}
              card={card}
              index={index}
              sharedBackImageId={project.sharedBackImageId}
              lowDpi={isLowDpi(dpi)}
              dpi={dpi}
              isDragging={dragId === card.id}
              onDragStart={() => {
                dragIdRef.current = card.id;
                setDragId(card.id);
              }}
              onDragEnd={() => {
                dragIdRef.current = null;
                setDragId(null);
              }}
              onDropOn={() => {
                if (dragIdRef.current) moveCard(dragIdRef.current, card.id);
              }}
              onPickFront={(id) => updateCardImage(card.id, 'front', id)}
              onPickBack={(id) => updateCardImage(card.id, 'back', id)}
              onSetCount={(n) => setCardCount(card.id, n)}
              onSetName={(name) => setCardName(card.id, name)}
              onToggleLock={() => setCardLocked(card.id, !card.locked)}
              onDuplicate={() => duplicateCard(card.id)}
              onRemove={() => removeCard(card.id)}
            />
          );
        })}
      </div>

      <button type="button" className="im-add-card" onClick={() => addCard(null, null)}>
        <Icon name="plus" /> {t('manager.addCard')}
      </button>

      {confirmClear && (
        <ConfirmDialog
          title={t('manager.confirmDeleteAllTitle')}
          message={t('manager.confirmDeleteAllBody', { count: cards.length })}
          confirmLabel={t('manager.deleteAllConfirm')}
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            removeAllCards();
            setConfirmClear(false);
          }}
        />
      )}
    </div>
  );
}

function CardRow({
  card,
  index,
  sharedBackImageId,
  lowDpi,
  dpi,
  isDragging,
  onDragStart,
  onDragEnd,
  onDropOn,
  onPickFront,
  onPickBack,
  onSetCount,
  onSetName,
  onToggleLock,
  onDuplicate,
  onRemove,
}: {
  card: Card;
  index: number;
  sharedBackImageId: string | null;
  lowDpi: boolean;
  dpi: number;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
  onPickFront: (id: string | null) => void;
  onPickBack: (id: string | null) => void;
  onSetCount: (count: number) => void;
  onSetName: (name: string) => void;
  onToggleLock: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [dropTarget, setDropTarget] = useState(false);
  const images = useProjectStore((s) => s.images);
  const [nameDraft, setNameDraft] = useState(card.name ?? '');

  // Keep the field in sync when the card's name changes elsewhere (e.g. project load).
  useEffect(() => {
    setNameDraft(card.name ?? '');
  }, [card.name]);

  const frontMeta = card.frontImageId ? images[card.frontImageId] : undefined;
  const namePlaceholder = frontMeta
    ? (frontMeta.displayName ?? deriveDisplayName(frontMeta.fileName))
    : t('manager.cardFallbackName', { n: index + 1 });

  const backLabel = card.backImageId
    ? t('manager.ownBack')
    : sharedBackImageId
      ? t('manager.usesSharedBack')
      : t('manager.noBack');

  return (
    <div
      className={`im-card-row ${isDragging ? 'is-dragging' : ''} ${dropTarget ? 'is-drop-target' : ''} ${card.locked ? 'is-locked' : ''}`}
      onDragOver={(e) => {
        // Only react to card-reorder drags (they set no image DnD type).
        if (isDragging) return;
        e.preventDefault();
        setDropTarget(true);
      }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={() => {
        setDropTarget(false);
        onDropOn();
      }}
    >
      <span
        className="im-card-handle"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        aria-label={t('manager.reorder')}
      >
        <Icon name="grip" size={15} />
      </span>
      <span className="im-card-index">{index + 1}</span>
      <ImageSlot imageId={card.frontImageId} onPick={onPickFront} filterKind="front" />
      <Icon name="swap" size={14} className="im-card-sep" />
      <ImageSlot
        imageId={card.backImageId}
        inheritedImageId={sharedBackImageId}
        onPick={onPickBack}
        filterKind="back"
      />
      <div className="im-card-text">
        <input
          className="im-card-name"
          type="text"
          value={nameDraft}
          placeholder={namePlaceholder}
          aria-label={t('manager.cardName')}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => onSetName(nameDraft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Commit explicitly rather than relying on the blur that follows.
              onSetName(nameDraft);
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              // Revert only the edit; don't let Escape bubble up and close the modal.
              e.stopPropagation();
              setNameDraft(card.name ?? '');
              e.currentTarget.blur();
            }
          }}
        />
        <span className="im-card-label">
          {backLabel}
          {lowDpi && (
            <span className="im-card-dpi" title={t('manager.lowDpiTooltip', { dpi: Math.round(dpi) })}>
              <Icon name="warning" size={12} />
              {t('manager.lowDpiShort', { dpi: Math.round(dpi) })}
            </span>
          )}
        </span>
      </div>
      <label className="im-card-count" title={t('manager.copies')}>
        <span aria-hidden="true">×</span>
        <input
          type="number"
          min={1}
          max={MAX_CARD_COUNT}
          value={cardCount(card)}
          aria-label={t('manager.copies')}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) onSetCount(v);
          }}
        />
      </label>
      <button
        type="button"
        className={`im-card-icon-btn ${card.locked ? 'is-on' : ''}`}
        aria-label={card.locked ? t('manager.unlockCard') : t('manager.lockCard')}
        title={card.locked ? t('manager.unlockCard') : t('manager.lockCard')}
        aria-pressed={!!card.locked}
        onClick={onToggleLock}
      >
        <Icon name={card.locked ? 'lock' : 'unlock'} size={15} />
      </button>
      <button
        type="button"
        className="im-card-icon-btn"
        aria-label={t('manager.duplicateCard')}
        title={t('manager.duplicateCard')}
        onClick={onDuplicate}
      >
        <Icon name="copy" size={15} />
      </button>
      <button type="button" className="im-card-del" aria-label={t('manager.delete')} onClick={onRemove}>
        <Icon name="trash" size={15} />
      </button>
    </div>
  );
}
