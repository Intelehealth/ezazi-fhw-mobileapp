import '@/core/i18n';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SplashScreen } from '../SplashScreen';
import { useAuthStore } from '@/core/session/auth.store';
import {
  requestAppPermissions,
  checkAppPermissions,
  openAppSettings,
  onAppForeground,
} from '@/core/utils/permissions';
import { askForExactAlarms, isExactAlarmAllowed } from '@/core/services/monitor/monitorAccess';

jest.mock('@/core/session/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/core/services/monitor/monitorAccess', () => ({
  askForExactAlarms: jest.fn().mockResolvedValue(undefined),
  isExactAlarmAllowed: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/core/utils/permissions', () => ({
  requestAppPermissions: jest.fn(),
  checkAppPermissions: jest.fn(),
  openAppSettings: jest.fn(),
  onAppForeground: jest.fn(() => jest.fn()),
}));

describe('SplashScreen', () => {
  const bootstrap = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (isExactAlarmAllowed as jest.Mock).mockResolvedValue(true);
    bootstrap.mockResolvedValue(undefined);
    (useAuthStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { bootstrap: typeof bootstrap }) => unknown) => selector({ bootstrap }),
    );
  });

  it('requests permissions on mount and calls bootstrap() once granted', async () => {
    (requestAppPermissions as jest.Mock).mockResolvedValue('granted');
    render(<SplashScreen />);

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
  });

  it('starts the app at once when exact alarms are already allowed', async () => {
    (requestAppPermissions as jest.Mock).mockResolvedValue('granted');
    render(<SplashScreen />);

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
    expect(askForExactAlarms).not.toHaveBeenCalled();
    expect(screen.queryByText('Permission required')).toBeNull();
  });

  it("exact alarms off: Android's blocking dialog, one button, and the app does not start", async () => {
    (isExactAlarmAllowed as jest.Mock).mockResolvedValue(false);
    (requestAppPermissions as jest.Mock).mockResolvedValue('granted');
    render(<SplashScreen />);

    expect(await screen.findByText('Permission required')).toBeTruthy();
    expect(screen.getByText(/Tap Continue, then turn on Alarms & reminders/)).toBeTruthy();
    expect(screen.queryByText('Cancel')).toBeNull();
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it('Continue opens Alarms & reminders; allowed on return, the app starts', async () => {
    (isExactAlarmAllowed as jest.Mock).mockResolvedValueOnce(false).mockResolvedValue(true);
    (requestAppPermissions as jest.Mock).mockResolvedValue('granted');
    render(<SplashScreen />);

    fireEvent.press(await screen.findByText('Continue'));

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
    expect(askForExactAlarms).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('Permission required')).toBeNull());
  });

  it('still off on return: the dialog stays and the app does not start', async () => {
    (isExactAlarmAllowed as jest.Mock).mockResolvedValue(false);
    (requestAppPermissions as jest.Mock).mockResolvedValue('granted');
    render(<SplashScreen />);

    fireEvent.press(await screen.findByText('Continue'));

    await waitFor(() => expect(askForExactAlarms).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Permission required')).toBeTruthy();
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it('a failing exact-alarm check lets the app start rather than lock it out', async () => {
    (isExactAlarmAllowed as jest.Mock).mockRejectedValue(new Error('no module'));
    (requestAppPermissions as jest.Mock).mockResolvedValue('granted');
    render(<SplashScreen />);

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
  });

  it('does not ask for exact alarms while a runtime permission is denied', async () => {
    (requestAppPermissions as jest.Mock).mockResolvedValue('denied');
    render(<SplashScreen />);

    expect(await screen.findByText('Permissions Required')).toBeTruthy();
    expect(askForExactAlarms).not.toHaveBeenCalled();
  });

  it('shows the permission-denied dialog and never bootstraps when denied', async () => {
    (requestAppPermissions as jest.Mock).mockResolvedValue('denied');
    render(<SplashScreen />);

    expect(await screen.findByText('Permissions Required')).toBeTruthy();
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it('retrying after a denial and getting granted calls bootstrap()', async () => {
    (requestAppPermissions as jest.Mock)
      .mockResolvedValueOnce('denied')
      .mockResolvedValueOnce('granted');
    render(<SplashScreen />);

    fireEvent.press(await screen.findByRole('button', { name: 'Retry permission request' }));

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
  });

  it('shows the permanent-denial copy and Open Settings action for never_ask_again', async () => {
    (requestAppPermissions as jest.Mock).mockResolvedValue('never_ask_again');
    render(<SplashScreen />);

    expect(
      await screen.findByText(
        'Some permissions were permanently denied. Please enable them in App Settings to continue.',
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Open app settings' }));
    expect(openAppSettings).toHaveBeenCalledTimes(1);
  });

  it('re-checks permissions on app foreground while permanently denied', async () => {
    (requestAppPermissions as jest.Mock).mockResolvedValue('never_ask_again');
    (checkAppPermissions as jest.Mock).mockResolvedValue('granted');
    render(<SplashScreen />);

    await screen.findByText('Permissions Required');
    expect(onAppForeground).toHaveBeenCalledTimes(1);

    // Simulate returning from Settings by invoking the registered callback.
    const foregroundCallback = (onAppForeground as jest.Mock).mock.calls[0][0] as () => void;
    foregroundCallback();

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
  });
});
