import { create } from 'zustand';

/**
 * App-wide "Last Refreshed" time shown in BrandAppBar. One source so every
 * screen's app bar agrees; the sync engine calls markRefreshed() on success.
 */
interface SyncStatusState {
  lastRefreshedAt: Date;
  markRefreshed: (at?: Date) => void;
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  // TODO: seed from the persisted last-sync time once the sync engine exists.
  lastRefreshedAt: new Date(),
  markRefreshed: (at = new Date()) => set({ lastRefreshedAt: at }),
}));
