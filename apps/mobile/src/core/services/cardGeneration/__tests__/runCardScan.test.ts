import { secureStorage } from '@/core/services/storage/secure-storage';

import { runCardScan } from '..';
import { alertNewCards } from '../newCardAlert';
import { scanAllVisits } from '../scan';

jest.mock('@/core/services/storage/secure-storage', () => ({ secureStorage: { get: jest.fn() } }));
jest.mock('@/core/db', () => ({ getDb: jest.fn(() => 'db-handle') }));
jest.mock('@/core/db/init', () => ({ ensureSchema: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/core/config/env', () => ({ env: { DEV_SEED: false } }));
jest.mock('../scan', () => ({ scanAllVisits: jest.fn() }));
jest.mock('../newCardAlert', () => ({ alertNewCards: jest.fn().mockResolvedValue(undefined) }));

const RESULT = { cardsCreated: 1, decisionPendingSet: 0, missedMarkers: 0, preSyncDue: 0 };
const session = (values: Record<string, string | null>) =>
  (secureStorage.get as jest.Mock).mockImplementation(async (key: string) => values[key] ?? null);

describe('runCardScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (scanAllVisits as jest.Mock).mockReturnValue(RESULT);
  });

  it('scans as the logged-in provider and user', async () => {
    session({ accessToken: 't', userUuid: 'provider-1', creatorUuid: 'user-1' });

    await expect(runCardScan(1000)).resolves.toEqual(RESULT);
    expect(scanAllVisits).toHaveBeenCalledWith({ providerUuid: 'provider-1', creatorUuid: 'user-1' }, 1000, 'db-handle');
  });

  it('touches nothing without a session', async () => {
    session({ userUuid: 'provider-1', creatorUuid: 'user-1' });

    await expect(runCardScan()).resolves.toBeNull();
    expect(scanAllVisits).not.toHaveBeenCalled();
  });

  it('runs one scan at a time: an overlapping call shares the result', async () => {
    session({ accessToken: 't', userUuid: 'provider-1', creatorUuid: 'user-1' });

    const [first, second] = await Promise.all([runCardScan(), runCardScan()]);
    expect(first).toBe(second);
    expect(scanAllVisits).toHaveBeenCalledTimes(1);

    await runCardScan();
    expect(scanAllVisits).toHaveBeenCalledTimes(2);
  });

  it('alerts only when a card was created, and a failed alert does not fail the scan', async () => {
    session({ accessToken: 't', userUuid: 'provider-1', creatorUuid: 'user-1' });

    await runCardScan();
    expect(alertNewCards).toHaveBeenCalledTimes(1);

    (scanAllVisits as jest.Mock).mockReturnValue({ ...RESULT, cardsCreated: 0 });
    await runCardScan();
    expect(alertNewCards).toHaveBeenCalledTimes(1);

    (scanAllVisits as jest.Mock).mockReturnValue(RESULT);
    (alertNewCards as jest.Mock).mockRejectedValueOnce(new Error('no channel'));
    await expect(runCardScan()).resolves.toEqual(RESULT);
  });

  // The dev stand-in creator is covered where it lives: core/session/__tests__/writerIdentity.test.ts.
});
