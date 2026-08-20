export const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'cs', label: 'CZ' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: Language = 'en';

/** The next language when cycling through the toggle in the top bar. */
export function nextLanguage(current: Language): Language {
  const idx = LANGUAGES.findIndex((l) => l.code === current);
  return LANGUAGES[(idx + 1) % LANGUAGES.length].code;
}

export function languageLabel(code: Language): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}
