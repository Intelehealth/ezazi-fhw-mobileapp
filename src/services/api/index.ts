/**
 * Common API client architecture (see React_Native_Common_API_Client_Architecture_Plan.docx).
 * Every API service (auth.api.ts, config.api.ts, and any new one) is built on
 * this: one client factory, one interceptor set, one error/result contract.
 */
export { createApiClient } from './client/createApiClient';
export type { CreateApiClientOptions } from './client/createApiClient';

export { attachAuthInterceptor, attachUnauthorizedRetryInterceptor } from './client/interceptors';
export type { TokenProvider, UnauthorizedHandler } from './client/interceptors';

export { ApiError, NetworkError, ServerError, TimeoutError, UnauthorizedError } from './errors/ApiError';
export type { ApiErrorKind, ApiErrorOptions } from './errors/ApiError';
export { mapAxiosError } from './errors/mapAxiosError';

export { failure, isFailure, isSuccess, success } from './result/ApiResult';
export type { ApiResult, Failure, Success } from './result/ApiResult';

export { createRequestMethods, request } from './responseHandler';

export { apiClient } from './client';
export { authApi } from './auth.api';
export type { LoginRequest, LoginResponse, OtpRequest, OtpVerifyRequest, ResetPasswordRequest } from './auth.api';
export { fetchPublishedConfig } from './config.api';
