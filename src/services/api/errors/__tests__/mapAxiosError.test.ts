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

});
