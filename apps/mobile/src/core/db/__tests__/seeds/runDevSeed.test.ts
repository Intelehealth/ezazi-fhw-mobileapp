import { seedDevPatient } from '../../seeds/devPatient';
import { DEV_VISIT_UUID } from '../../seeds/devPatient.data';
import { seedDevLiveVisit, startDevStage1 } from '../../seeds/devVisitStart';
import { DEV_LIVE_VISIT_UUID } from '../../seeds/devVisitStart.data';
import { runDevSeed, runDevVisitStart } from '../../seeds';
import { transact } from '../../tx';

jest.mock('../../tx', () => ({ transact: jest.fn((write: (tx: string) => unknown) => write('tx')) }));
jest.mock('../../seeds/devPatient', () => ({ seedDevPatient: jest.fn() }));
jest.mock('../../seeds/devVisitStart', () => ({ seedDevLiveVisit: jest.fn(), startDevStage1: jest.fn() }));

const NOW = Date.UTC(2026, 9, 26, 10, 0, 0);

/** The two dev entry points the bootstrap store calls; each writes in one transaction. */
describe('dev seed entry points', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => jest.useRealTimers());

  it('seeds both test patients together and returns the seeded visit to open', () => {
    expect(runDevSeed('provider-1')).toBe(DEV_VISIT_UUID);

    expect(transact).toHaveBeenCalledTimes(1);
    expect(seedDevPatient).toHaveBeenCalledWith({ providerUuid: 'provider-1', now: NOW }, 'tx');
    expect(seedDevLiveVisit).toHaveBeenCalledWith({ providerUuid: 'provider-1', now: NOW }, 'tx');
  });

  it('starts Stage 1 on the live visit as the logged-in writer and returns it', () => {
    expect(runDevVisitStart({ providerUuid: 'provider-1', creatorUuid: 'user-1' })).toBe(DEV_LIVE_VISIT_UUID);

    expect(startDevStage1).toHaveBeenCalledWith({ providerUuid: 'provider-1', creatorUuid: 'user-1', now: NOW }, 'tx');
  });
});
