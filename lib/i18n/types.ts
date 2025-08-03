export interface TranslationFile {
  [key: string]: string | TranslationFile;
}

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
}

export interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
  isRTL: boolean;
  availableLocales: LocaleConfig[];
}

export interface I18nProviderProps {
  children: React.ReactNode;
  defaultLocale?: string;
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24h',
  },
];

export const DEFAULT_LOCALE = 'en';
export const FALLBACK_LOCALE = 'en';