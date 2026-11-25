import '@/core/i18n';
import { Modal } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { acknowledgeDialog } from '@/core/services/batteryGuard/batteryGuard';
import { useBatteryGuardStore } from '@/core/services/batteryGuard/batteryGuard.store';
import { logger } from '@/core/utils/logger';

import { LowBatteryDialog } from '../LowBatteryDialog';

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: { onForegroundEvent: jest.fn(() => jest.fn()) },
  EventType: { DELIVERED: 3 },
}));

jest.mock('@/core/services/batteryGuard/batteryGuard', () => ({
  startBatteryGuard: jest.fn().mockResolvedValue(undefined),
  stopBatteryGuard: jest.fn().mockResolvedValue(undefined),
  checkPendingDialog: jest.fn().mockResolvedValue(null),
  acknowledgeDialog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const showAt = (percent: number) => {
  render(<LowBatteryDialog />);
  act(() => useBatteryGuardStore.getState().showDialog(percent));
};

/** The one-time low-battery nudge: shown from the guard's store, dismissed for good with OK. */
describe('LowBatteryDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBatteryGuardStore.setState({ dialogVisible: false, dialogPercent: 0 });
  });

  it('renders nothing until the guard asks for it', () => {
    render(<LowBatteryDialog />);

    expect(screen.queryByText('Low Battery')).toBeNull();
  });

  it('shows the title and the battery level it was raised at', () => {
    showAt(32);

    expect(screen.getByText('Low Battery')).toBeTruthy();
    expect(
      screen.getByText('Battery is at 32%. Please plug in your device to keep the app running smoothly.'),
    ).toBeTruthy();
    expect(screen.getByText('OK')).toBeTruthy();
  });

  it('closes on OK and acknowledges it, so it does not return on the next app open', () => {
    showAt(32);

    fireEvent.press(screen.getByRole('button', { name: 'Dismiss low battery warning' }));

    expect(useBatteryGuardStore.getState().dialogVisible).toBe(false);
    expect(acknowledgeDialog).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Low Battery')).toBeNull();
  });

  it('dismisses the same way from the device Back button', () => {
    showAt(30);

    act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());

    expect(useBatteryGuardStore.getState().dialogVisible).toBe(false);
    expect(acknowledgeDialog).toHaveBeenCalledTimes(1);
  });

  it('logs a failed acknowledge, and still closes', async () => {
    const failure = new Error('storage full');
    (acknowledgeDialog as jest.Mock).mockRejectedValueOnce(failure);
    showAt(32);

    fireEvent.press(screen.getByRole('button', { name: 'Dismiss low battery warning' }));

    expect(screen.queryByText('Low Battery')).toBeNull();
    await waitFor(() => expect(logger.error).toHaveBeenCalledWith('[batteryGuard] acknowledgeDialog failed', failure));
  });
});
