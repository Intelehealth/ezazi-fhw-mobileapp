import '@/core/i18n';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ForgotPasswordRequestOtpScreen } from '../ForgotPasswordRequestOtpScreen';
import { usePasswordResetStore } from '@/features/auth/stores/passwordReset.store';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@/features/auth/stores/passwordReset.store', () => ({
  usePasswordResetStore: jest.fn(),
}));

function renderScreen() {
  const navigation = { navigate: mockNavigate, replace: mockReplace, goBack: mockGoBack } as never;
  const route = { params: { origin: 'Setup' as const } } as never;
  return render(<ForgotPasswordRequestOtpScreen navigation={navigation} route={route} />);
}

describe('ForgotPasswordRequestOtpScreen', () => {
  const requestOtp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePasswordResetStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { requestOtp: typeof requestOtp }) => unknown) => selector({ requestOtp }),
    );
  });

  it('renders the heading and phone field, with Send OTP disabled until a valid number is entered', () => {
    renderScreen();

    expect(screen.getByText('Forgot Password?')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter Mobile Number')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send OTP' }).props.accessibilityState.disabled).toBe(true);
  });

  it('enables Send OTP once a valid 10-digit number is entered', () => {
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Enter Mobile Number'), '8208574727');

    expect(screen.getByRole('button', { name: 'Send OTP' }).props.accessibilityState.disabled).toBe(false);
  });

  it('calls requestOtp() and replaces with ForgotPasswordVerify on success', async () => {
    requestOtp.mockResolvedValue({ ok: true, data: { message: 'sent' } });
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Enter Mobile Number'), '8208574727');
    fireEvent.press(screen.getByRole('button', { name: 'Send OTP' }));

    await waitFor(() =>
      expect(requestOtp).toHaveBeenCalledWith({ phoneNumber: '8208574727', countryCode: '91' }),
    );
    expect(mockReplace).toHaveBeenCalledWith('ForgotPasswordVerify', {
      phoneNumber: '8208574727',
      countryCode: '91',
      origin: 'Setup',
    });
  });

  it('shows the network banner and does not navigate when requestOtp() fails offline', async () => {
    requestOtp.mockResolvedValue({
      ok: false,
      error: { kind: 'network', status: 0, code: undefined, message: 'Network Error' },
    });
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Enter Mobile Number'), '8208574727');
    fireEvent.press(screen.getByRole('button', { name: 'Send OTP' }));

    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Please check your connection and try again.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('goes back when the header back button is tapped', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
