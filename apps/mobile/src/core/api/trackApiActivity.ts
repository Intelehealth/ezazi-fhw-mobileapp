import type { AxiosInstance } from 'axios';
import { useApiActivityStore } from './apiActivity.store';

/**
 * Marks every request on `instance` as in-flight until its response (or
 * error) comes back, driving the global progress overlay. Add it AFTER
 * createApiClient() so it wraps the shared refresh-on-401 interceptor: the
 * retried request counts on its own, and the original is released only once
 * the retry has settled.
 */
export function trackApiActivity(instance: AxiosInstance): void {
  const { begin, end } = useApiActivityStore.getState();

  instance.interceptors.request.use(
    config => {
      begin();
      return config;
    },
    error => {
      // A request that failed before being sent never gets a response.
      end();
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    response => {
      end();
      return response;
    },
    error => {
      end();
      return Promise.reject(error);
    },
  );
}
