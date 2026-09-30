// Polyfill Intl.PluralRules before anything else so i18next does not fall back
// to compatibilityJSON v3. Required because Hermes in Expo Go ships without
// full ICU data, leaving Intl.PluralRules undefined at runtime.
import 'intl-pluralrules';

// `expo/AppEntry`'s hardcoded `../../App` import breaks once node_modules is
// hoisted to the monorepo root, so register the root component directly.
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
