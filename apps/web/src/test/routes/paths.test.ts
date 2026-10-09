import { describe, expect, it } from 'vitest';
import { resolvePostLoginPath, ROUTES } from '../../routes/paths';

describe('resolvePostLoginPath', () => {
  it('sends nurses to the hw-profile dashboard', () => {
    expect(resolvePostLoginPath(true)).toBe(ROUTES.DASHBOARD_HW_PROFILE);
  });

  it('sends everyone else to the plain dashboard', () => {
    expect(resolvePostLoginPath(false)).toBe(ROUTES.DASHBOARD);
  });
});
