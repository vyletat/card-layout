import { useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../state/projectStore';
import { Icon } from '../../components/Icon';
import { FileDropZone } from '../../components/FileDropZone';
import { useImageImport } from './useImageImport';

export function ImageUploadPanel({ onOpenManager }: { onOpenManager: () => void }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const importFiles = useImageImport();
  const imageCount = useProjectStore((s) => Object.keys(s.images).length);
  const cardCount = useProjectStore((s) => s.project.cards.length);

  return (
    <div className="upload-panel">
      <h2>
        <Icon name="images" size={15} />
        {t('upload.title')}
      </h2>

      <FileDropZone
        className="dropzone"
        onFiles={(files) => void importFiles(files)}
      >
        <Icon name="upload" size={22} />
        <p className="dropzone-text">{t('upload.dropHere')}</p>
        <button type="button" onClick={() => inputRef.current?.click()}>
          {t('upload.choose')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            void importFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </FileDropZone>

      <p className="upload-hint">{t('upload.hint')}</p>

      <button type="button" className="manage-btn primary" onClick={onOpenManager}>
        <Icon name="images" /> {t('upload.manage')}
      </button>
      <p className="upload-count">{t('upload.count', { count: imageCount, cards: cardCount })}</p>
    </div>
  );
}
