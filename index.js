// Polyfill Intl.PluralRules before anything else so i18next does not fall back
// to compatibilityJSON v3. Required because Hermes in Expo Go ships without
// full ICU data, leaving Intl.PluralRules undefined at runtime.
import 'intl-pluralrules';

// Hand off to the standard Expo entry (registers the root App component).
import 'expo/AppEntry';
