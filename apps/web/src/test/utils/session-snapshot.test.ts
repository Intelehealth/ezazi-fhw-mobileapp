import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSessionSnapshot,
  registerFormDraft,
  saveSessionSnapshot,
  takeFormDraft,
  takeReturnPath,
} from '../../utils/session-snapshot';

const SNAPSHOT_KEY = 'ezazi_web_session_snapshot';

async function loadWithBasePath(basePath: string) {
  vi.resetModules();
  vi.stubEnv('VITE_BASE_PATH', basePath);
  return import('../../utils/session-snapshot');
}

beforeEach(() => {
  window.history.pushState(null, '', '/dashboard/profile');
});

afterEach(() => {
  clearSessionSnapshot();
  window.history.pushState(null, '', '/');
  vi.unstubAllEnvs();
});

describe('session snapshot', () => {
  it("saves the current page and every registered form's values, tagged with the user", () => {
    const unregister = registerFormDraft('profile', () => ({
      givenName: 'Asha',
    }));
    window.history.pushState(null, '', '/dashboard/profile?tab=1#top');

    saveSessionSnapshot('u-1');
    unregister();

    expect(JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY)!)).toEqual({
      userUuid: 'u-1',
      returnTo: '/dashboard/profile?tab=1#top',
      drafts: { profile: { givenName: 'Asha' } },
    });
  });

  it('no longer captures a form once it has unregistered', () => {
    const unregister = registerFormDraft('profile', () => ({
      givenName: 'Asha',
    }));
    unregister();

    saveSessionSnapshot('u-1');

    expect(JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY)!).drafts).toEqual(
      {}
    );
  });

  it('keeps a newer registration when an older one for the same key unregisters late', () => {
    const unregisterOld = registerFormDraft('profile', () => 'old');
    const unregisterNew = registerFormDraft('profile', () => 'new');

    unregisterOld();
    saveSessionSnapshot('u-1');
    unregisterNew();

    expect(JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY)!).drafts).toEqual({
      profile: 'new',
    });
  });

  it('hands a form its saved draft once, and only to the same user', () => {
    const unregister = registerFormDraft('profile', () => ({
      givenName: 'Asha',
    }));
    saveSessionSnapshot('u-1');
    unregister();

    expect(takeFormDraft('profile', 'someone-else')).toBeNull();
    expect(takeFormDraft('profile', 'u-1')).toEqual({ givenName: 'Asha' });
    expect(takeFormDraft('profile', 'u-1')).toBeNull();
  });

  it('has no draft for a form that never registered, or when nothing was saved', () => {
    expect(takeFormDraft('profile', 'u-1')).toBeNull();

    saveSessionSnapshot('u-1');
    expect(takeFormDraft('profile', 'u-1')).toBeNull();
  });

  it('returns the page to go back to once, only to the same user', () => {
    saveSessionSnapshot('u-1');

    expect(takeReturnPath('u-1')).toBe('/dashboard/profile');
    expect(takeReturnPath('u-1')).toBeNull();
  });

  it("discards the previous user's snapshot when someone else logs in", () => {
    const unregister = registerFormDraft('profile', () => ({
      givenName: 'Asha',
    }));
    saveSessionSnapshot('u-1');
    unregister();

    expect(takeReturnPath('u-2')).toBeNull();
    expect(sessionStorage.getItem(SNAPSHOT_KEY)).toBeNull();
    expect(takeFormDraft('profile', 'u-1')).toBeNull();
  });

  it('has no return path when nothing was saved', () => {
    expect(takeReturnPath('u-1')).toBeNull();
  });

  it.each(['/auth/login', '/auth', '/auth/forgot-password'])(
    'never returns to the auth page %s',
    path => {
      window.history.pushState(null, '', path);

      saveSessionSnapshot('u-1');

      expect(takeReturnPath('u-1')).toBeNull();
    }
  );

  it('never returns to a protocol-relative path', () => {
    /* A same-origin URL whose path starts with "//" — navigate('//…') would leave the site. */
    window.history.pushState(
      null,
      '',
      `${window.location.origin}//evil.example.com/steal`
    );

    saveSessionSnapshot('u-1');

    expect(takeReturnPath('u-1')).toBeNull();
  });

  it('strips the deployment base path so the router can navigate to it', async () => {
    const snapshot = await loadWithBasePath('/intelehealth');
    window.history.pushState(null, '', '/intelehealth/dashboard/profile');

    snapshot.saveSessionSnapshot('u-1');

    expect(snapshot.takeReturnPath('u-1')).toBe('/dashboard/profile');
  });

  it('treats the base path root itself as "/"', async () => {
    const snapshot = await loadWithBasePath('/intelehealth');
    window.history.pushState(null, '', '/intelehealth');

    snapshot.saveSessionSnapshot('u-1');

    expect(snapshot.takeReturnPath('u-1')).toBe('/');
  });

  it('can be cleared', () => {
    saveSessionSnapshot('u-1');

    clearSessionSnapshot();

    expect(sessionStorage.getItem(SNAPSHOT_KEY)).toBeNull();
  });

  it('ignores an unreadable stored snapshot', () => {
    sessionStorage.setItem(SNAPSHOT_KEY, '{not json');

    expect(takeReturnPath('u-1')).toBeNull();
    expect(takeFormDraft('profile', 'u-1')).toBeNull();
  });

  it('carries on without a snapshot when storage refuses the write', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });

    expect(() => saveSessionSnapshot('u-1')).not.toThrow();

    setItem.mockRestore();
    expect(takeReturnPath('u-1')).toBeNull();
  });
});
