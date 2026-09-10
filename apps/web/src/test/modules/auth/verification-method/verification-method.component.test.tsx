import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VerificationMethodComponent } from '../../../../modules/auth/verification-method/verification-method.component';

const mutate = vi.fn();
vi.mock('../../../../hooks/mutations/useRequestOtp', () => ({
  useRequestOtp: () => ({ mutate, isPending: false }),
}));

beforeEach(() => {
  mutate.mockClear();
});

function ForgotPasswordProbe() {
  return <p>forgot-password-screen</p>;
}
function OtpProbe() {
  return <p>otp-screen</p>;
}

function renderScreen(state?: { username?: string }) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/auth/verification-method', state }]}
    >
      <Routes>
        <Route
          path="/auth/verification-method"
          element={<VerificationMethodComponent />}
        />
        <Route path="/auth/forgot-password" element={<ForgotPasswordProbe />} />
        <Route path="/auth/otp-verification" element={<OtpProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('VerificationMethodComponent', () => {
  it('redirects to forgot-password when no username is present in route state', async () => {
    renderScreen(undefined);
    expect(await screen.findByText('forgot-password-screen')).toBeInTheDocument();
  });

  it('renders the phone/email tabs (reused from forgot-username) when username is present', () => {
    renderScreen({ username: 'nurse1' });
    expect(screen.getByPlaceholderText('Enter Mobile Number')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Choose verification method' })
    ).toBeInTheDocument();
  });

  it('calls requestOtp with otpFor: password and the username, then navigates to otp-verification', async () => {
    renderScreen({ username: 'nurse1' });

    fireEvent.input(screen.getByPlaceholderText('Enter Mobile Number'), {
      target: { value: '9876543210' },
    });
    const submitButton = screen.getByRole('button', { name: /next/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { otpFor: 'password', username: 'nurse1', via: 'phone', value: '9876543210' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });
});
