import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

// Only 'en' seeded so far — the source Angular app's other locale JSON
// (hi/mr/... — see migration guide §3's locales/ note) gets ported module by
// module, alongside the strings each module actually introduces.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
