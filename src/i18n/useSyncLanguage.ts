import { useEffect } from 'react';
import i18n from '.';
import { useProjectStore } from '../state/projectStore';

/** Keeps i18next's active language in sync with the project's language setting. */
export function useSyncLanguage() {
  const language = useProjectStore((s) => s.project.settings.language);

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);
}
