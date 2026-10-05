import { create } from 'zustand';

/**
 * Count of in-flight API requests across every axios instance the app owns
 * (see trackApiActivity). core/ui/ApiProgressOverlay shows its spinner while
 * `pending > 0`. A counter, not a boolean — overlapping requests (e.g. the
 * 401 refresh-and-retry) must not hide the spinner when only the first one
 * finishes.
 */
interface ApiActivityState {
  pending: number;
  begin: () => void;
  end: () => void;
}

export const useApiActivityStore = create<ApiActivityState>(set => ({
  pending: 0,
  begin: () => set(s => ({ pending: s.pending + 1 })),
  end: () => set(s => ({ pending: Math.max(0, s.pending - 1) })),
}));
