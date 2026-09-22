import '@/core/i18n';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ForgotPasswordResetScreen } from '../ForgotPasswordResetScreen';
import { usePasswordResetStore } from '@/features/auth/stores/passwordReset.store';

const mockGoBack = jest.fn();
const mockReset = jest.fn();

jest.mock('@/features/auth/stores/passwordReset.store', () => ({
  usePasswordResetStore: jest.fn(),
}));

function renderScreen() {
  const navigation = { goBack: mockGoBack, reset: mockReset } as never;
  const route = {
    params: { userUuid: 'u-1', resetToken: 'reset-jwt', origin: 'Setup' as const },
  } as never;
  return render(<ForgotPasswordResetScreen navigation={navigation} route={route} />);
}

describe('ForgotPasswordResetScreen', () => {
  const resetPassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePasswordResetStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { resetPassword: typeof resetPassword }) => unknown) =>
        selector({ resetPassword }),
    );
  });

  it('renders both password fields and the requirements checklist, with Reset Password disabled', () => {
    renderScreen();

    expect(screen.getByPlaceholderText('Enter new password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Re-enter new password')).toBeTruthy();
    expect(screen.getByText('At least 8 characters')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset Password' }).props.accessibilityState.disabled).toBe(true);
  });

  it('enables Reset Password once both fields hold a matching, valid password', () => {
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Enter new password'), 'Doctor@123');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'Doctor@123');

    expect(screen.getByRole('button', { name: 'Reset Password' }).props.accessibilityState.disabled).toBe(false);
  });

  it('calls resetPassword() with the resetToken from route params and shows the success dialog', async () => {
    resetPassword.mockResolvedValue({ ok: true, data: {} });
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Enter new password'), 'Doctor@123');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'Doctor@123');
    fireEvent.press(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({
        userUuid: 'u-1',
        newPassword: 'Doctor@123',
        resetToken: 'reset-jwt',
      }),
    );
    expect(await screen.findByText('Successful')).toBeTruthy();
  });

  it('shows the network banner and no success dialog when resetPassword() fails offline', async () => {
    resetPassword.mockResolvedValue({
      ok: false,
      error: { kind: 'network', status: 0, code: undefined, message: 'Network Error' },
    });
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Enter new password'), 'Doctor@123');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'Doctor@123');
    fireEvent.press(screen.getByRole('button', { name: 'Reset Password' }));

    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Please check your connection and try again.')).toBeTruthy();
    expect(screen.queryByText('Successful')).toBeNull();
  });

  it('"Back to Login" resets the nav stack to the origin screen', async () => {
    resetPassword.mockResolvedValue({ ok: true, data: {} });
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Enter new password'), 'Doctor@123');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'Doctor@123');
    fireEvent.press(screen.getByRole('button', { name: 'Reset Password' }));

    fireEvent.press(await screen.findByRole('button', { name: 'Back to Login' }));

    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Setup' }] });
  });

  it('goes back when the header back button is tapped', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
