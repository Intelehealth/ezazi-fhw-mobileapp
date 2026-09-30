import { create } from 'zustand';
import type { ApiResult } from '@ezazi/api-client';
import { locationApi, type LoginLocation } from '@/features/auth/data/location.api';
import { logApiError } from '@/core/api/errors/logApiError';
import { logger } from '@/core/utils/logger';

export type { LoginLocation };

/**
 * LOCATION dropdown state for SetupScreen — the boundary between the screen
 * and locationApi (see CLAUDE.md's boundaries/dependencies rule: presentation
 * must not import features/*\/data directly, same reasoning as auth.store's
 * login()).
 */

interface LocationListResult {
  results: LoginLocation[];
}

interface LocationState {
  locations: LoginLocation[];
  isLoading: boolean;
  fetchLocations: () => Promise<ApiResult<LocationListResult>>;
}

export const useLocationStore = create<LocationState>((set) => ({
  locations: [],
  isLoading: false,

  fetchLocations: async () => {
    set({ isLoading: true });
    const result = await locationApi.listLoginLocations();

    if (result.ok) {
      // Console-only — never shown on screen.
      logger.debug('[Location] Fetched login locations', result.data);
    } else {
      // Console-only — never shown on screen, in dev or production builds.
      logApiError('Fetch login locations', result.error);
    }

    set({
      locations: result.ok ? result.data.results : [],
      isLoading: false,
    });
    return result;
  },
}));
