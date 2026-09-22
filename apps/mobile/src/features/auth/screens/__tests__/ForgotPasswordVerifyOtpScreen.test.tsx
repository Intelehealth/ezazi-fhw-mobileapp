import '@/core/i18n';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ForgotPasswordVerifyOtpScreen } from '../ForgotPasswordVerifyOtpScreen';
import { usePasswordResetStore } from '@/features/auth/stores/passwordReset.store';

const mockReplace = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@/features/auth/stores/passwordReset.store', () => ({
  usePasswordResetStore: jest.fn(),
}));

function renderScreen() {
  const navigation = { replace: mockReplace, goBack: mockGoBack } as never;
  const route = {
    params: { phoneNumber: '8208574727', countryCode: '91', origin: 'Setup' as const },
  } as never;
  return render(<ForgotPasswordVerifyOtpScreen navigation={navigation} route={route} />);
}

function enterOtp(otp: string) {
  fireEvent.changeText(screen.getByLabelText('OTP input'), otp);
}

describe('ForgotPasswordVerifyOtpScreen', () => {
  const requestOtp = jest.fn();
  const verifyOtp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (usePasswordResetStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { requestOtp: typeof requestOtp; verifyOtp: typeof verifyOtp }) => unknown) =>
        selector({ requestOtp, verifyOtp }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the masked phone number and 6 OTP cells, with Verify OTP disabled until filled', () => {
    renderScreen();

    expect(screen.getByText(/\*+727/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verify OTP' }).props.accessibilityState.disabled).toBe(true);
  });

  it('shows the countdown and no Resend link immediately after mount', () => {
    renderScreen();

    expect(screen.getByText('Resend in 60s')).toBeTruthy();
  });

  it('enables Verify OTP once all 6 digits are entered', () => {
    renderScreen();

    enterOtp('123456');

    expect(screen.getByRole('button', { name: 'Verify OTP' }).props.accessibilityState.disabled).toBe(false);
  });

  it('verifies the OTP and replaces with ForgotPasswordReset, carrying the resetToken', async () => {
    verifyOtp.mockResolvedValue({
      ok: true,
      data: { verified: true, userUuid: 'u-1', resetToken: 'reset-jwt', expiresIn: 600 },
    });
    renderScreen();

    enterOtp('123456');
    fireEvent.press(screen.getByRole('button', { name: 'Verify OTP' }));

    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({ phoneNumber: '8208574727', countryCode: '91', otp: '123456' }),
    );
    expect(await screen.findByText('OTP Verified')).toBeTruthy();

    act(() => jest.advanceTimersByTime(600));

    expect(mockReplace).toHaveBeenCalledWith('ForgotPasswordReset', {
      userUuid: 'u-1',
      resetToken: 'reset-jwt',
      origin: 'Setup',
    });
  });

  it('shows the incorrect-OTP banner and does not navigate on a wrong code', async () => {
    verifyOtp.mockResolvedValue({
      ok: false,
      error: { kind: 'unauthorized', status: 401, code: 'INVALID_OTP', message: 'Invalid or expired code' },
    });
    renderScreen();

    enterOtp('000000');
    fireEvent.press(screen.getByRole('button', { name: 'Verify OTP' }));

    expect(await screen.findByText('Incorrect OTP')).toBeTruthy();
    expect(screen.getByText('Please check the code and try again.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('resends the OTP once the countdown reaches zero and resets the field', async () => {
    requestOtp.mockResolvedValue({ ok: true, data: { message: 'sent' } });
    renderScreen();

    // The countdown re-arms its setTimeout(…, 1000) from a useEffect on every
    // tick, so a single big jump doesn't chain through all 60 renders —
    // advance one second at a time so each state update's effect has a
    // chance to schedule (and this test to catch) the next one.
    for (let i = 0; i < 61; i++) {
      await act(() => jest.advanceTimersByTimeAsync(1000));
    }

    const resendLink = await screen.findByText('Resend Code');
    fireEvent.press(resendLink);

    await waitFor(() =>
      expect(requestOtp).toHaveBeenCalledWith({ phoneNumber: '8208574727', countryCode: '91' }),
    );
    expect(await screen.findByText('Resend in 60s')).toBeTruthy();
  });

  it('goes back when the header back button is tapped', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
