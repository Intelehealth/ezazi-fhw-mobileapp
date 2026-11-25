import { describe, it, expect } from 'vitest';
import { filterDigits, filterFreeText } from '../textInput';

describe('filterFreeText (Android FirstLetterUpperCaseInputFilter)', () => {
  it('upper-cases the first character', () => {
    expect(filterFreeText('dr. sharma')).toBe('Dr. sharma');
    expect(filterFreeText('plasma')).toBe('Plasma');
  });

  it('keeps ASCII letters, digits, punctuation and space', () => {
    expect(filterFreeText('Dr. A-1 (ICU), #2: "ok"!')).toBe('Dr. A-1 (ICU), #2: "ok"!');
    expect(filterFreeText('a!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~')).toBe('A!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
  });

  it('drops anything else: Devanagari, accents, emoji, tabs and line breaks', () => {
    expect(filterFreeText('डॉ Sharma')).toBe(' Sharma');
    expect(filterFreeText('José')).toBe('Jos');
    expect(filterFreeText('ok 👍')).toBe('Ok ');
    expect(filterFreeText('a\tb\nc')).toBe('Abc');
  });

  it('upper-cases the first kept character when the text starts with a dropped one', () => {
    expect(filterFreeText('éabc')).toBe('Abc');
  });

  it('leaves empty text empty', () => {
    expect(filterFreeText('')).toBe('');
    expect(filterFreeText('डॉ')).toBe('');
  });
});

describe('filterDigits (Android android:digits="1234567890")', () => {
  it('keeps only the digits', () => {
    expect(filterDigits('2 tabs')).toBe('2');
    expect(filterDigits('1.5')).toBe('15');
    expect(filterDigits('')).toBe('');
  });
});

