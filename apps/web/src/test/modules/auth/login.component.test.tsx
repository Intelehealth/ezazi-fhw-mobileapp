import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginComponent } from '../../../modules/auth/login.component';

const mutate = vi.fn();
vi.mock('../../../hooks/mutations/useLogin', () => ({
  useLogin: () => ({ mutate, isPending: false, error: null }),
}));

// Stubbed so this test doesn't depend on the real grecaptcha script load
// (covered separately in recaptcha.component.test.tsx) — solves the
// captcha immediately on mount so the rest of the form's validity can be
// exercised by just filling in username/password.
vi.mock('../../../components/common/recaptcha.component', () => ({
  RecaptchaComponent: ({ onChange }: { onChange: (token: string) => void }) => {
    onChange('test-token');
    return <div data-testid="recaptcha-stub" />;
  },
}));

function fillCredentials() {
  fireEvent.input(screen.getByPlaceholderText('Enter username'), {
    target: { value: 'nurse1' },
  });
  fireEvent.input(screen.getByPlaceholderText('Enter password'), {
    target: { value: 'secret' },
  });
}

describe('LoginComponent', () => {
  it('renders outlined/disabled until valid, then filled/enabled — matching login.component.ts\'s [disabled]="loginForm.invalid" binding', async () => {
    render(
      <MemoryRouter>
        <LoginComponent />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole('button', { name: /login/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton.className).toContain('border-[#2E1E91]');

    fillCredentials();

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    expect(submitButton.className).toContain('bg-[#2E1E91]');
  });

  it('calls the login mutation with the entered credentials and solved captcha on submit', async () => {
    render(
      <MemoryRouter>
        <LoginComponent />
      </MemoryRouter>
    );

    fillCredentials();
    const submitButton = screen.getByRole('button', { name: /login/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith({
        username: 'nurse1',
        password: 'secret',
        recaptcha: 'test-token',
      })
    );
  });

  it('renders the forgot-username/forgot-password links pointing at their auth routes', () => {
    render(
      <MemoryRouter>
        <LoginComponent />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('link', { name: 'Forgot Username ?' })
    ).toHaveAttribute('href', '/auth/forgot-username');
    expect(
      screen.getByRole('link', { name: 'Forgot Password ?' })
    ).toHaveAttribute('href', '/auth/forgot-password');
  });
});
