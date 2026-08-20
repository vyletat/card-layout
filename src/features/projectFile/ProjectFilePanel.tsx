import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../state/projectStore';
import { Icon } from '../../components/Icon';
import { exportProjectZip, importProjectZip } from './projectZip';

export function ProjectFilePanel({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const images = useProjectStore((s) => s.images);
  const loadProject = useProjectStore((s) => s.loadProject);
  const markSaved = useProjectStore((s) => s.markSaved);
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    setIsBusy(true);
    try {
      const blob = await exportProjectZip(project, images);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'projekt'}.cardproj.zip`;
      a.click();
      URL.revokeObjectURL(url);
      markSaved();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleOpen(file: File) {
    setIsBusy(true);
    try {
      const { project: loaded, images: loadedImages } = await importProjectZip(file);
      loadProject(loaded, loadedImages);
    } finally {
      setIsBusy(false);
    }
  }

  // Ctrl/Cmd+Shift+S exports the project to a file, Ctrl/Cmd+O imports one.
  // Plain Ctrl+S belongs to SaveButton, where people expect it. This panel is
  // always mounted in the top bar, so it owns both shortcuts.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 's' && e.shiftKey) {
        e.preventDefault();
        if (!isBusy) void handleSave();
      } else if (key === 'o' && !e.shiftKey) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const buttons = (
    <>
      <button
        type="button"
        disabled={isBusy}
        title={t('projectFile.saveTitle')}
        onClick={() => void handleSave()}
      >
        <Icon name="download" size={15} />
        {t('projectFile.save')}
      </button>
      <button
        type="button"
        disabled={isBusy}
        title={t('projectFile.openTitle')}
        onClick={() => fileInputRef.current?.click()}
      >
        <Icon name="upload" size={15} />
        {t('projectFile.open')}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleOpen(file);
          e.target.value = '';
        }}
      />
    </>
  );

  if (compact) {
    return <div className="topbar-actions">{buttons}</div>;
  }

  return (
    <div className="project-file-panel">
      <h2>{t('projectFile.title')}</h2>
      <div className="toolbar-group">{buttons}</div>
    </div>
  );
}
