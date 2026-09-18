import type { ApiError } from '../errors/ApiError';

export interface Success<T> {
  readonly ok: true;
  readonly data: T;
}

export interface Failure {
  readonly ok: false;
  readonly error: ApiError;
}

/** The one contract every API method returns — callers never need try/catch. */
export type ApiResult<T> = Success<T> | Failure;

export function success<T>(data: T): Success<T> {
  return { ok: true, data };
}

export function failure(error: ApiError): Failure {
  return { ok: false, error };
}

export function isSuccess<T>(result: ApiResult<T>): result is Success<T> {
  return result.ok;
}

export function isFailure<T>(result: ApiResult<T>): result is Failure {
  return !result.ok;
}
