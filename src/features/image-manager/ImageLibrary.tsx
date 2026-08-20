import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { isLowDpi, printDpi } from '../../domain/resolution';
import { useProjectStore } from '../../state/projectStore';
import { computeImageRoles, type ImageRole } from '../../state/selectors';
import { imageKind, imageLabel, type CardImageMeta } from '../../state/types';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FileDropZone } from '../../components/FileDropZone';
import { useImageHoverPreview } from '../../components/useImageHoverPreview';
import { useImageImport } from '../upload/useImageImport';
import { Thumbnail } from './Thumbnail';

export const IMAGE_DND_TYPE = 'application/x-card-image-id';

function roleBadgeClass(role: ImageRole | undefined): string {
  switch (role?.kind) {
    case 'front':
      return 'badge badge-front';
    case 'back':
      return 'badge badge-back';
    case 'shared-back':
      return 'badge badge-shared';
    default:
      return 'badge badge-unused';
  }
}

export function ImageLibrary() {
  const { t } = useTranslation();
  const images = useProjectStore((s) => s.images);
  const project = useProjectStore((s) => s.project);
  const importFiles = useImageImport();
  const autoNameImages = useProjectStore((s) => s.autoNameImages);
  const removeImages = useProjectStore((s) => s.removeImages);
  const setImagesKind = useProjectStore((s) => s.setImagesKind);
  const addCards = useProjectStore((s) => s.addCards);
  const fileRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const roles = computeImageRoles(project);
  const list = useMemo(
    () => Object.values(images).sort((a, b) => a.createdAt - b.createdAt),
    [images],
  );

  const settings = project.settings;
  const bleedMm = settings.bleedEnabled ? settings.bleedMm : 0;
  const cellWidthMm = settings.cardWidthMm + 2 * bleedMm;
  const cellHeightMm = settings.cardHeightMm + 2 * bleedMm;

  // Drop ids of images that were deleted meanwhile, so counts never drift.
  const selectedIds = list.filter((m) => selected.has(m.id)).map((m) => m.id);
  const allSelected = list.length > 0 && selectedIds.length === list.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function roleLabel(role: ImageRole | undefined): string {
    switch (role?.kind) {
      case 'front':
        return t('manager.roleFront', { n: role.cardIndex + 1 });
      case 'back':
        return t('manager.roleBack', { n: role.cardIndex + 1 });
      case 'shared-back':
        return t('manager.roleShared');
      default:
        return t('manager.roleUnused');
    }
  }

  return (
    <div className="im-library">
      <div className="im-section-head">
        <span className="im-section-title">{t('manager.libraryTitle')}</span>
        <div className="im-head-actions">
          {list.length > 0 && (
            <button
              type="button"
              className="im-link-btn"
              onClick={() => setSelected(allSelected ? new Set() : new Set(list.map((m) => m.id)))}
            >
              <Icon name={allSelected ? 'square' : 'square-check'} />
              {allSelected ? t('manager.selectNone') : t('manager.selectAll')}
            </button>
          )}
          {list.length > 0 && (
            <button type="button" className="im-link-btn" onClick={autoNameImages}>
              <Icon name="pencil" /> {t('manager.autoName')}
            </button>
          )}
          <button type="button" className="im-link-btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> {t('manager.upload')}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            void importFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="im-bulk-bar">
          <span className="im-bulk-count">
            {t('manager.selectedCount', { count: selectedIds.length })}
          </span>
          <button type="button" onClick={() => setImagesKind(selectedIds, 'front')}>
            {t('manager.markAsFront')}
          </button>
          <button type="button" onClick={() => setImagesKind(selectedIds, 'back')}>
            {t('manager.markAsBack')}
          </button>
          <button
            type="button"
            onClick={() => {
              addCards(selectedIds.map((id) => ({ frontImageId: id })));
              clearSelection();
            }}
          >
            <Icon name="plus" size={14} /> {t('manager.createCards')}
          </button>
          <button type="button" className="im-bulk-del" onClick={() => setConfirmBulkDelete(true)}>
            <Icon name="trash" size={14} /> {t('manager.delete')}
          </button>
          <button type="button" className="im-bulk-clear" onClick={clearSelection}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <FileDropZone className="im-library-drop" onFiles={(files) => void importFiles(files)}>
        {list.length === 0 ? (
          <div
            className="im-empty-drop"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <Icon name="photo-plus" size={22} />
            <span>{t('manager.emptyLibrary')}</span>
          </div>
        ) : (
          <div className="im-grid">
            {list.map((meta) => (
              <LibraryTile
                key={meta.id}
                meta={meta}
                roleLabel={roleLabel(roles.get(meta.id))}
                roleClass={roleBadgeClass(roles.get(meta.id))}
                selected={selected.has(meta.id)}
                anySelected={selectedIds.length > 0}
                onToggleSelected={() => toggle(meta.id)}
                dpi={printDpi({
                  widthPx: meta.widthPx,
                  heightPx: meta.heightPx,
                  cellWidthMm,
                  cellHeightMm,
                })}
              />
            ))}
          </div>
        )}
        <div className="im-library-drop-hint">{t('manager.dropHere')}</div>
      </FileDropZone>

      {confirmBulkDelete && (
        <ConfirmDialog
          title={t('manager.confirmDeleteImagesTitle')}
          message={t('manager.confirmDeleteImagesBody', { count: selectedIds.length })}
          confirmLabel={t('manager.delete')}
          onCancel={() => setConfirmBulkDelete(false)}
          onConfirm={() => {
            void removeImages(selectedIds);
            clearSelection();
            setConfirmBulkDelete(false);
          }}
        />
      )}
    </div>
  );
}

