import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { clientConfig } from '@/core/config/clients';
import en from './locales/en.json';
import hi from './locales/hi.json';
import ne from './locales/ne.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ne: { translation: ne },
} as const;

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? clientConfig.locale;

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLocale in resources ? deviceLocale : clientConfig.locale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export { i18n };
