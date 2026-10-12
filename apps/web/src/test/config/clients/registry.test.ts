import { describe, expect, it } from 'vitest';
import { CLIENT_REGISTRY } from '../../../config/clients/registry';
import { DEFAULT_CLIENT_CONFIG } from '../../../config/clients/default';
import { NEPAL_CLIENT_CONFIG } from '../../../config/clients/nepal';

describe('CLIENT_REGISTRY', () => {
  it('registers the default (eZAZI) and nepal clients by id', () => {
    expect(CLIENT_REGISTRY['default']).toBe(DEFAULT_CLIENT_CONFIG);
    expect(CLIENT_REGISTRY['nepal']).toBe(NEPAL_CLIENT_CONFIG);
  });

  it('gives each client a distinct logo asset', () => {
    expect(DEFAULT_CLIENT_CONFIG.assets.logo).not.toBe(
      NEPAL_CLIENT_CONFIG.assets.logo
    );
  });
});
