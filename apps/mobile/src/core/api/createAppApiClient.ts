import { createApiClient, type CreateApiClientOptions } from '@ezazi/api-client';
import type { AxiosInstance } from 'axios';

import { logApiTraffic } from '@/core/utils/logging/apiLogger';

import { trackApiActivity } from './trackApiActivity';

/**
 * The ONLY place an axios instance is created. Every `*.api.ts` goes through
 * this, so a new endpoint file inherits the progress spinner and the traffic
 * log by construction rather than by someone remembering two extra lines.
 *
 * `no-restricted-imports` blocks `createApiClient` everywhere else — see
 * ARCHITECTURE_RULES §9. The alternative was a sentence in a document, and
 * this file's own eslint config says what those are worth: *"Prose in a doc
 * stops nobody; this does."*
 *
 * Order matters and is the reason this is a function rather than a convention.
 * Both interceptor pairs go on AFTER `createApiClient`, so they sit outside
 * the shared refresh-on-401 retry: a retried request then counts and logs on
 * its own, which is what makes a silent token refresh visible instead of
 * looking like one slow call.
 */
export function createAppApiClient(label: string, options: CreateApiClientOptions): AxiosInstance {
  const instance = createApiClient(options);

  trackApiActivity(instance);
  // Debug builds only — gated on __DEV__ inside, not on APP_ENV.
  logApiTraffic(instance, label);

  return instance;
}
