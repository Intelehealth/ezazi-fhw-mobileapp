import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionExpiry } from '../../services/session-expiry';

afterEach(() => {
  sessionExpiry.reset();
});

describe('sessionExpiry', () => {
  it('starts not expired', () => {
    expect(sessionExpiry.isExpired()).toBe(false);
  });

  it('notifies subscribers once when the session expires, and again when it is reset', () => {
    const listener = vi.fn();
    sessionExpiry.subscribe(listener);

    sessionExpiry.markExpired();
    expect(sessionExpiry.isExpired()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    sessionExpiry.reset();
    expect(sessionExpiry.isExpired()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not notify again for a repeated markExpired or reset', () => {
    const listener = vi.fn();
    sessionExpiry.subscribe(listener);

    sessionExpiry.reset();
    expect(listener).not.toHaveBeenCalled();

    sessionExpiry.markExpired();
    sessionExpiry.markExpired();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a subscriber that unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = sessionExpiry.subscribe(listener);

    unsubscribe();
    sessionExpiry.markExpired();

    expect(listener).not.toHaveBeenCalled();
  });
});
