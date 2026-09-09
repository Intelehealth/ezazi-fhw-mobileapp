import axios, { AxiosInstance } from 'axios';
import { attachAuthInterceptor, attachUnauthorizedRetryInterceptor } from './interceptors';
import type { TokenProvider, UnauthorizedHandler } from './interceptors';

export interface CreateApiClientOptions {
  baseURL: string;
  timeout?: number;
  /** Omit for unauthenticated services (e.g. a public config endpoint). */
  getAuthToken?: TokenProvider;
  /** Omit to skip refresh-on-401 retry. */
  onUnauthorized?: UnauthorizedHandler;
}

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Builds one axios instance with the common interceptor stack wired in.
 * Used by both apps/mobile (secure-store token provider) and apps/web
 * (cookie/localStorage token provider) — only the token plumbing differs
 * per platform, injected via options rather than baked in here.
 */
export function createApiClient(options: CreateApiClientOptions): AxiosInstance {
  const instance = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
  });

  if (options.getAuthToken) {
    attachAuthInterceptor(instance, options.getAuthToken);
  }
  if (options.onUnauthorized) {
    attachUnauthorizedRetryInterceptor(instance, options.onUnauthorized);
  }

  return instance;
}
