import type { ApiError } from '@ezazi/api-client';
import { getApiErrorBanner } from '../apiErrorBanner';

// Fake translator: returns the key itself (with any interpolated options
// appended) so assertions can check exactly which key/namespace was hit,
// without needing a real i18next instance.
const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}|${JSON.stringify(options)}` : key;

const baseError: ApiError = { name: 'ApiError', kind: 'unauthorized', status: 401, code: undefined, message: 'oops' };

describe('getApiErrorBanner', () => {

  it('maps INVALID_CREDENTIALS to the namespaced invalidCredentials banner', () => {
    const error: ApiError = { ...baseError, code: 'INVALID_CREDENTIALS' };
    expect(getApiErrorBanner(error, t, 'setup.errors')).toEqual({
      title: 'setup.errors.invalidCredentials.title',
      message: 'setup.errors.invalidCredentials.message',
    });
  });

  it('respects a different namespace for the same error code (login vs setup)', () => {
    const error: ApiError = { ...baseError, code: 'INVALID_CREDENTIALS' };
    expect(getApiErrorBanner(error, t, 'login.errors')).toEqual({
      title: 'login.errors.invalidCredentials.title',
      message: 'login.errors.invalidCredentials.message',
    });
  });

  it('maps ACCOUNT_LOCKED with a retry time to accountLocked, interpolating minutes', () => {
    const error: ApiError = { ...baseError, code: 'ACCOUNT_LOCKED', details: { retryAfterSeconds: 125 } };
    const banner = getApiErrorBanner(error, t, 'setup.errors');
    expect(banner.title).toBe('setup.errors.accountLocked.title|{"minutes":3}');
  });

  it('maps ACCOUNT_LOCKED without a retry time to accountLockedGeneric', () => {
    const error: ApiError = { ...baseError, code: 'ACCOUNT_LOCKED' };
    expect(getApiErrorBanner(error, t, 'setup.errors')).toEqual({
      title: 'setup.errors.accountLockedGeneric.title',
      message: 'setup.errors.accountLockedGeneric.message',
    });
  });

  it('maps RATE_LIMITED to the rateLimited banner', () => {
    const error: ApiError = { ...baseError, code: 'RATE_LIMITED' };
    expect(getApiErrorBanner(error, t, 'login.errors')).toEqual({
      title: 'login.errors.rateLimited.title',
      message: 'login.errors.rateLimited.message',
    });
  });

  it('maps VALIDATION_ERROR to the generic title with the server message as the subtitle', () => {
    const error: ApiError = { ...baseError, code: 'VALIDATION_ERROR', message: 'Field X is required' };
    expect(getApiErrorBanner(error, t, 'setup.errors')).toEqual({
      title: 'setup.errors.genericError.title',
      message: 'Field X is required',
    });
  });

  it('falls back to the generic message when VALIDATION_ERROR has no server message', () => {
    const error: ApiError = { ...baseError, code: 'VALIDATION_ERROR', message: '' };
    expect(getApiErrorBanner(error, t, 'setup.errors')).toEqual({
      title: 'setup.errors.genericError.title',
      message: 'setup.errors.genericError.message',
    });
  });

  it('maps a network-kind error with no code to networkError, flagged for the network banner variant', () => {
    const error: ApiError = { name: 'ApiError', kind: 'network', status: 0, code: undefined, message: 'Network Error' };
    expect(getApiErrorBanner(error, t, 'login.errors')).toEqual({
      title: 'login.errors.networkError.title',
      message: 'login.errors.networkError.message',
      variant: 'network',
    });
  });

  it('maps a timeout-kind error with no code to networkError, flagged for the network banner variant', () => {
    const error: ApiError = { name: 'ApiError', kind: 'timeout', status: 0, code: undefined, message: 'timed out' };
    expect(getApiErrorBanner(error, t, 'setup.errors')).toEqual({
      title: 'setup.errors.networkError.title',
      message: 'setup.errors.networkError.message',
      variant: 'network',
    });
  });

  it('falls back to genericError for anything else', () => {
    const error: ApiError = { name: 'ApiError', kind: 'unauthorized', status: 500, code: undefined, message: 'boom' };
    expect(getApiErrorBanner(error, t, 'setup.errors')).toEqual({
      title: 'setup.errors.genericError.title',
      message: 'setup.errors.genericError.message',
    });
  });

});
