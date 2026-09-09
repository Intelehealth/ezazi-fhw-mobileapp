import axios, { AxiosError } from 'axios';
import { ApiError, ApiErrorOptions, NetworkError, ServerError, TimeoutError, UnauthorizedError } from './ApiError';

/** The `{ error: { code, message, details } }` shape the backend uses for business errors. */
interface BackendErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

function extractErrorBody(data: unknown): BackendErrorBody | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const err = (data as Record<string, unknown>).error;
  if (!err || typeof err !== 'object') return undefined;
  const e = err as Record<string, unknown>;
  return {
    code: typeof e.code === 'string' ? e.code : undefined,
    message: typeof e.message === 'string' ? e.message : undefined,
    details: e.details,
  };
}

/**
 * Central status-code → error mapping (mirrors the architecture doc's §6 table).
 * 400/403/404/423/429 stay a generic ApiError carrying `status` (+ the backend's
 * own `code`/`details` when present) rather than a class each — callers that
 * care branch on `.code`/`.status`, keeping the class hierarchy to the cases
 * the doc's own Result model (§7) actually names.
 */
export function mapAxiosError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError('api', error instanceof Error ? error.message : String(error), { cause: error });
  }

  const axiosError = error as AxiosError;

  if (axiosError.code === 'ECONNABORTED') {
    return new TimeoutError(undefined, { code: axiosError.code, cause: axiosError });
  }

  if (!axiosError.response) {
    return new NetworkError(axiosError.message, { code: axiosError.code, cause: axiosError });
  }

  const { status } = axiosError.response;
  const body = extractErrorBody(axiosError.response.data);
  const message = body?.message ?? `Request failed with status ${status}`;
  const options: ApiErrorOptions = { status, code: body?.code, details: body?.details, cause: axiosError };

  if (status === 401) {
    return new UnauthorizedError(body?.message, options);
  }

  if (status === 408) {
    return new TimeoutError(message, options);
  }

  if (status >= 500) {
    return new ServerError(message, options);
  }

  return new ApiError('api', message, options);
}
