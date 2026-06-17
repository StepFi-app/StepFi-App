import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useCallback } from 'react';
import i18n from '../src/locales/i18n';

export function useTranslation() {
  const { t, i18n: i18nInstance } = useI18nTranslation();

  const changeLanguage = useCallback(
    async (lang: string) => {
      await i18nInstance.changeLanguage(lang);
    },
    [i18nInstance],
  );

  const currentLanguage = i18nInstance.language?.split('-')[0] ?? 'en';
  const rtl = ['ar', 'he', 'fa', 'ur'].includes(currentLanguage);

  return { t, i18n: i18nInstance, changeLanguage, currentLanguage, isRTL: rtl };
}

export { i18n };
