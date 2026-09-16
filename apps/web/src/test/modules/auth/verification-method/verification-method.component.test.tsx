import { configure } from '@testing-library/dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VerificationMethodComponent } from '../../../../modules/auth/verification-method/verification-method.component';

// This component renders the real react-international-phone <PhoneInput> —
// see auth-recovery-flows.test.tsx's own comment on the same issue: under
// CPU contention from the rest of the suite running concurrently, that
// dependency's transform/render cost can occasionally push a normally-fast
// assertion past find*/waitFor's 1000ms default and the file's own 5000ms
// test timeout. Both are raised here too, scoped to this file only.
vi.setConfig({ testTimeout: 20000 });
configure({ asyncUtilTimeout: 10000 });

const mutate = vi.fn();
vi.mock('../../../../hooks/mutations/useRequestOtp', () => ({
  useRequestOtp: () => ({ mutate, isPending: false }),
}));

beforeEach(() => {
  mutate.mockClear();
});

// react-international-phone's <PhoneInput> is a masked, keystroke-aware
// control: a single fireEvent.input() full-value replace loses the
// pre-filled "+91" India dial code entirely, which makes the library
// re-guess a country from the bare digits (matching Iran's "98" dial code
// instead of keeping India selected). Appending one digit at a time keeps
// every intermediate value prefixed with the already-selected country's
// dial code, the same way real keystrokes would.
function typePhone(nationalNumber: string) {
  const input = screen.getByPlaceholderText(
    'Enter Mobile Number'
  ) as HTMLInputElement;
  for (const digit of nationalNumber) {
    fireEvent.change(input, { target: { value: input.value + digit } });
  }
}

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

  it('splits the phone tab value into phoneNumber + countryCode (auth-gateway is phone-only) and navigates to otp-verification', async () => {
    renderScreen({ username: 'nurse1' });

    typePhone('9876543210');
    const submitButton = screen.getByRole('button', { name: /next/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { otpFor: 'password', phoneNumber: '9876543210', countryCode: '91' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });

  it('the email tab submits otpFor: "password" with the email field — auth-gateway supports email for password reset too', async () => {
    renderScreen({ username: 'nurse1' });

    fireEvent.click(screen.getByRole('button', { name: 'Email ID' }));
    fireEvent.input(screen.getByPlaceholderText('Enter Email ID'), {
      target: { value: 'nurse1@example.com' },
    });
    const submitButton = screen.getByRole('button', { name: /next/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { otpFor: 'password', email: 'nurse1@example.com' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });
});
