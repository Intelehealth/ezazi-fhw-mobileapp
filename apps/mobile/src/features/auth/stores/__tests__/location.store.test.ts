import { locationApi } from '@/features/auth/data/location.api';

jest.mock('@/features/auth/data/location.api', () => ({
  locationApi: { listLoginLocations: jest.fn() },
}));

import { useLocationStore } from '../location.store';

describe('useLocationStore', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    useLocationStore.setState({ locations: [], isLoading: false });
  });

  it('fills locations from a successful fetch', async () => {
    const results = [{ uuid: 'loc-1', display: 'Civil Hospital' }];
    (locationApi.listLoginLocations as jest.Mock).mockResolvedValue({ ok: true, data: { results } });

    const result = await useLocationStore.getState().fetchLocations();

    expect(result.ok).toBe(true);
    expect(useLocationStore.getState()).toMatchObject({ locations: results, isLoading: false });
  });

  it('clears locations and surfaces the error on a failed fetch', async () => {
    const apiError = { kind: 'network', status: 0, code: undefined, message: 'Network Error' };
    (locationApi.listLoginLocations as jest.Mock).mockResolvedValue({ ok: false, error: apiError });
    useLocationStore.setState({ locations: [{ uuid: 'stale', display: 'Stale Location' }] });

    const result = await useLocationStore.getState().fetchLocations();

    expect(result).toEqual({ ok: false, error: apiError });
    expect(useLocationStore.getState()).toMatchObject({ locations: [], isLoading: false });
  });

});
