import { afterEach, describe, expect, it, vi } from 'vitest';
import { redirectTo } from '../../utils/navigation';

describe('redirectTo', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does a full-page navigation to the given path', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });

    redirectTo('/auth/login');

    expect(assign).toHaveBeenCalledWith('/auth/login');
  });
});
