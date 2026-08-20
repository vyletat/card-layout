import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useProjectStore } from '../../state/projectStore';
import { countImagesForProject, getAllProjects, putProject } from '../../storage/db';
import type { Project } from '../../state/types';
import './projects.css';

interface ProjectRow {
  project: Project;
  imageCount: number;
}

/**
 * Everything the app has stored locally, in one place: projects are kept in
 * IndexedDB as you work, and each one owns its images — so deleting a project
 * here is what actually frees the space those images take up.
 */
export function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const currentId = useProjectStore((s) => s.project.id);
  const openProjectById = useProjectStore((s) => s.openProjectById);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const resetProject = useProjectStore((s) => s.resetProject);

  const [rows, setRows] = useState<ProjectRow[] | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const projects = await getAllProjects();
    const sorted = projects.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    const counts = await Promise.all(sorted.map((p) => countImagesForProject(p.id)));
    setRows(sorted.map((project, i) => ({ project, imageCount: counts[i] })));
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, currentId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Switching is lossless: the project being left has already been written to
  // IndexedDB, so there is nothing to confirm.
  function open(id: string) {
    if (id !== currentId) void openProjectById(id);
    onClose();
  }

  async function rename(project: Project, name: string) {
    if (project.id === currentId) {
      renameProject(name);
    } else {
      await putProject({ ...project, name: name.trim() || 'Untitled' });
    }
    void reload();
  }

  const pendingDelete = rows?.find((r) => r.project.id === pendingDeleteId);

  return createPortal(
    <div className="pj-overlay" onMouseDown={onClose}>
      <div className="pj-dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pj-head">
          <div className="pj-title">
            <Icon name="folder" size={18} />
            <span>{t('projects.title')}</span>
          </div>
          <div className="pj-head-actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                resetProject();
                onClose();
              }}
            >
              <Icon name="plus" size={15} />
              {t('projects.newProject')}
            </button>
            <button type="button" className="pj-close" aria-label={t('manager.close')} onClick={onClose}>
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        <div className="pj-list">
          {rows === null && <div className="pj-empty">{t('projects.loading')}</div>}
          {rows?.length === 0 && <div className="pj-empty">{t('projects.empty')}</div>}
          {rows?.map(({ project, imageCount }) => (
            <ProjectRowItem
              key={project.id}
              project={project}
              imageCount={imageCount}
              isCurrent={project.id === currentId}
              dateLabel={new Date(project.updatedAt).toLocaleDateString(i18n.language)}
              onOpen={() => open(project.id)}
              onRename={(name) => void rename(project, name)}
              onDelete={() => setPendingDeleteId(project.id)}
            />
          ))}
        </div>

        <div className="pj-foot">
          <Icon name="warning" size={15} />
          {t('projects.footerHint')}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title={t('projects.confirmDeleteTitle')}
          message={t(
            pendingDelete.project.id === currentId
              ? 'projects.confirmDeleteCurrentBody'
              : 'projects.confirmDeleteBody',
            { name: pendingDelete.project.name, images: pendingDelete.imageCount },
          )}
          confirmLabel={t('projects.deleteConfirm')}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => {
            void deleteProject(pendingDelete.project.id).then(reload);
            setPendingDeleteId(null);
          }}
        />
      )}
    </div>,
    document.body,
  );
}

function ProjectRowItem({
  project,
  imageCount,
  isCurrent,
  dateLabel,
  onOpen,
  onRename,
  onDelete,
}: {
  project: Project;
  imageCount: number;
  isCurrent: boolean;
  dateLabel: string;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(project.name);

  useEffect(() => {
    setDraft(project.name);
  }, [project.name]);

  return (
    <div className={`pj-row ${isCurrent ? 'is-current' : ''}`}>
      <div className="pj-row-main">
        <input
          className="pj-row-name"
          type="text"
          value={draft}
          aria-label={t('projectFile.name')}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== project.name && onRename(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onRename(draft);
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              e.stopPropagation();
              setDraft(project.name);
              e.currentTarget.blur();
            }
          }}
        />
        <div className="pj-row-meta">
          {t('projects.meta', { cards: project.cards.length, images: imageCount, date: dateLabel })}
          {isCurrent && <span className="pj-current-badge">{t('projects.current')}</span>}
        </div>
      </div>
      <button type="button" onClick={onOpen} disabled={isCurrent}>
        <Icon name="folder" size={15} />
        {t('projects.open')}
      </button>
      <button type="button" className="pj-row-del" aria-label={t('projects.delete')} title={t('projects.delete')} onClick={onDelete}>
        <Icon name="trash" size={15} />
      </button>
    </div>
  );
}
