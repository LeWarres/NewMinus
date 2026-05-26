import { CONTENT_LANGUAGE_CODES } from '../../shared/options/language-options';
import { READING_LANGUAGE_OPTIONS } from '../../shared/options/profile-options';
import type { ReadingLanguageOption } from '../../shared/options/profile-options';

export const GLOBAL_LANGUAGE = 'GLOBAL';

export const GLOBAL_LANGUAGE_OPTION: ReadingLanguageOption = {
  value: GLOBAL_LANGUAGE,
  labelKey: 'common.languages.global',
  nativeLabel: 'Global'
};

export const CHAPTER_LANGUAGE_OPTIONS: ReadingLanguageOption[] = [
  GLOBAL_LANGUAGE_OPTION,
  ...READING_LANGUAGE_OPTIONS
];

export function isChapterLanguageCode(value?: string | null): boolean {
  const normalized = String(value || '').trim().toUpperCase();

  return normalized === GLOBAL_LANGUAGE ||
    CONTENT_LANGUAGE_CODES.includes(normalized as any);
}
