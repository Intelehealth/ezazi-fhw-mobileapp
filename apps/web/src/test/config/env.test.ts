import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `env.ts` resolves `import.meta.env.VITE_APP_ENV` once, at module-load
 * time (`resolveAppEnv()` runs top-level) — so each branch needs a fresh
 * module instance via `vi.resetModules()` + a dynamic `import()` after
 * stubbing the env var, rather than importing `env` once at the top of
 * this file.
 */
describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('falls back to development for an unset or unrecognized VITE_APP_ENV', async () => {
    vi.stubEnv('VITE_APP_ENV', undefined);
    const { env } = await import('../../config/env');
    expect(env.APP_ENV).toBe('development');
  });

  it('accepts "production" as a valid VITE_APP_ENV', async () => {
    vi.stubEnv('VITE_APP_ENV', 'production');
    const { env } = await import('../../config/env');
    expect(env.APP_ENV).toBe('production');
  });

  it('accepts "preview" as a valid VITE_APP_ENV', async () => {
    vi.stubEnv('VITE_APP_ENV', 'preview');
    const { env } = await import('../../config/env');
    expect(env.APP_ENV).toBe('preview');
  });

  it('treats an unrecognized value the same as unset', async () => {
    vi.stubEnv('VITE_APP_ENV', 'staging');
    const { env } = await import('../../config/env');
    expect(env.APP_ENV).toBe('development');
  });

  it('prefers an explicit VITE_RECAPTCHA_SITE_KEY over the built-in test key', async () => {
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'my-site-key');
    const { env } = await import('../../config/env');
    expect(env.RECAPTCHA_SITE_KEY).toBe('my-site-key');
  });

  it('falls back to the Google test site key when unset', async () => {
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', undefined);
    const { env } = await import('../../config/env');
    expect(env.RECAPTCHA_SITE_KEY).toBe(
      '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
    );
  });
});
