import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginComponent } from '../../../modules/auth/login.component';

const mutate = vi.fn();
vi.mock('../../../hooks/mutations/useLogin', () => ({
  useLogin: () => ({ mutate, isPending: false, error: null }),
}));

beforeEach(() => {
  mutate.mockClear();
});

// Stubbed so this test doesn't depend on the real grecaptcha script load
// (covered separately in recaptcha.component.test.tsx) — solves the
// captcha immediately on mount so the rest of the form's validity can be
// exercised by just filling in username/password. The "clear" button lets
// a test simulate the widget's real expired-callback (onChange(null)).
vi.mock('../../../components/common/recaptcha.component', () => ({
  RecaptchaComponent: ({
    onChange,
  }: {
    onChange: (token: string | null) => void;
  }) => {
    onChange('test-token');
    return (
      <button type="button" onClick={() => onChange(null)}>
        clear-recaptcha
      </button>
    );
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

  it('re-disables the submit button if the recaptcha token is cleared (expired-callback)', async () => {
    render(
      <MemoryRouter>
        <LoginComponent />
      </MemoryRouter>
    );

    fillCredentials();
    const submitButton = screen.getByRole('button', { name: /login/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: 'clear-recaptcha' }));

    await waitFor(() => expect(submitButton).toBeDisabled());
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

  it('shows a validation message under username after a submit attempt with it left blank', async () => {
    const { container } = render(
      <MemoryRouter>
        <LoginComponent />
      </MemoryRouter>
    );

    // The submit button stays disabled while the form is invalid (username
    // blank), so firing the native submit event directly on the <form> is
    // what actually exercises react-hook-form's isSubmitted flag here —
    // matching how a keyboard Enter in a field would trigger it too.
    fireEvent.submit(container.querySelector('form')!);

    expect(
      await screen.findByText('Please enter username')
    ).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
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
