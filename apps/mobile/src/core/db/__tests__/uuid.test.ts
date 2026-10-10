import * as Crypto from 'expo-crypto';

import { newUuid } from '../uuid';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));

const randomUUID = Crypto.randomUUID as jest.MockedFunction<typeof Crypto.randomUUID>;

/**
 * `newUuid` is a seam, not an algorithm — RFC 4122 conformance is expo-crypto's
 * job. These pin the seam: one blessed source, value passed through untouched.
 */
describe('newUuid', () => {
  beforeEach(() => randomUUID.mockReset());

  it('returns expo-crypto’s value unaltered', () => {
    randomUUID.mockReturnValue('3edb0e09-9135-481e-b8f0-07a26fa9a5ce');

    expect(newUuid()).toBe('3edb0e09-9135-481e-b8f0-07a26fa9a5ce');
  });

  it('delegates on every call rather than caching', () => {
    randomUUID
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-9222-222222222222');

    expect([newUuid(), newUuid()]).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-9222-222222222222',
    ]);
    expect(randomUUID).toHaveBeenCalledTimes(2);
  });
});
