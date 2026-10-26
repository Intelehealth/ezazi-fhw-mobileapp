import { getRangeProfileIds } from '@ezazi/clinical-rules';
import { CLIENT_ID } from '../clients';
import { CLIENT_REGISTRY } from '../clients/registry';
import { RANGE_PROFILE, RANGE_PROFILE_BY_CLIENT, rangeProfileFor } from '../rangeProfile';

describe('validation range profile per client', () => {
  it('maps every registered client to a profile the package has', () => {
    for (const clientId of Object.keys(CLIENT_REGISTRY)) {
      expect(getRangeProfileIds()).toContain(rangeProfileFor(clientId));
    }
  });

  it('maps no client that is not registered', () => {
    expect(Object.keys(RANGE_PROFILE_BY_CLIENT).sort()).toEqual(Object.keys(CLIENT_REGISTRY).sort());
  });

  it('gives each client its own profile', () => {
    expect(rangeProfileFor('default')).toBe('default');
    expect(rangeProfileFor('nepal')).toBe('nepal');
  });

  it('picks the build client automatically', () => {
    expect(RANGE_PROFILE).toBe(rangeProfileFor(CLIENT_ID));
  });

  it('follows the build client id: a Nepal build gets the Nepal profile', () => {
    const original = process.env.EXPO_PUBLIC_CLIENT_ID;
    const profileFor = (clientId: string | undefined): string => {
      if (clientId === undefined) delete process.env.EXPO_PUBLIC_CLIENT_ID;
      else process.env.EXPO_PUBLIC_CLIENT_ID = clientId;
      let profile = '';
      jest.isolateModules(() => {
        profile = (require('../rangeProfile') as typeof import('../rangeProfile')).RANGE_PROFILE;
      });
      return profile;
    };
    try {
      expect(profileFor('nepal')).toBe('nepal');
      expect(profileFor('default')).toBe('default');
      expect(profileFor(undefined)).toBe('default'); // no client set: the default build
    } finally {
      if (original === undefined) delete process.env.EXPO_PUBLIC_CLIENT_ID;
      else process.env.EXPO_PUBLIC_CLIENT_ID = original;
    }
  });

  it('refuses a client with no profile instead of guessing', () => {
    expect(() => rangeProfileFor('unknown')).toThrow('No validation range profile for client "unknown"');
  });
});
