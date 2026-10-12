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

jest.mock('@/core/session/auth.store', () => ({
  useAuthStore: jest.fn(),
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
