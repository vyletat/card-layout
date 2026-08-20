import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../state/projectStore';
import { imageKind, imageLabel, type ImageKind } from '../../state/types';
import { Icon } from '../../components/Icon';
import { useImageHoverPreview } from '../../components/useImageHoverPreview';
import { Thumbnail } from './Thumbnail';
import { IMAGE_DND_TYPE } from './ImageLibrary';

/**
 * A front/back/shared image slot. Accepts a drop from the library, or opens a
 * click-to-pick popover as a fallback. `inheritedImageId` renders a dashed
 * "inherited shared back" preview when the slot itself has no own image.
 * `filterKind` restricts the click-picker to only front or only back images.
 */
export function ImageSlot({
  imageId,
  inheritedImageId = null,
  onPick,
  size = 'md',
  allowNone = true,
  filterKind,
}: {
  imageId: string | null;
  inheritedImageId?: string | null;
  onPick: (imageId: string | null) => void;
  size?: 'md' | 'lg';
  allowNone?: boolean;
  filterKind?: ImageKind;
}) {
  const { t } = useTranslation();
  const images = useProjectStore((s) => s.images);
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const list = Object.values(images)
    .filter((m) => !filterKind || imageKind(m) === filterKind)
    .sort((a, b) => a.createdAt - b.createdAt);
  const showInherited = !imageId && inheritedImageId;
  const previewImageId = imageId ?? (showInherited ? inheritedImageId : null);
  const { handlers: hoverHandlers, preview: hoverPreview } = useImageHoverPreview(previewImageId);

  return (
    <div className="im-slot-wrap">
      <button
        type="button"
        className={`im-slot im-slot-${size} ${dragOver ? 'is-dragover' : ''} ${imageId ? 'has-image' : ''} ${showInherited ? 'is-inherited' : ''}`}
        onClick={() => setPickerOpen((v) => !v)}
        {...hoverHandlers}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(IMAGE_DND_TYPE)) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const id = e.dataTransfer.getData(IMAGE_DND_TYPE);
          if (id) onPick(id);
        }}
        aria-label={t('manager.pickImage')}
      >
        {imageId ? (
          <Thumbnail imageId={imageId} />
        ) : showInherited ? (
          <Thumbnail imageId={inheritedImageId} />
        ) : (
          <Icon name="plus" size={18} />
        )}
      </button>
      {hoverPreview}

      {pickerOpen && (
        <>
          <div className="im-picker-backdrop" onClick={() => setPickerOpen(false)} />
          <div className="im-picker">
            {allowNone && (
              <button
                type="button"
                className="im-picker-item im-picker-none"
                onClick={() => {
                  onPick(null);
                  setPickerOpen(false);
                }}
              >
                <Icon name="x" size={14} /> {t('manager.none')}
              </button>
            )}
            {list.length === 0 && <div className="im-picker-empty">{t('manager.noImages')}</div>}
            {list.map((meta) => (
              <button
                key={meta.id}
                type="button"
                className={`im-picker-item ${meta.id === imageId ? 'is-selected' : ''}`}
                onClick={() => {
                  onPick(meta.id);
                  setPickerOpen(false);
                }}
              >
                <Thumbnail imageId={meta.id} className="im-picker-thumb" />
                <span className="im-picker-name">{imageLabel(meta)}</span>
                {meta.id === imageId && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
