import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OtpVerificationComponent } from '../../../../modules/auth/otp-verification/otp-verification.component';
import { showToast } from '../../../../services/toast';

const requestOtpMutate = vi.fn();
const verifyOtpMutate = vi.fn();
vi.mock('../../../../hooks/mutations/useRequestOtp', () => ({
  useRequestOtp: () => ({ mutate: requestOtpMutate, isPending: false }),
}));
vi.mock('../../../../hooks/mutations/useVerifyOtp', () => ({
  useVerifyOtp: () => ({ mutate: verifyOtpMutate, isPending: false }),
}));
vi.mock('../../../../services/toast', () => ({ showToast: vi.fn() }));

function LoginProbe() {
  return <p>login-screen</p>;
}
function SetupPasswordProbe() {
  return <p>setup-new-password-screen</p>;
}

function renderScreen(state: Record<string, unknown> | undefined) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/auth/otp-verification', state }]}>
      <Routes>
        <Route path="/auth/otp-verification" element={<OtpVerificationComponent />} />
        <Route path="/auth/login" element={<LoginProbe />} />
        <Route path="/auth/setup-new-password" element={<SetupPasswordProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

function typeOtp(digits: string) {
  const boxes = screen.getAllByLabelText(/OTP digit/);
  digits.split('').forEach((digit, i) => {
    fireEvent.change(boxes[i], { target: { value: digit } });
  });
}

beforeEach(() => {
  requestOtpMutate.mockClear();
  verifyOtpMutate.mockClear();
  vi.mocked(showToast).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OtpVerificationComponent — verifyFor: "password"', () => {
  it('redirects to login when route state is missing', async () => {
    renderScreen(undefined);
    expect(await screen.findByText('login-screen')).toBeInTheDocument();
  });

  it('redirects to login when verifyFor is missing even if a phoneNumber is present', async () => {
    renderScreen({ phoneNumber: '9876543210', countryCode: '91' });
    expect(await screen.findByText('login-screen')).toBeInTheDocument();
  });

  it('shows the masked phone number and starts the 60s countdown (no Resend link yet)', () => {
    renderScreen({ verifyFor: 'password', phoneNumber: '9876543210', countryCode: '91' });
    expect(screen.getByText(/98765\*\*\*\*\*10/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument();
  });

  it('reveals Resend after the 60s countdown elapses and re-requests the OTP with the same fields on click', () => {
    // Fake timers only for this synchronous test — findBy/waitFor elsewhere
    // in this suite poll via real setTimeout, which fake timers would freeze.
    vi.useFakeTimers();
    renderScreen({ verifyFor: 'password', phoneNumber: '9876543210', countryCode: '91' });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    const resendButton = screen.getByRole('button', { name: 'Resend' });
    fireEvent.click(resendButton);

    expect(requestOtpMutate).toHaveBeenCalledWith({
      otpFor: 'password',
      phoneNumber: '9876543210',
      countryCode: '91',
      email: undefined,
    });
  });

  it('verifies with phoneNumber/countryCode/otp and navigates to setup-new-password with the returned userUuid + resetToken', async () => {
    verifyOtpMutate.mockImplementation((_vars, { onSuccess }) =>
      onSuccess({ verified: true, userUuid: 'u-1', resetToken: 'reset-tok', expiresIn: 300 })
    );
    renderScreen({
      verifyFor: 'password',
      phoneNumber: '9876543210',
      countryCode: '91',
      username: 'nurse1',
    });

    typeOtp('123456');
    const verifyButton = screen.getByRole('button', { name: 'Verify' });
    await waitFor(() => expect(verifyButton).not.toBeDisabled());
    fireEvent.click(verifyButton);

    await waitFor(() =>
      expect(verifyOtpMutate).toHaveBeenCalledWith(
        {
          verifyFor: 'password',
          phoneNumber: '9876543210',
          countryCode: '91',
          email: undefined,
          otp: '123456',
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
    expect(
      await screen.findByText('setup-new-password-screen')
    ).toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalled();
  });
});

describe('OtpVerificationComponent — verifyFor: "username"', () => {
  it('shows the masked email and via "email id" wording when only an email is present', () => {
    renderScreen({ verifyFor: 'username', email: 'nurse1@example.com' });
    expect(screen.getByText(/email id/)).toBeInTheDocument();
    expect(screen.getByText(/nurse\*+\.com/)).toBeInTheDocument();
  });

  it('verifies with email/otp, shows the "Username Sent" toast, and navigates back to login (no resetToken/userUuid needed)', async () => {
    verifyOtpMutate.mockImplementation((_vars, { onSuccess }) => onSuccess({ verified: true }));
    renderScreen({ verifyFor: 'username', email: 'nurse1@example.com' });

    typeOtp('123456');
    const verifyButton = screen.getByRole('button', { name: 'Verify' });
    await waitFor(() => expect(verifyButton).not.toBeDisabled());
    fireEvent.click(verifyButton);

    await waitFor(() =>
      expect(verifyOtpMutate).toHaveBeenCalledWith(
        {
          verifyFor: 'username',
          phoneNumber: undefined,
          countryCode: undefined,
          email: 'nurse1@example.com',
          otp: '123456',
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
    expect(showToast).toHaveBeenCalledWith(
      'Username Sent',
      'Your username has been sent — please check your email.',
      'success'
    );
    expect(await screen.findByText('login-screen')).toBeInTheDocument();
  });
});
