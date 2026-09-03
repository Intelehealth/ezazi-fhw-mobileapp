import axios, { AxiosError } from 'axios';
import { ApiError, NetworkError, ServerError, TimeoutError, UnauthorizedError } from './ApiError';

/**
 * Central status-code → error mapping (mirrors the architecture doc's §6 table).
 * 400/403/404/429 stay a generic ApiError carrying `status` rather than a class
 * each — callers that care branch on `.status`, keeping the class hierarchy to
 * the cases the doc's own Result model (§7) actually names.
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

  if (status === 401) {
    return new UnauthorizedError(undefined, { cause: axiosError });
  }

  if (status === 408) {
    return new TimeoutError(`Request timed out (status ${status})`, { status, cause: axiosError });
  }

  if (status >= 500) {
    return new ServerError(`Server returned ${status}`, { status, cause: axiosError });
  }

  return new ApiError('api', `Request failed with status ${status}`, { status, cause: axiosError });
}
