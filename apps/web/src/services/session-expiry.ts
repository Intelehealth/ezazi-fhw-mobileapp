/**
 * Whether the session has hard-expired: the refresh token was rejected (or is
 * missing), so no silent refresh can recover it and the user has to log in
 * again. A tiny external store — not Redux — so the plain-TypeScript session
 * service can raise it and the React modal can subscribe to it
 * (`useSyncExternalStore`) without either importing the other.
 */
let expired = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

export const sessionExpiry = {
  isExpired: (): boolean => expired,

  markExpired: (): void => {
    if (expired) return;
    expired = true;
    emit();
  },

  /** Cleared by any logout or successful login, so a stale flag can't re-open the modal. */
  reset: (): void => {
    if (!expired) return;
    expired = false;
    emit();
  },

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
