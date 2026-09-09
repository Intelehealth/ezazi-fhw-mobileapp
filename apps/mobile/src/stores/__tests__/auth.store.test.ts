import { secureStorage } from '@/services/storage/secure-storage';
import { authApi } from '@/services/api/auth.api';

const mockSyncConfig = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/storage/secure-storage', () => ({
  secureStorage: { get: jest.fn(), set: jest.fn(), clear: jest.fn() },
}));
jest.mock('@/services/api/auth.api', () => ({
  authApi: { logout: jest.fn() },
}));
jest.mock('@/stores/featureConfig.store', () => ({
  useFeatureConfigStore: { getState: () => ({ syncConfig: mockSyncConfig }) },
}));

import { useAuthStore } from '../auth.store';

describe('useAuthStore', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'unknown', userUuid: null, role: null });
  });

  // ── bootstrap ────────────────────────────────────────────────────────────

  describe('bootstrap', () => {
    it('sets status to authenticated when both a token and userUuid are stored', async () => {
      jest.useFakeTimers();
      (secureStorage.get as jest.Mock).mockImplementation((key: string) =>
        Promise.resolve(key === 'accessToken' ? 'token-1' : key === 'userUuid' ? 'user-1' : null),
      );

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(3000);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().userUuid).toBe('user-1');
      jest.useRealTimers();
    });

    it('sets status to unauthenticated when the token is missing', async () => {
      jest.useFakeTimers();
      (secureStorage.get as jest.Mock).mockImplementation((key: string) =>
        Promise.resolve(key === 'userUuid' ? 'user-1' : null),
      );

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(3000);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      jest.useRealTimers();
    });

    it('sets status to unauthenticated when secure storage throws', async () => {
      jest.useFakeTimers();
      (secureStorage.get as jest.Mock).mockRejectedValue(new Error('keystore locked'));

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(3000);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      jest.useRealTimers();
    });

    it('kicks off a feature-config sync without waiting for it', () => {
      (secureStorage.get as jest.Mock).mockResolvedValue(null);

      void useAuthStore.getState().bootstrap();

      expect(mockSyncConfig).toHaveBeenCalledTimes(1);
    });
  });

  // ── setAuthenticated ─────────────────────────────────────────────────────

  describe('setAuthenticated', () => {
    it('persists the userUuid and marks the store authenticated', async () => {
      await useAuthStore.getState().setAuthenticated('user-2', 'fhw');

      expect(secureStorage.set).toHaveBeenCalledWith('userUuid', 'user-2');
      expect(useAuthStore.getState()).toMatchObject({
        status: 'authenticated',
        userUuid: 'user-2',
        role: 'fhw',
      });
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears local state even when the server logout call fails', async () => {
      (authApi.logout as jest.Mock).mockResolvedValue({ ok: false, error: new Error('offline') });
      useAuthStore.setState({ status: 'authenticated', userUuid: 'user-1', role: 'fhw' });

      await useAuthStore.getState().logout();

      expect(secureStorage.clear).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState()).toMatchObject({
        status: 'unauthenticated',
        userUuid: null,
        role: null,
      });
    });

    it('clears local state when the server logout call succeeds', async () => {
      (authApi.logout as jest.Mock).mockResolvedValue({ ok: true, data: undefined });
      useAuthStore.setState({ status: 'authenticated', userUuid: 'user-1', role: 'fhw' });

      await useAuthStore.getState().logout();

      expect(secureStorage.clear).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().status).toBe('unauthenticated');
    });
  });

});
