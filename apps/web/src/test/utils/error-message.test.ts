import { describe, expect, it } from 'vitest';
import {
  ApiError,
  NetworkError,
  ServerError,
  TimeoutError,
  UnauthorizedError,
} from '@ezazi/api-client';
import { getApiErrorMessage, getErrorMessage } from '../../utils/error-message';

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

describe('getApiErrorMessage', () => {
  it.each([
    [
      new NetworkError(),
      'Unable to reach the server. Check your internet connection and try again.',
    ],
    [
      new TimeoutError(),
      'The server is taking too long to respond. Please try again.',
    ],
    [
      new ServerError('Internal server error'),
      'The server ran into a problem. Please try again in a moment.',
    ],
    [
      new UnauthorizedError(),
      'Your session has expired. Please sign in again.',
    ],
  ])('explains a %s in plain words', (error, expected) => {
    expect(getApiErrorMessage(error, 'fallback')).toBe(expected);
  });

  it("uses the backend's own message for any other API error", () => {
    expect(
      getApiErrorMessage(
        new ApiError('api', 'Invalid input', { status: 400 }),
        'fallback'
      )
    ).toBe('Invalid input');
  });

  it('falls back for a blank message or a non-error value', () => {
    expect(getApiErrorMessage(new ApiError('api', '[null]'), 'fallback')).toBe(
      'fallback'
    );
    expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
