import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotUsernameComponent } from '../../../../modules/auth/forgot-username/forgot-username.component';

const mutate = vi.fn();
vi.mock('../../../../hooks/mutations/useRequestOtp', () => ({
  useRequestOtp: () => ({ mutate, isPending: false }),
}));

beforeEach(() => {
  mutate.mockClear();
});

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

    fireEvent.input(screen.getByPlaceholderText('Enter Mobile Number'), {
      target: { value: '9876543210' },
    });

    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it('submits the phone tab value via requestOtp and navigates to otp-verification on success', async () => {
    render(
      <MemoryRouter>
        <ForgotUsernameComponent />
      </MemoryRouter>
    );

    fireEvent.input(screen.getByPlaceholderText('Enter Mobile Number'), {
      target: { value: '9876543210' },
    });
    const submitButton = screen.getByRole('button', { name: /next/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { otpFor: 'username', via: 'phone', value: '9876543210' },
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
});
