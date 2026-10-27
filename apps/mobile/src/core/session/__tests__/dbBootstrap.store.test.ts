import { env } from '@/core/config/env';
import { ensureSchema } from '@/core/db/init';
import { runDevSeed, runDevVisitStart } from '@/core/db/seeds';

import { useDbBootstrapStore } from '../dbBootstrap.store';
import { readWriterIdentity } from '../writerIdentity';

jest.mock('@/core/config/env', () => ({ env: { DEV_SEED: false } }));
jest.mock('@/core/db/init', () => ({ ensureSchema: jest.fn().mockResolvedValue(undefined), resetSchemaInit: jest.fn() }));
jest.mock('@/core/db/seeds', () => ({ runDevSeed: jest.fn(), runDevVisitStart: jest.fn() }));
jest.mock('../writerIdentity', () => ({ readWriterIdentity: jest.fn() }));
jest.mock('@/core/utils/logger', () => ({ logger: { error: jest.fn(), debug: jest.fn(), info: jest.fn() } }));

const WRITER = { providerUuid: 'provider-1', creatorUuid: 'user-1' };

const setDevSeed = (on: boolean) => {
  (env as { DEV_SEED: boolean }).DEV_SEED = on;
};

/** The DB bootstrap and the dev-only test-patient entry points (EXPO_PUBLIC_DEV_SEED). */
describe('dbBootstrap store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setDevSeed(false);
    useDbBootstrapStore.getState().reset();
    (runDevSeed as jest.Mock).mockReturnValue('dev-visit');
    (runDevVisitStart as jest.Mock).mockReturnValue('live-visit');
    (readWriterIdentity as jest.Mock).mockResolvedValue(WRITER);
  });

  it('prepares the schema and seeds nothing outside dev seed builds', async () => {
    await useDbBootstrapStore.getState().initialise('provider-1');

    expect(ensureSchema).toHaveBeenCalledTimes(1);
    expect(runDevSeed).not.toHaveBeenCalled();
    expect(useDbBootstrapStore.getState()).toMatchObject({ phase: 'ready', devVisitUuid: null });
  });

  it('seeds the test patients once in dev seed builds and remembers the visit to open', async () => {
    setDevSeed(true);
    await useDbBootstrapStore.getState().initialise('provider-1');
    await useDbBootstrapStore.getState().initialise('provider-1');

    expect(runDevSeed).toHaveBeenCalledTimes(1);
    expect(runDevSeed).toHaveBeenCalledWith('provider-1');
    expect(useDbBootstrapStore.getState().devVisitUuid).toBe('dev-visit');
  });

  it('still gets the database ready when the dev seed fails', async () => {
    setDevSeed(true);
    (runDevSeed as jest.Mock).mockImplementation(() => {
      throw new Error('seed failed');
    });

    await useDbBootstrapStore.getState().initialise('provider-1');

    expect(useDbBootstrapStore.getState()).toMatchObject({ phase: 'ready', devVisitUuid: null });
  });

  it('starts the live test visit only in dev seed builds, as the logged-in writer, and reports a failure as null', async () => {
    await expect(useDbBootstrapStore.getState().startDevVisit()).resolves.toBeNull();
    expect(runDevVisitStart).not.toHaveBeenCalled();

    setDevSeed(true);
    await expect(useDbBootstrapStore.getState().startDevVisit()).resolves.toBe('live-visit');
    expect(runDevVisitStart).toHaveBeenCalledWith(WRITER);

    (runDevVisitStart as jest.Mock).mockImplementation(() => {
      throw new Error('write failed');
    });
    await expect(useDbBootstrapStore.getState().startDevVisit()).resolves.toBeNull();
  });

  it('starts nothing when no one is logged in', async () => {
    setDevSeed(true);
    (readWriterIdentity as jest.Mock).mockResolvedValue(null);

    await expect(useDbBootstrapStore.getState().startDevVisit()).resolves.toBeNull();
    expect(runDevVisitStart).not.toHaveBeenCalled();
  });
});
