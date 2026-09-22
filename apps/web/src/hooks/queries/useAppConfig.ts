import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { ApiError } from '@ezazi/api-client';
import type { AppConfig } from '@ezazi/types';
import { configService } from '../../services/config.service';
import { setConfig, setConfigError } from '../../reducers/config.reducer';
import { useAppDispatch } from '../../store/hooks';

/**
 * Config module's React Query hook (migration guide §5: "fetched via a
 * React Query query and synced into the slice on load"). Long staleTime —
 * this is app-wide config, not per-screen server data like open-visits
 * would be, so it's fetched once per session rather than refetched.
 */
export function useAppConfig() {
  const dispatch = useAppDispatch();

  const query = useQuery<AppConfig, ApiError>({
    queryKey: ['app-config'],
    queryFn: async () => {
      const result = await configService.getPublishedConfig();
      if (!result.ok) throw result.error;
      return result.data;
    },
    staleTime: 60 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.data) dispatch(setConfig(query.data));
  }, [query.data, dispatch]);

  useEffect(() => {
    if (query.error) dispatch(setConfigError(query.error.message));
  }, [query.error, dispatch]);

  return query;
}
