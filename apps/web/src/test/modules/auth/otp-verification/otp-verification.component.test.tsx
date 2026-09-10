import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OtpVerificationComponent } from '../../../../modules/auth/otp-verification/otp-verification.component';

const requestOtpMutate = vi.fn();
const verifyOtpMutate = vi.fn();
vi.mock('../../../../hooks/mutations/useRequestOtp', () => ({
  useRequestOtp: () => ({ mutate: requestOtpMutate, isPending: false }),
}));
vi.mock('../../../../hooks/mutations/useVerifyOtp', () => ({
  useVerifyOtp: () => ({ mutate: verifyOtpMutate, isPending: false }),
}));

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
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OtpVerificationComponent', () => {
  it('redirects to login when route state is missing', async () => {
    renderScreen(undefined);
    expect(await screen.findByText('login-screen')).toBeInTheDocument();
  });

  it('shows the masked destination and starts the 60s countdown (no Resend link yet)', () => {
    renderScreen({ verificationFor: 'forgot-username', via: 'phone', value: '9876543210' });
    expect(screen.getByText(/98765\*\*\*\*\*10/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument();
  });

  it('reveals Resend after the 60s countdown elapses and re-requests the OTP on click', () => {
    // Fake timers only for this synchronous test — findBy/waitFor elsewhere
    // in this suite poll via real setTimeout, which fake timers would freeze.
    vi.useFakeTimers();
    renderScreen({ verificationFor: 'forgot-username', via: 'phone', value: '9876543210' });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    const resendButton = screen.getByRole('button', { name: 'Resend' });
    fireEvent.click(resendButton);

    expect(requestOtpMutate).toHaveBeenCalledWith({
      otpFor: 'username',
      via: 'phone',
      value: '9876543210',
    });
  });

  it('verifies for forgot-username and navigates back to login on success', async () => {
    verifyOtpMutate.mockImplementation((_vars, { onSuccess }) =>
      onSuccess({ success: true, userUuid: 'mock-user-uuid-1234' })
    );
    renderScreen({ verificationFor: 'forgot-username', via: 'phone', value: '9876543210' });

    typeOtp('123456');
    const verifyButton = screen.getByRole('button', { name: 'Verify' });
    await waitFor(() => expect(verifyButton).not.toBeDisabled());
    fireEvent.click(verifyButton);

    expect(await screen.findByText('login-screen')).toBeInTheDocument();
  });

  it('verifies for forgot-password and navigates to setup-new-password with the mocked userUuid', async () => {
    verifyOtpMutate.mockImplementation((_vars, { onSuccess }) =>
      onSuccess({ success: true, userUuid: 'mock-user-uuid-1234' })
    );
    renderScreen({
      verificationFor: 'forgot-password',
      via: 'email',
      value: 'nurse1@example.com',
      username: 'nurse1',
    });

    typeOtp('123456');
    const verifyButton = screen.getByRole('button', { name: 'Verify' });
    await waitFor(() => expect(verifyButton).not.toBeDisabled());
    fireEvent.click(verifyButton);

    expect(
      await screen.findByText('setup-new-password-screen')
    ).toBeInTheDocument();
  });

  it('passes the exact "000000" failure code straight through to verifyOtp (mock rejects it)', async () => {
    renderScreen({ verificationFor: 'forgot-username', via: 'phone', value: '9876543210' });

    typeOtp('000000');
    const verifyButton = screen.getByRole('button', { name: 'Verify' });
    await waitFor(() => expect(verifyButton).not.toBeDisabled());
    fireEvent.click(verifyButton);

    await waitFor(() =>
      expect(verifyOtpMutate).toHaveBeenCalledWith(
        expect.objectContaining({ otp: '000000' }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });
});
