import { describe, it, expect } from 'vitest';
import { mapAxiosError } from '../mapAxiosError';
import { ApiError, NetworkError, ServerError, TimeoutError, UnauthorizedError } from '../ApiError';

function axiosError(overrides: Record<string, unknown>) {
  return { isAxiosError: true, message: 'Request failed', ...overrides };
}

describe('mapAxiosError', () => {

  // ── Non-axios errors ────────────────────────────────────────────────────

  it('maps a non-axios error to a generic ApiError', () => {
    const result = mapAxiosError(new Error('plain failure'));
    expect(result).toBeInstanceOf(ApiError);
    expect(result.kind).toBe('api');
    expect(result.message).toBe('plain failure');
  });

  // ── Timeout ──────────────────────────────────────────────────────────────

  it('maps ECONNABORTED to TimeoutError', () => {
    const result = mapAxiosError(axiosError({ code: 'ECONNABORTED' }));
    expect(result).toBeInstanceOf(TimeoutError);
    expect(result.kind).toBe('timeout');
  });

  it('maps HTTP 408 to TimeoutError', () => {
    const result = mapAxiosError(axiosError({ response: { status: 408 } }));
    expect(result).toBeInstanceOf(TimeoutError);
    expect(result.status).toBe(408);
  });

  // ── Network ──────────────────────────────────────────────────────────────

  it('maps a missing response to NetworkError', () => {
    const result = mapAxiosError(axiosError({ message: 'Network Error' }));
    expect(result).toBeInstanceOf(NetworkError);
    expect(result.kind).toBe('network');
  });

  // ── Unauthorized ─────────────────────────────────────────────────────────

  it('maps HTTP 401 to UnauthorizedError', () => {
    const result = mapAxiosError(axiosError({ response: { status: 401 } }));
    expect(result).toBeInstanceOf(UnauthorizedError);
    expect(result.status).toBe(401);
  });

  // ── Server ───────────────────────────────────────────────────────────────

  it.each([500, 502, 503])('maps HTTP %d to ServerError', (status) => {
    const result = mapAxiosError(axiosError({ response: { status } }));
    expect(result).toBeInstanceOf(ServerError);
    expect(result.status).toBe(status);
  });

  // ── Generic 4xx (status carried on the plain ApiError) ──────────────────

  it.each([400, 403, 404, 429])('maps HTTP %d to a generic ApiError carrying the status', (status) => {
    const result = mapAxiosError(axiosError({ response: { status } }));
    expect(result).toBeInstanceOf(ApiError);
    expect(result.kind).toBe('api');
    expect(result.status).toBe(status);
  });

  // ── Backend business-error body: { error: { code, message, details } } ────

  it('carries the backend code/message/details for a 400 validation error', () => {
    const result = mapAxiosError(axiosError({
      response: {
        status: 400,
        data: { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: { field: 'username' } } },
      },
    }));
    expect(result.kind).toBe('api');
    expect(result.status).toBe(400);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('Invalid input');
    expect(result.details).toEqual({ field: 'username' });
  });

  it('carries the backend code/message for a 401 invalid-credentials error', () => {
    const result = mapAxiosError(axiosError({
      response: {
        status: 401,
        data: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } },
      },
    }));
    expect(result).toBeInstanceOf(UnauthorizedError);
    expect(result.code).toBe('INVALID_CREDENTIALS');
    expect(result.message).toBe('Invalid username or password');
  });

  it('carries retryAfterSeconds in details for a 423 account-locked error', () => {
    const result = mapAxiosError(axiosError({
      response: {
        status: 423,
        data: {
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account is temporarily locked after too many failed attempts',
            details: { retryAfterSeconds: 900 },
          },
        },
      },
    }));
    expect(result.kind).toBe('api');
    expect(result.status).toBe(423);
    expect(result.code).toBe('ACCOUNT_LOCKED');
    expect(result.details).toEqual({ retryAfterSeconds: 900 });
  });

  it('carries the backend code for a 429 rate-limited error', () => {
    const result = mapAxiosError(axiosError({
      response: { status: 429, data: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' } } },
    }));
    expect(result.code).toBe('RATE_LIMITED');
    expect(result.message).toBe('Too many attempts, please try again later');
  });

  it('carries the backend code for a 500 internal error', () => {
    const result = mapAxiosError(axiosError({
      response: { status: 500, data: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } } },
    }));
    expect(result).toBeInstanceOf(ServerError);
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.message).toBe('Internal server error');
  });

  it('falls back to the generic message when the body has no error object', () => {
    const result = mapAxiosError(axiosError({ response: { status: 400, data: { unexpected: true } } }));
    expect(result.code).toBeUndefined();
    expect(result.message).toBe('Request failed with status 400');
  });

  it('falls back to the generic message when there is no response body at all', () => {
    const result = mapAxiosError(axiosError({ response: { status: 400 } }));
    expect(result.code).toBeUndefined();
    expect(result.message).toBe('Request failed with status 400');
  });

});
