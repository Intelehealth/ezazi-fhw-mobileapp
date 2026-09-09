import type { TFunction } from 'i18next';
import { ApiError } from '@/services/api/errors/ApiError';
import { mapAuthApiError } from '../authErrorMapping';

// A trivial `t` that returns the caller-supplied fallback verbatim, with
// {{param}} interpolation so the accountLocked-with-minutes branch is easy
// to assert on.
const t: TFunction = ((key: string, params?: Record<string, unknown>) => {
  const raw = String(params?.defaultValue ?? key);
  return raw.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(params?.[k] ?? ''));
}) as unknown as TFunction;

const apiErr = (code: string, details?: unknown, message = ''): ApiError =>
  new ApiError('api', message || code, { code, details });

describe('mapAuthApiError', () => {
  it('maps AUTH_INVALID_CREDENTIALS to the Figma "incorrect" banner', () => {
    const r = mapAuthApiError(apiErr('AUTH_INVALID_CREDENTIALS'), { t });
    expect(r).toEqual({
      title: 'Username or password is incorrect',
      subtitle: 'Please check your credentials and try again.',
    });
  });

  it('legacy INVALID_CREDENTIALS also maps to the incorrect banner', () => {
    const r = mapAuthApiError(apiErr('INVALID_CREDENTIALS'), { t });
    expect(r?.title).toBe('Username or password is incorrect');
  });

  it('ACCOUNT_LOCKED with retryAfterSeconds interpolates minutes', () => {
    const r = mapAuthApiError(
      apiErr('ACCOUNT_LOCKED', { retryAfterSeconds: 900 }),
      { t },
    );
    expect(r?.title).toBe('Account temporarily locked');
    expect(r?.subtitle).toBe('Too many failed attempts. Try again in 15 minutes.');
  });

  it('ACCOUNT_LOCKED without minutes uses the generic subtitle', () => {
    const r = mapAuthApiError(apiErr('ACCOUNT_LOCKED'), { t });
    expect(r?.subtitle).toBe('Too many failed attempts. Please try again later.');
  });

  it('rounds up retryAfterSeconds to whole minutes (61s → 2min)', () => {
    const r = mapAuthApiError(
      apiErr('ACCOUNT_LOCKED', { retryAfterSeconds: 61 }),
      { t },
    );
    expect(r?.subtitle).toContain('2 minutes');
  });

  it('AUTH_003 is the same as ACCOUNT_LOCKED', () => {
    const r = mapAuthApiError(apiErr('AUTH_003'), { t });
    expect(r?.title).toBe('Account temporarily locked');
  });

  it('BIZ_001 asks the doctor to use the web portal', () => {
    const r = mapAuthApiError(apiErr('BIZ_001'), { t });
    expect(r?.title).toBe('Use the web portal');
    expect(r?.subtitle).toContain('Doctor');
  });

  it('OTP_INVALID and OTP_EXPIRED map to distinct copy', () => {
    const invalid = mapAuthApiError(apiErr('OTP_INVALID'), { t });
    const expired = mapAuthApiError(apiErr('OTP_EXPIRED'), { t });
    expect(invalid?.title).toBe('Wrong code');
    expect(expired?.title).toBe('Code expired');
  });

  it('OTP_TOKEN_EXPIRED aliases OTP_EXPIRED', () => {
    const r = mapAuthApiError(apiErr('OTP_TOKEN_EXPIRED'), { t });
    expect(r?.title).toBe('Code expired');
  });

  it('VALIDATION_ERROR surfaces the server-provided message when present', () => {
    const r = mapAuthApiError(apiErr('VALIDATION_ERROR', {}, 'phone is required'), { t });
    expect(r?.title).toBe('phone is required');
    expect(r?.subtitle).toBeUndefined();
  });

  it('VALIDATION_ERROR falls back to the generic banner if no message', () => {
    const r = mapAuthApiError(apiErr('VALIDATION_ERROR'), { t });
    expect(r?.title).toBe('Something went wrong');
  });

  it('Native network Error maps to the offline banner', () => {
    const r = mapAuthApiError(new Error('Network request failed'), { t });
    expect(r?.title).toBe('No internet connection');
  });

  it('Timeout Error is also treated as the offline banner', () => {
    const r = mapAuthApiError(new Error('Request timeout'), { t });
    expect(r?.title).toBe('No internet connection');
  });

  it('Unknown ApiError code falls through to the generic banner', () => {
    const r = mapAuthApiError(apiErr('SOME_UNMAPPED_CODE'), { t });
    expect(r?.title).toBe('Something went wrong');
  });

  it('Plain non-Error input still yields the generic banner', () => {
    const r = mapAuthApiError({ nothing: true }, { t });
    expect(r?.title).toBe('Something went wrong');
  });
});
