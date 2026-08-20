import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { computeFitScale } from '../../domain/imageFit';
import { useHtmlImage } from '../../hooks/useHtmlImage';
import { useImageUrl } from '../../hooks/useImageUrl';
import { useProjectStore } from '../../state/projectStore';
import { resolveSideTransform, usesSharedBack } from '../../state/selectors';
import { useSheetData } from '../../state/useSheetData';
import { DEFAULT_IMAGE_TRANSFORM, type ImageTransform } from '../../state/types';
import { Icon } from '../../components/Icon';
import { isDialogOpen, isTypingTarget } from '../../components/dialogState';
import { GridCanvas } from './GridCanvas';
import { clampZoom, MAX_ZOOM, MIN_ZOOM, type Pan } from './canvasView';

const ZOOM_BUTTON_STEP = 1.25;
const NUDGE_MM = 0.5;
const NUDGE_FINE_MM = 0.1;

export function EditorPanel() {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const updateCardTransform = useProjectStore((s) => s.updateCardTransform);
  const updateSharedBackTransform = useProjectStore((s) => s.updateSharedBackTransform);
  const setCardLocked = useProjectStore((s) => s.setCardLocked);
  const undoTransform = useProjectStore((s) => s.undoTransform);
  const redoTransform = useProjectStore((s) => s.redoTransform);
  const transformHistory = useProjectStore((s) => s.transformHistory);
  const transformFuture = useProjectStore((s) => s.transformFuture);

  const [side, setSide] = useState<'front' | 'back'>('front');
  const [sheetIndex, setSheetIndex] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [showOverlay, setShowOverlay] = useState(false);

  const { grid, sheetPairs } = useSheetData(project);
  const sheetCount = sheetPairs.length;

  const selectedCard = project.cards.find((c) => c.id === selectedCardId) ?? null;
  const selectedTransform = selectedCard ? resolveSideTransform(project, selectedCard, side) : null;
  const editsSharedBack = selectedCard ? usesSharedBack(project, selectedCard, side) : false;

  /**
   * Applies a transform edit to whatever actually frames the current side —
   * the card itself, or the shared back when the card falls back to it.
   */
  const applyTransform = useCallback(
    (patch: Partial<ImageTransform>) => {
      if (!selectedCard || selectedCard.locked) return;
      if (usesSharedBack(project, selectedCard, side)) updateSharedBackTransform(patch);
      else updateCardTransform(selectedCard.id, side, patch);
    },
    [project, selectedCard, side, updateCardTransform, updateSharedBackTransform],
  );
  const selectedImageId = selectedCard
    ? side === 'front'
      ? selectedCard.frontImageId
      : (selectedCard.backImageId ?? project.sharedBackImageId)
    : null;

  const selectedImageUrl = useImageUrl(selectedImageId ?? null);
  const selectedHtmlImage = useHtmlImage(selectedImageUrl);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback((factor: number) => {
    // Button zoom keeps the paper centred rather than following the pointer.
    setZoom((z) => clampZoom(z * factor));
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomTo = useCallback((percent: number) => {
    setZoom(clampZoom(percent / 100));
    setPan({ x: 0, y: 0 });
  }, []);

  // Keep the sheet in range when the deck shrinks (deleted cards, bigger cards…).
  useEffect(() => {
    if (sheetCount > 0 && sheetIndex > sheetCount - 1) setSheetIndex(sheetCount - 1);
  }, [sheetCount, sheetIndex]);

  // B flips between the front and back view of the current sheet.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target) || isDialogOpen()) return;
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setSide((s) => (s === 'front' ? 'back' : 'front'));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Arrow keys nudge the selected artwork; Shift makes the step finer.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedCard || selectedCard.locked) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target) || isDialogOpen()) return;

      const step = e.shiftKey ? NUDGE_FINE_MM : NUDGE_MM;
      const delta =
        e.key === 'ArrowLeft'
          ? { x: -step, y: 0 }
          : e.key === 'ArrowRight'
            ? { x: step, y: 0 }
            : e.key === 'ArrowUp'
              ? { x: 0, y: -step }
              : e.key === 'ArrowDown'
                ? { x: 0, y: step }
                : null;
      if (!delta) return;

      e.preventDefault();
      const current = resolveSideTransform(project, selectedCard, side);
      applyTransform({
        offsetXMm: current.offsetXMm + delta.x,
        offsetYMm: current.offsetYMm + delta.y,
      });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyTransform, project, selectedCard, side]);

  function handleFitToCell() {
    if (!selectedCard || !selectedHtmlImage) return;
    const contain = computeFitScale(
      selectedHtmlImage.naturalWidth,
      selectedHtmlImage.naturalHeight,
      grid.cellWidthMm,
      grid.cellHeightMm,
      'contain',
    );
    const cover = computeFitScale(
      selectedHtmlImage.naturalWidth,
      selectedHtmlImage.naturalHeight,
      grid.cellWidthMm,
      grid.cellHeightMm,
      'cover',
    );
    applyTransform({
      offsetXMm: 0,
      offsetYMm: 0,
      scaleX: cover.mmPerPxX / contain.mmPerPxX,
      scaleY: cover.mmPerPxY / contain.mmPerPxY,
    });
  }

  function handleReset() {
    if (!selectedCard) return;
    applyTransform({
      offsetXMm: DEFAULT_IMAGE_TRANSFORM.offsetXMm,
      offsetYMm: DEFAULT_IMAGE_TRANSFORM.offsetYMm,
      scaleX: DEFAULT_IMAGE_TRANSFORM.scaleX,
      scaleY: DEFAULT_IMAGE_TRANSFORM.scaleY,
      rotationDeg: DEFAULT_IMAGE_TRANSFORM.rotationDeg,
    });
  }

  return (
    <div className="editor-panel">
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button type="button" className={side === 'front' ? 'active' : ''} onClick={() => setSide('front')}>
            {t('editor.front')}
          </button>
          <button type="button" className={side === 'back' ? 'active' : ''} onClick={() => setSide('back')}>
            {t('editor.back')}
          </button>
        </div>

        <div className="toolbar-group">
          <button
            type="button"
            aria-label={t('editor.sheetPrev')}
            title={t('editor.sheetPrev')}
            disabled={sheetIndex === 0}
            onClick={() => setSheetIndex((i) => i - 1)}
          >
            <Icon name="chevron-left" size={15} />
          </button>
          <ToolbarNumber
            value={sheetCount === 0 ? 0 : sheetIndex + 1}
            min={sheetCount === 0 ? 0 : 1}
            max={sheetCount}
            step={1}
            disabled={sheetCount === 0}
            ariaLabel={t('editor.sheetNumber')}
            onCommit={(n) => setSheetIndex(Math.round(n) - 1)}
          />
          <span className="toolbar-suffix">{t('editor.sheetOf', { total: sheetCount })}</span>
          <button
            type="button"
            aria-label={t('editor.sheetNext')}
            title={t('editor.sheetNext')}
            disabled={sheetIndex >= sheetCount - 1}
            onClick={() => setSheetIndex((i) => i + 1)}
          >
            <Icon name="chevron-right" size={15} />
          </button>
        </div>

        <div className="toolbar-group">
          <button type="button" aria-label={t('editor.zoomOut')} title={t('editor.zoomOut')} onClick={() => zoomBy(1 / ZOOM_BUTTON_STEP)}>
            <Icon name="zoom-out" size={15} />
          </button>
          <ToolbarNumber
            value={Math.round(zoom * 100)}
            min={Math.round(MIN_ZOOM * 100)}
            max={Math.round(MAX_ZOOM * 100)}
            step={5}
            ariaLabel={t('editor.zoomLevel')}
            onCommit={zoomTo}
          />
          <span className="toolbar-suffix">%</span>
          <button type="button" aria-label={t('editor.zoomIn')} title={t('editor.zoomIn')} onClick={() => zoomBy(ZOOM_BUTTON_STEP)}>
            <Icon name="zoom-in" size={15} />
          </button>
          <button type="button" aria-label={t('editor.zoomFit')} title={t('editor.zoomFit')} onClick={resetView}>
            <Icon name="maximize" size={15} />
          </button>
        </div>

        <div className="toolbar-group">
          <button
            type="button"
            className={showOverlay ? 'active' : ''}
            aria-pressed={showOverlay}
            title={t('editor.overlayHint')}
            onClick={() => setShowOverlay((v) => !v)}
          >
            <Icon name="eye" size={15} />
            {t('editor.overlay')}
          </button>
        </div>

        <div className="toolbar-group">
          <button
            type="button"
            aria-label={t('editor.undo')}
            title={t('editor.undo')}
            disabled={transformHistory.length === 0}
            onClick={undoTransform}
          >
            <Icon name="undo" size={15} />
          </button>
          <button
            type="button"
            aria-label={t('editor.redo')}
            title={t('editor.redo')}
            disabled={transformFuture.length === 0}
            onClick={redoTransform}
          >
            <Icon name="redo" size={15} />
          </button>
        </div>

        {selectedCard && (
          <div className="toolbar-group">
            <button
              type="button"
              className={selectedCard.locked ? 'active' : ''}
              aria-pressed={!!selectedCard.locked}
              title={selectedCard.locked ? t('editor.unlockCard') : t('editor.lockCard')}
              onClick={() => setCardLocked(selectedCard.id, !selectedCard.locked)}
            >
              <Icon name={selectedCard.locked ? 'lock' : 'unlock'} size={15} />
            </button>
            <label className="field checkbox">
              <input
                type="checkbox"
                disabled={!!selectedCard.locked}
                checked={selectedTransform?.aspectLocked ?? true}
                onChange={(e) => applyTransform({ aspectLocked: e.target.checked })}
              />
              <span>{t('editor.lockAspect')}</span>
            </label>
            <button type="button" disabled={!!selectedCard.locked} onClick={handleFitToCell}>
              {t('editor.fitCell')}
            </button>
            <button type="button" disabled={!!selectedCard.locked} onClick={handleReset}>
              {t('editor.resetTransform')}
            </button>
            {editsSharedBack && (
              <span className="toolbar-note" title={t('editor.sharedBackNoteHint')}>
                <Icon name="images" size={13} />
                {t('editor.sharedBackNote')}
              </span>
            )}
          </div>
        )}
      </div>

      <GridCanvas
        side={side}
        sheetIndex={sheetIndex}
        selectedCardId={selectedCardId}
        onSelectCard={setSelectedCardId}
        zoom={zoom}
        onZoomChange={setZoom}
        pan={pan}
        onPanChange={setPan}
        showOverlay={showOverlay}
      />
    </div>
  );
}

/**
 * Toolbar spin field. Typing is applied live while the value is inside the
 * allowed range; anything out of range (or half-typed) is only clamped once
 * the field is left or Enter is pressed, so the digits aren't fought over.
 */
function ToolbarNumber({
  value,
  min,
  max,
  step,
  ariaLabel,
  disabled = false,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  ariaLabel: string;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit(raw: string) {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    onCommit(clamped);
    setDraft(String(clamped));
  }

  return (
    <input
      className="toolbar-num"
      type="number"
      inputMode="numeric"
      value={draft}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parseFloat(e.target.value);
        if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) onCommit(parsed);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          e.stopPropagation();
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
    />
  );
}
