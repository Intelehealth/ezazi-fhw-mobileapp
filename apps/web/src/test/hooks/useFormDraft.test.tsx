import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useAppSelector } from '../../store/hooks';
import {
  clearSessionSnapshot,
  saveSessionSnapshot,
} from '../../utils/session-snapshot';

/* Same dual-React hoisting hazard dashboard.page.test.tsx documents. */
vi.mock('../../store/hooks', () => ({ useAppSelector: vi.fn() }));

let userUuid: string | undefined;

beforeEach(() => {
  userUuid = 'u-1';
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: {
        user: userUuid ? ({ uuid: userUuid } as never) : null,
        token: null,
        isAuthenticated: Boolean(userUuid),
      },
      config: { data: null, error: null, lastFetched: null },
    })
  );
  window.history.pushState(null, '', '/dashboard/profile');
});

afterEach(() => {
  clearSessionSnapshot();
  window.history.pushState(null, '', '/');
});

function renderDraft(options: {
  enabled: boolean;
  values?: { givenName: string };
  onRestore?: () => void;
}) {
  const reset = vi.fn();
  const getValues = vi.fn(() => options.values ?? { givenName: 'Asha' });
  const hook = renderHook(
    ({ enabled }) =>
      useFormDraft('profile', {
        enabled,
        getValues: getValues as never,
        reset: reset as never,
        onRestore: options.onRestore,
      }),
    { initialProps: { enabled: options.enabled } }
  );
  return { ...hook, reset, getValues };
}

describe('useFormDraft', () => {
  it("hands over the form's values when the session expires while it is enabled", () => {
    const { getValues } = renderDraft({
      enabled: true,
      values: { givenName: 'Meera' },
    });

    saveSessionSnapshot('u-1');

    expect(getValues).toHaveBeenCalled();
    const snapshot = JSON.parse(
      sessionStorage.getItem('ezazi_web_session_snapshot')!
    );
    expect(snapshot.drafts).toEqual({ profile: { givenName: 'Meera' } });
  });

  it('captures nothing while the form is not enabled (a read-only view has no unsaved edits)', () => {
    const { getValues } = renderDraft({ enabled: false });

    saveSessionSnapshot('u-1');

    expect(getValues).not.toHaveBeenCalled();
    expect(
      JSON.parse(sessionStorage.getItem('ezazi_web_session_snapshot')!).drafts
    ).toEqual({});
  });

  it('starts and stops capturing as it is enabled and disabled', () => {
    const { rerender, getValues } = renderDraft({ enabled: false });

    rerender({ enabled: true });
    saveSessionSnapshot('u-1');
    expect(getValues).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    saveSessionSnapshot('u-1');
    expect(getValues).toHaveBeenCalledTimes(1);
  });

  it('stops capturing once the form unmounts', () => {
    const { unmount, getValues } = renderDraft({ enabled: true });

    unmount();
    saveSessionSnapshot('u-1');

    expect(getValues).not.toHaveBeenCalled();
  });

  it('restores a saved draft for this user into the form once, and tells the form so', () => {
    const writer = renderDraft({
      enabled: true,
      values: { givenName: 'Meera' },
    });
    saveSessionSnapshot('u-1');
    writer.unmount();

    const onRestore = vi.fn();
    const { reset } = renderDraft({ enabled: false, onRestore });

    expect(reset).toHaveBeenCalledWith({ givenName: 'Meera' });
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it('restores without an onRestore callback too', () => {
    const writer = renderDraft({
      enabled: true,
      values: { givenName: 'Meera' },
    });
    saveSessionSnapshot('u-1');
    writer.unmount();

    const { reset } = renderDraft({ enabled: false });

    expect(reset).toHaveBeenCalledWith({ givenName: 'Meera' });
  });

  it("never restores another user's draft", () => {
    const writer = renderDraft({
      enabled: true,
      values: { givenName: 'Meera' },
    });
    saveSessionSnapshot('someone-else');
    writer.unmount();

    const onRestore = vi.fn();
    const { reset } = renderDraft({ enabled: false, onRestore });

    expect(reset).not.toHaveBeenCalled();
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('does nothing when nobody is signed in', () => {
    const writer = renderDraft({ enabled: true });
    saveSessionSnapshot('u-1');
    writer.unmount();
    userUuid = undefined;

    const { reset } = renderDraft({ enabled: false });

    expect(reset).not.toHaveBeenCalled();
  });
});
