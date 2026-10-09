import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Like env.test.ts: `clientConfig`/`CLIENT_ID` are resolved once at
 * module-load time from `import.meta.env.VITE_CLIENT_ID`, so each branch
 * needs `vi.resetModules()` + a fresh dynamic `import()`.
 */
describe('config/clients', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults to the eZAZI client when VITE_CLIENT_ID is unset', async () => {
    vi.stubEnv('VITE_CLIENT_ID', undefined);
    const { clientConfig, CLIENT_ID } = await import('../../../config/clients');
    const { DEFAULT_CLIENT_CONFIG } =
      await import('../../../config/clients/default');

    expect(clientConfig).toBe(DEFAULT_CLIENT_CONFIG);
    expect(CLIENT_ID).toBe('default');
  });

  it('resolves the nepal client when VITE_CLIENT_ID matches its registry id', async () => {
    vi.stubEnv('VITE_CLIENT_ID', 'nepal');
    const { clientConfig, CLIENT_ID } = await import('../../../config/clients');
    const { NEPAL_CLIENT_CONFIG } =
      await import('../../../config/clients/nepal');

    expect(clientConfig).toBe(NEPAL_CLIENT_CONFIG);
    expect(CLIENT_ID).toBe('nepal');
  });

  it('falls back to the default client for an unrecognized VITE_CLIENT_ID', async () => {
    vi.stubEnv('VITE_CLIENT_ID', 'some-unknown-client');
    const { clientConfig, CLIENT_ID } = await import('../../../config/clients');
    const { DEFAULT_CLIENT_CONFIG } =
      await import('../../../config/clients/default');

    expect(clientConfig).toBe(DEFAULT_CLIENT_CONFIG);
    expect(CLIENT_ID).toBe('default');
  });
});
