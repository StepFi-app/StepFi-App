import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import en from './en.json';
import fr from './fr.json';
import pt from './pt.json';

const LANG_KEY = 'stepfi_language';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    let lang: string | null = null;
    try {
      if (Platform.OS === 'web') {
        lang = localStorage.getItem(LANG_KEY);
      } else {
        lang = await SecureStore.getItemAsync(LANG_KEY);
      }
    } catch {}
    if (!lang) {
      try {
        const locales = getLocales();
        lang = locales?.[0]?.languageCode ?? 'en';
      } catch {
        lang = 'en';
      }
    }
    callback(lang ?? 'en');
  },
  init: () => {},
  cacheUserLanguage: async (lang: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(LANG_KEY, lang);
      } else {
        await SecureStore.setItemAsync(LANG_KEY, lang);
      }
    } catch {}
  },
};

const initPromise = i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      pt: { translation: pt },
    },
    interpolation: {
      escapeValue: false,
      format: (value: unknown, format?: string, lng?: string) => {
        if (format === 'number') {
          return new Intl.NumberFormat(lng).format(value as number);
        }
        if (format === 'currency') {
          return new Intl.NumberFormat(lng, {
            style: 'currency',
            currency: 'USD',
          }).format(value as number);
        }
        if (format === 'dateShort') {
          return new Intl.DateTimeFormat(lng, {
            month: 'short',
            day: 'numeric',
          }).format(value as Date);
        }
        if (format === 'dateLong') {
          return new Intl.DateTimeFormat(lng, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }).format(value as Date);
        }
        if (format === 'dateFull') {
          return new Intl.DateTimeFormat(lng, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(value as Date);
        }
        return value;
      },
    } as any,
    react: {
      useSuspense: false,
    },
    returnObjects: true,
    returnNull: false,
  });

export function formatCurrency(amount: number): string {
  const lng = i18n.language ?? 'en';
  return new Intl.NumberFormat(lng, {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date, format: 'short' | 'long' | 'full'): string {
  const lng = i18n.language ?? 'en';
  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { month: 'short', day: 'numeric' }
      : format === 'long'
        ? { weekday: 'long', month: 'long', day: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };
  return new Intl.DateTimeFormat(lng, options).format(date);
}

export function isRTL(language?: string): boolean {
  const lang = (language ?? i18n.language ?? 'en').split('-')[0];
  return ['ar', 'he', 'fa', 'ur'].includes(lang);
}

export { initPromise };
export default i18n;
