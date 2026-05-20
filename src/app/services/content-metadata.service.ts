import { Injectable } from '@angular/core';
import { TranslationService } from './translation.service';

export interface ContentLanguageOption {
  value: string;
  label: string;
  nativeLabel: string;
  shortLabel: string;
  flagUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContentMetadataService {
  private siteUrl = 'https://minuscreators.com';

  private flagBasePath = 'flags';

  private languageOrder = [
    'GLOBAL',
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
  ];

  private categoryFallbacks: Record<string, { es: string; en: string }> = {
    'accion': { es: 'Acción', en: 'Action' },
    'aventura': { es: 'Aventura', en: 'Adventure' },
    'comedia': { es: 'Comedia', en: 'Comedy' },
    'drama': { es: 'Drama', en: 'Drama' },
    'fantasia': { es: 'Fantasía', en: 'Fantasy' },
    'romance': { es: 'Romance', en: 'Romance' },
    'terror': { es: 'Terror', en: 'Horror' },
    'ciencia-ficcion': { es: 'Ciencia ficción', en: 'Sci-Fi' },
    'misterio': { es: 'Misterio', en: 'Mystery' },
    'suspenso': { es: 'Suspenso', en: 'Thriller' },
    'sobrenatural': { es: 'Sobrenatural', en: 'Supernatural' },
    'psicologico': { es: 'Psicológico', en: 'Psychological' },
    'slice-of-life': { es: 'Slice of life', en: 'Slice of life' },
    'vida-escolar': { es: 'Vida escolar', en: 'School life' },
    'deportes': { es: 'Deportes', en: 'Sports' },
    'artes-marciales': { es: 'Artes marciales', en: 'Martial arts' },
    'mecha': { es: 'Mecha', en: 'Mecha' },
    'isekai': { es: 'Isekai', en: 'Isekai' },
    'historico': { es: 'Histórico', en: 'Historical' },
    'musica': { es: 'Música', en: 'Music' },
    'cocina': { es: 'Cocina', en: 'Cooking' },
    'magia': { es: 'Magia', en: 'Magic' },
    'superheroes': { es: 'Superhéroes', en: 'Superheroes' },
    'crimen': { es: 'Crimen', en: 'Crime' },
    'post-apocaliptico': { es: 'Post-apocalíptico', en: 'Post-apocalyptic' },
    'cyberpunk': { es: 'Cyberpunk', en: 'Cyberpunk' },
    'steampunk': { es: 'Steampunk', en: 'Steampunk' },
    'guerra': { es: 'Guerra', en: 'War' },
    'parodia': { es: 'Parodia', en: 'Parody' },
    'tragedia': { es: 'Tragedia', en: 'Tragedy' },
    'shonen': { es: 'Shonen', en: 'Shonen' },
    'shojo': { es: 'Shojo', en: 'Shojo' },
    'seinen': { es: 'Seinen', en: 'Seinen' },
    'josei': { es: 'Josei', en: 'Josei' },
    'kodomo': { es: 'Kodomo', en: 'Kodomo' },
    'boys-love': { es: 'Boys Love', en: 'Boys Love' },
    'girls-love': { es: 'Girls Love', en: 'Girls Love' },
    'nsfw': { es: 'NSFW', en: 'NSFW' }
  };

  private languageFallbacks: Record<string, { es: string; en: string }> = {
    GLOBAL: { es: 'Global', en: 'Global' },
    ES: { es: 'Español', en: 'Spanish' },
    EN: { es: 'Inglés', en: 'English' },
    JA: { es: 'Japonés', en: 'Japanese' },
    KO: { es: 'Coreano', en: 'Korean' },
    ZH: { es: 'Chino', en: 'Chinese' },
    FR: { es: 'Francés', en: 'French' },
    DE: { es: 'Alemán', en: 'German' },
    PT: { es: 'Portugués', en: 'Portuguese' },
    IT: { es: 'Italiano', en: 'Italian' },
    RU: { es: 'Ruso', en: 'Russian' },
    AR: { es: 'Árabe', en: 'Arabic' },
    HI: { es: 'Hindi', en: 'Hindi' },
    ID: { es: 'Indonesio', en: 'Indonesian' },
    VI: { es: 'Vietnamita', en: 'Vietnamese' },
    TH: { es: 'Tailandés', en: 'Thai' },
    TR: { es: 'Turco', en: 'Turkish' },
    PL: { es: 'Polaco', en: 'Polish' },
    NL: { es: 'Neerlandés', en: 'Dutch' }
  };

  private nativeLanguageLabels: Record<string, string> = {
    GLOBAL: 'Global',
    ES: 'Español',
    EN: 'English',
    JA: '日本語',
    KO: '한국어',
    ZH: '中文',
    FR: 'Français',
    DE: 'Deutsch',
    PT: 'Português',
    IT: 'Italiano',
    RU: 'Русский',
    AR: 'العربية',
    HI: 'हिन्दी',
    ID: 'Bahasa Indonesia',
    VI: 'Tiếng Việt',
    TH: 'ไทย',
    TR: 'Türkçe',
    PL: 'Polski',
    NL: 'Nederlands'
  };

  private flagFiles: Record<string, string> = {
    GLOBAL: 'un.svg',
    ES: 'es.svg',
    EN: 'us.svg',
    JA: 'jp.svg',
    KO: 'kr.svg',
    ZH: 'cn.svg',
    FR: 'fr.svg',
    DE: 'de.svg',
    PT: 'br.svg',
    IT: 'it.svg',
    RU: 'ru.svg',
    AR: 'sa.svg',
    HI: 'in.svg',
    ID: 'id.svg',
    VI: 'vn.svg',
    TH: 'th.svg',
    TR: 'tr.svg',
    PL: 'pl.svg',
    NL: 'nl.svg'
  };

  constructor(
    private translationService: TranslationService
  ) {}

  getAvailableLanguages(includeGlobal = false): ContentLanguageOption[] {
    return this.languageOrder
      .filter(value => includeGlobal || value !== 'GLOBAL')
      .map(value => ({
        value,
        label: this.getLanguageLabel(value),
        nativeLabel: this.getLanguageNativeLabel(value),
        shortLabel: value,
        flagUrl: this.getLanguageFlagUrl(value)
      }));
  }

  getCategoryValues(genero?: string, categorias?: string[]): string[] {
    if (categorias && categorias.length > 0) {
      return categorias
        .map(item => item.trim())
        .filter(Boolean);
    }

    if (!genero) {
      return [];
    }

    return genero
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  getMainCategoryLabel(genero?: string, categorias?: string[]): string {
    const values = this.getCategoryValues(genero, categorias);

    if (values.length === 0) {
      return this.translateWithFallback('Sin categoría', 'Sin categoría');
    }

    return this.getCategoryLabel(values[0]);
  }

  getExtraCategoryCount(genero?: string, categorias?: string[]): number {
    const values = this.getCategoryValues(genero, categorias);
    return Math.max(values.length - 1, 0);
  }

  getCategoryLabel(value?: string): string {
    if (!value) {
      return '';
    }

    const normalized = value.trim();
    const fallback = this.getCategoryFallback(normalized);

    return this.translateWithFallback(`categoria.${normalized}`, fallback);
  }

  getCategoryLabels(genero?: string, categorias?: string[], max: number = 3): string[] {
    return this.getCategoryValues(genero, categorias)
      .slice(0, max)
      .map(value => this.getCategoryLabel(value));
  }

  getLanguageLabel(value?: string): string {
    const normalized = this.normalizeLanguage(value);
    const fallback = this.getLanguageFallback(normalized);

    return this.translateWithFallback(`idioma.${normalized}`, fallback);
  }

  getLanguageNativeLabel(value?: string): string {
    const normalized = this.normalizeLanguage(value);
    return this.nativeLanguageLabels[normalized] || normalized;
  }

  getLanguageFlagUrl(value?: string): string {
    const normalized = this.normalizeLanguage(value);
    const fileName = this.flagFiles[normalized] || this.flagFiles['GLOBAL'];

    return `${this.flagBasePath}/${fileName}`;
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    const finalPath = path || fallback;

    if (finalPath.startsWith('http')) {
      return finalPath;
    }

    if (finalPath.startsWith('/')) {
      return finalPath;
    }

    return `${this.siteUrl}/${finalPath}`;
  }

  private normalizeLanguage(value?: string): string {
    if (!value) {
      return 'GLOBAL';
    }

    return value.trim().toUpperCase();
  }

  private getCurrentLanguage(): 'es' | 'en' {
    const language = this.translationService.getCurrentLanguage();
    return language === 'es' ? 'es' : 'en';
  }

  private getCategoryFallback(value: string): string {
    const language = this.getCurrentLanguage();
    return this.categoryFallbacks[value]?.[language] || value;
  }

  private getLanguageFallback(value: string): string {
    const language = this.getCurrentLanguage();
    return this.languageFallbacks[value]?.[language] || value;
  }

  private translateWithFallback(key: string, fallback: string): string {
    const translated = this.translationService.getTranslation(key);

    if (!translated || translated === key) {
      return fallback;
    }

    return translated;
  }
}