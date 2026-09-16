import { configure } from '@testing-library/dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotUsernameComponent } from '../../../../modules/auth/forgot-username/forgot-username.component';

// This component renders the real react-international-phone <PhoneInput> —
// see auth-recovery-flows.test.tsx's comment on the same issue: under CPU
// contention from the rest of the suite running concurrently, that
// dependency's transform/render cost can occasionally push a normally-fast
// assertion past find*/waitFor's 1000ms default. Raised here too, scoped to
// this file only.
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

describe('ForgotUsernameComponent', () => {
  it('renders the phone tab by default with the Next button outlined until valid', async () => {
    render(
      <MemoryRouter>
        <ForgotUsernameComponent />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Enter Mobile Number')).toBeInTheDocument();
    const submitButton = screen.getByRole('button', { name: /next/i });
    expect(submitButton).toBeDisabled();

    typePhone('9876543210');

    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it('submits the phone tab as otpFor: "username" and navigates to otp-verification on success', async () => {
    render(
      <MemoryRouter>
        <ForgotUsernameComponent />
      </MemoryRouter>
    );

    typePhone('9876543210');
    const submitButton = screen.getByRole('button', { name: /next/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { otpFor: 'username', phoneNumber: '9876543210', countryCode: '91' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });

  it('switches to the email tab, clearing the phone value, and validates the email field', async () => {
    render(
      <MemoryRouter>
        <ForgotUsernameComponent />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Email ID' }));
    expect(screen.getByPlaceholderText('Enter Email ID')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter Mobile Number')).not.toBeInTheDocument();

    fireEvent.submit(screen.getByRole('button', { name: /next/i }).closest('form')!);
    expect(await screen.findByText('Please enter email')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits the email tab as otpFor: "username" with the email field, not phoneNumber', async () => {
    render(
      <MemoryRouter>
        <ForgotUsernameComponent />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Email ID' }));
    fireEvent.input(screen.getByPlaceholderText('Enter Email ID'), {
      target: { value: 'nurse1@example.com' },
    });
    const submitButton = screen.getByRole('button', { name: /next/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { otpFor: 'username', email: 'nurse1@example.com' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });
});
