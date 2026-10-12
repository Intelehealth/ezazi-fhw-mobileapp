/**
 * Full-page navigation to `path`. A thin seam over `window.location.assign`
 * so code outside React (the 401 handler in services/http.ts) can redirect
 * and tests can observe it — jsdom's `location.assign` can't be stubbed.
 */
export function redirectTo(path: string): void {
  window.location.assign(path);
}
