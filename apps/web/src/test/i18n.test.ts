import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
import en from '../locales/en.json';

describe('i18n', () => {
  it('initializes with English as the active and fallback language', () => {
    expect(i18n.language).toBe('en');
    expect(i18n.options.fallbackLng).toEqual(['en']);
  });

  it('loads the en translation bundle as a resource bundle', () => {
    expect(i18n.getResourceBundle('en', 'translation')).toEqual(en);
  });

  it('does not escape interpolated values (React already escapes on render)', () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(false);
  });
});
