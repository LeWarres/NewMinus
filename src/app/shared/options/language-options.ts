export const CONTENT_LANGUAGE_CODES = [
  'ES',
  'EN',
  'JA',
  'KO',
  'ZH',
  'FR',
  'DE',
  'PT',
  'IT',
  'RU',
  'AR',
  'HI',
  'ID',
  'VI',
  'TH',
  'TR',
  'PL',
  'NL'
] as const;

export const CONTENT_LOCALE_MAP: Record<string, string> = {
  es: 'es',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  zh: 'zh',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  it: 'it',
  ru: 'ru',
  ar: 'ar',
  hi: 'hi',
  id: 'id',
  vi: 'vi',
  th: 'th',
  tr: 'tr',
  pl: 'pl',
  nl: 'nl'
};

export function getContentLanguageCode(language?: string | null): string {
  const normalized = String(language || '')
    .trim()
    .toUpperCase();

  return CONTENT_LANGUAGE_CODES.includes(normalized as any)
    ? normalized
    : 'EN';
}

export function getContentLocale(language?: string | null): string {
  const normalized = String(language || 'en')
    .trim()
    .toLowerCase();

  return CONTENT_LOCALE_MAP[normalized] || 'en';
}
