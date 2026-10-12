import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '../../utils/error-message';

describe('getErrorMessage', () => {
  it("returns the error's own message when it says something", () => {
    expect(getErrorMessage(new Error('OpenMRS unreachable'), 'fallback')).toBe(
      'OpenMRS unreachable'
    );
  });

  it.each([
    '',
    '   ',
    '[null]',
    '[ null ]',
    'null',
    'undefined',
    '[]',
    '[NULL]',
  ])('falls back when the message is the blank-looking %j', message => {
    expect(getErrorMessage(new Error(message), 'fallback')).toBe('fallback');
  });

  it('keeps a message that merely contains the word null', () => {
    expect(getErrorMessage(new Error('Value is null'), 'fallback')).toBe(
      'Value is null'
    );
  });

  it('falls back for a value that is not an Error', () => {
    expect(getErrorMessage('boom', 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
