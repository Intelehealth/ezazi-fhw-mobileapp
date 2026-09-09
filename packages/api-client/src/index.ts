export { createApiClient } from './client/createApiClient';
export type { CreateApiClientOptions } from './client/createApiClient';
export { attachAuthInterceptor, attachUnauthorizedRetryInterceptor } from './client/interceptors';
export type { TokenProvider, UnauthorizedHandler } from './client/interceptors';

export { ApiError, NetworkError, TimeoutError, UnauthorizedError, ServerError } from './errors/ApiError';
export type { ApiErrorKind, ApiErrorOptions } from './errors/ApiError';
export { mapAxiosError } from './errors/mapAxiosError';

export { success, failure, isSuccess, isFailure } from './result/ApiResult';
export type { ApiResult, Success, Failure } from './result/ApiResult';
