import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from '../locales/en';
import { sw } from '../locales/sw';

const STORE_KEY = 'zala.lang';

const stored = (() => {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
})();

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: en as never,
      sw: sw as never,
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'sw'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'predict', 'history', 'stats', 'settings', 'about', 'errors', 'landing', 'engine', 'billing', 'member', 'locked', 'admin'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: STORE_KEY,
    },
    lng: stored ?? undefined,
  });

export function setDocumentLang(lng: string) {
  document.documentElement.lang = lng;
  document.documentElement.dir = 'ltr';
}

setDocumentLang(i18n.language || 'en');

export default i18n;
