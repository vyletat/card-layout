import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './App.css';
import { Icon } from './components/Icon';
import { isDialogOpen, isTypingTarget } from './components/dialogState';
import { SettingsPanel } from './features/settings/SettingsPanel';
import { ImageUploadPanel } from './features/upload/ImageUploadPanel';
import { ImageManagerModal } from './features/image-manager/ImageManagerModal';
import { EditorPanel } from './features/grid-editor/EditorPanel';
import { ExportPanel } from './features/export/ExportPanel';
import { PrintView, type PrintMode } from './features/export/PrintView';
import type { PrintScope } from './features/export/printScope';
import { CalibrationPanel } from './features/calibration/CalibrationPanel';
import { ProjectFilePanel } from './features/projectFile/ProjectFilePanel';
import { SaveButton } from './features/projectFile/SaveButton';
import { ProjectsDialog } from './features/projectFile/ProjectsDialog';
import { ShortcutsDialog } from './features/shortcuts/ShortcutsDialog';
import { useIsDirty, useProjectStore } from './state/projectStore';
import { useSyncLanguage } from './i18n/useSyncLanguage';
import { languageLabel, nextLanguage } from './i18n/languages';
import { useTheme } from './theme/useTheme';

function App() {
  useSyncLanguage();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const language = useProjectStore((s) => s.project.settings.language);
  const projectName = useProjectStore((s) => s.project.name);
  const updateSettings = useProjectStore((s) => s.updateSettings);
  const renameProject = useProjectStore((s) => s.renameProject);
  const isDirty = useIsDirty();

  const [printMode, setPrintMode] = useState<PrintMode>('cards');
  const [printScope, setPrintScope] = useState<PrintScope>('both');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [managerOpen, setManagerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  // Pick the last project back up on reload — everything is already in IndexedDB.
  useEffect(() => {
    void useProjectStore.getState().restoreLastSession();
  }, []);

  // Prevent the browser from navigating away when a file is dropped outside a drop zone.
  useEffect(() => {
    function prevent(e: DragEvent) {
      if (Array.from(e.dataTransfer?.types ?? []).includes('Files')) e.preventDefault();
    }
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 'p') {
          e.preventDefault();
          printWithMode('cards');
        } else if (e.key === 'm') {
          e.preventDefault();
          setManagerOpen((v) => !v);
        }
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '?' && !isDialogOpen()) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  function printWithMode(mode: PrintMode) {
    flushSync(() => setPrintMode(mode));
    window.print();
  }

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="panel-toggle"
              aria-label={t('app.toggleSettings')}
              aria-pressed={leftOpen}
              onClick={() => setLeftOpen((v) => !v)}
            >
              <Icon name="sidebar" size={18} />
            </button>
            <div className="app-brand">
              <span className="app-brand-logo" />
              {t('app.title')}
            </div>
            <div className="topbar-project">
              <input
                className="project-name"
                type="text"
                value={projectName}
                aria-label={t('projectFile.name')}
                title={t('projectFile.name')}
                onChange={(e) => renameProject(e.target.value)}
              />
              {isDirty && <span className="dirty-dot" title={t('projectFile.unsaved')} />}
              <SaveButton />
              <button
                type="button"
                className="panel-toggle"
                aria-label={t('projects.title')}
                title={t('projects.title')}
                aria-pressed={projectsOpen}
                onClick={() => setProjectsOpen(true)}
              >
                <Icon name="folder" size={18} />
              </button>
              <ProjectFilePanel compact />
            </div>
          </div>
          <div className="topbar-right">
            <button
              type="button"
              className="panel-toggle"
              aria-label={t('shortcuts.title')}
              title={`${t('shortcuts.title')} (?)`}
              onClick={() => setShortcutsOpen(true)}
            >
              <Icon name="keyboard" size={18} />
            </button>
            <button
              type="button"
              className="panel-toggle lang-toggle"
              aria-label={t('app.toggleLanguage')}
              onClick={() => updateSettings({ language: nextLanguage(language) })}
            >
              <Icon name="globe" size={16} />
              <span>{languageLabel(language)}</span>
            </button>
            <button
              type="button"
              className="panel-toggle theme-toggle"
              aria-label={t('app.toggleTheme')}
              onClick={toggleTheme}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <button
              type="button"
              className="panel-toggle"
              aria-label={t('app.toggleRightPanel')}
              aria-pressed={rightOpen}
              onClick={() => setRightOpen((v) => !v)}
            >
              <Icon name="sidebar-right" size={18} />
            </button>
          </div>
        </header>

        <div className="app-body">
          <aside className={`sidebar-left ${leftOpen ? '' : 'is-collapsed'}`}>
            <div className="sidebar-inner">
              <SettingsPanel />
            </div>
          </aside>

          <main className="main-area">
            <EditorPanel />
          </main>

          <aside className={`sidebar-right ${rightOpen ? '' : 'is-collapsed'}`}>
            <div className="sidebar-inner">
              <ImageUploadPanel onOpenManager={() => setManagerOpen(true)} />
              <ExportPanel
                scope={printScope}
                onScopeChange={setPrintScope}
                onPrint={() => printWithMode('cards')}
              />
              <CalibrationPanel onPrintCalibration={() => printWithMode('calibration')} />
            </div>
          </aside>
        </div>
      </div>

      {managerOpen && <ImageManagerModal onClose={() => setManagerOpen(false)} />}
      {projectsOpen && <ProjectsDialog onClose={() => setProjectsOpen(false)} />}
      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      <PrintView mode={printMode} scope={printScope} />
    </>
  );
}

export default App;
