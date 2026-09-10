/**
 * Mobile API layer — the thin ADAPTER over `@ezazi/api-client`.
 *
 * The transport contract (client factory, interceptor stack, ApiError kinds,
 * ApiResult) is SHARED with apps/web and lives in `@ezazi/api-client`.
 * Import those directly from the package:
 *
 *     import { mapAxiosError, type ApiResult } from '@ezazi/api-client';
 *
 * This barrel deliberately does NOT re-export them — a local alias is how the
 * two apps silently drift apart again (ARCHITECTURE_RULES §10).
 *
 * What stays mobile-owned and is exported here:
 *   - `apiClient`      — the instance wired to secure-store + refresh-on-401
 *   - `logApiError`    — RN-only; LogBox hijacks console.warn/error
 *   - `responseHandler`— terse per-method wrappers over the shared `request`
 *   - `*.api.ts`       — endpoint modules
 */
export { logApiError } from './errors/logApiError';

export { createRequestMethods, request } from './responseHandler';

export { apiClient } from './client';
export { authApi } from './auth.api';
export type { LoginRequest, LoginResponse, OtpRequest, OtpVerifyRequest, ResetPasswordRequest } from './auth.api';
export { fetchPublishedConfig } from './config.api';