function LibraryTile({
  meta,
  roleLabel,
  roleClass,
  selected,
  anySelected,
  onToggleSelected,
  dpi,
}: {
  meta: CardImageMeta;
  roleLabel: string;
  roleClass: string;
  selected: boolean;
  anySelected: boolean;
  onToggleSelected: () => void;
  dpi: number;
}) {
  const { t } = useTranslation();
  const renameImage = useProjectStore((s) => s.renameImage);
  const removeImage = useProjectStore((s) => s.removeImage);
  const setImageKind = useProjectStore((s) => s.setImageKind);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(imageLabel(meta));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const kind = imageKind(meta);
  const lowDpi = isLowDpi(dpi);
  const { handlers: hoverHandlers, preview: hoverPreview } = useImageHoverPreview(meta.id);

  function commit() {
    setEditing(false);
    if (draft.trim() && draft !== imageLabel(meta)) renameImage(meta.id, draft);
    else setDraft(imageLabel(meta));
  }

  return (
    <div
      className={`im-tile ${selected ? 'is-selected' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(IMAGE_DND_TYPE, meta.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div className="im-tile-thumb" {...hoverHandlers}>
        <Thumbnail imageId={meta.id} />
        <label
          className={`im-tile-check ${selected || anySelected ? 'is-visible' : ''}`}
          title={t('manager.select')}
        >
          <input type="checkbox" checked={selected} onChange={onToggleSelected} />
        </label>
        {lowDpi && (
          <span className="im-dpi-warn" title={t('manager.lowDpiTooltip', { dpi: Math.round(dpi) })}>
            <Icon name="warning" size={13} />
            {Math.round(dpi)}
          </span>
        )}
        <button
          type="button"
          className="im-tile-del"
          aria-label={t('manager.delete')}
          onClick={() => setConfirmDelete(true)}
        >
          <Icon name="trash" size={15} />
        </button>
        {hoverPreview}
      </div>
      <div className="im-tile-body">
        {editing ? (
          <input
            autoFocus
            className="im-rename-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                // Revert only the rename; don't let Escape bubble up and close the modal.
                e.stopPropagation();
                setDraft(imageLabel(meta));
                setEditing(false);
              }
            }}
          />
        ) : (
          <button type="button" className="im-tile-name" onClick={() => setEditing(true)} title={imageLabel(meta)}>
            <span className="im-tile-name-text">{imageLabel(meta)}</span>
            <Icon name="pencil" size={13} />
          </button>
        )}
        <div className="im-tile-meta">
          <span className={roleClass}>{roleLabel}</span>
          <div className="im-kind-toggle" role="group" aria-label={t('manager.kind')}>
            <button
              type="button"
              className={kind === 'front' ? 'is-active' : ''}
              onClick={() => setImageKind(meta.id, 'front')}
            >
              {t('manager.kindFront')}
            </button>
            <button
              type="button"
              className={kind === 'back' ? 'is-active' : ''}
              onClick={() => setImageKind(meta.id, 'back')}
            >
              {t('manager.kindBack')}
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={t('manager.confirmDeleteImageTitle')}
          message={t('manager.confirmDeleteImageBody', { name: imageLabel(meta) })}
          confirmLabel={t('manager.delete')}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            void removeImage(meta.id);
            setConfirmDelete(false);
          }}
        />
      )}
    </div>
  );
}
