import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../state/projectStore';
import { Icon } from '../../components/Icon';
import { generateProjectPdf } from './exportPdf';
import { PRINT_SCOPES, type PrintScope } from './printScope';

export function ExportPanel({
  scope,
  onScopeChange,
  onPrint,
}: {
  scope: PrintScope;
  onScopeChange: (scope: PrintScope) => void;
  onPrint: () => void;
}) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const [isExporting, setIsExporting] = useState(false);

  async function handleDownloadPdf() {
    setIsExporting(true);
    try {
      const bytes = await generateProjectPdf(project, scope);
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = scope === 'both' ? '' : `-${scope}`;
      a.download = `${project.name || 'karty'}${suffix}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="export-panel">
      <h2>
        <Icon name="printer" size={15} />
        {t('exportPanel.title')}
      </h2>
      <p className="upload-hint">{t('exportPanel.hint')}</p>

      <label className="field">
        <span>{t('exportPanel.scope')}</span>
        <select value={scope} onChange={(e) => onScopeChange(e.target.value as PrintScope)}>
          {PRINT_SCOPES.map((s) => (
            <option key={s} value={s}>
              {t(`exportPanel.scopes.${s}`)}
            </option>
          ))}
        </select>
      </label>
      {scope !== 'both' && <p className="upload-hint">{t('exportPanel.scopeHint')}</p>}

      <div className="toolbar-group">
        <button type="button" disabled={isExporting} onClick={() => void handleDownloadPdf()}>
          <Icon name="file-pdf" size={15} />
          {isExporting ? t('exportPanel.generating') : t('exportPanel.downloadPdf')}
        </button>
        <button type="button" className="primary" onClick={onPrint}>
          <Icon name="printer" size={15} />
          {t('exportPanel.print')}
        </button>
      </div>
    </div>
  );
}
