import { create } from 'zustand';

/**
 * Drives LowBatteryDialog (core/ui). Not clinical data — just the one-time
 * low-battery nudge's visibility, so zustand is fine here (see
 * core/api/apiActivity.store.ts for the same reasoning).
 */
interface BatteryGuardState {
  dialogVisible: boolean;
  dialogPercent: number;
  showDialog: (percent: number) => void;
  hideDialog: () => void;
}

export const useBatteryGuardStore = create<BatteryGuardState>((set) => ({
  dialogVisible: false,
  dialogPercent: 0,
  showDialog: (percent) => set({ dialogVisible: true, dialogPercent: percent }),
  hideDialog: () => set({ dialogVisible: false }),
}));
