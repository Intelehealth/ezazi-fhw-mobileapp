/**
 * Discriminated error kinds for the common API client. `kind` is the contract
 * callers switch on (safe across bundler/HMR reloads); the classes below exist
 * for stack traces and logging, not for instanceof-based branching.
 */
export type ApiErrorKind = 'network' | 'timeout' | 'unauthorized' | 'server' | 'api';

export interface ApiErrorOptions {
  status?: number;
  code?: string;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly cause?: unknown;

  constructor(kind: ApiErrorKind, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options.status;
    this.code = options.code;
    this.cause = options.cause;
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network error — no response received', options: ApiErrorOptions = {}) {
    super('network', message, options);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor(message = 'Request timed out', options: ApiErrorOptions = {}) {
    super('timeout', message, options);
    this.name = 'TimeoutError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', options: ApiErrorOptions = {}) {
    super('unauthorized', message, { status: 401, ...options });
    this.name = 'UnauthorizedError';
  }
}

export class ServerError extends ApiError {
  constructor(message = 'Server error', options: ApiErrorOptions = {}) {
    super('server', message, options);
    this.name = 'ServerError';
  }
}
