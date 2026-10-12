import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PasswordFieldComponent } from '../../../components/auth/password-field.component';

function registration() {
  return { name: 'password', onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() };
}

describe('PasswordFieldComponent', () => {
  it('toggles the input between password and text on eye-icon click', () => {
    render(
      <MemoryRouter>
        <PasswordFieldComponent registration={registration()} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: '' }));
    expect(input).toHaveAttribute('type', 'text');
  });

  it('shows the forgot-password link and an error message when given one', () => {
    render(
      <MemoryRouter>
        <PasswordFieldComponent
          registration={registration()}
          forgotPasswordPath="/auth/forgot-password"
          errorMessage="Please enter valid password"
        />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('link', { name: 'Forgot Password ?' })
    ).toHaveAttribute('href', '/auth/forgot-password');
    expect(screen.getByText('Please enter valid password')).toBeInTheDocument();
  });

  it('omits the forgot-password link when no path is given (setup-new-password usage)', () => {
    render(
      <MemoryRouter>
        <PasswordFieldComponent registration={registration()} />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('supports custom id/label/placeholder and an optional generate-password link', () => {
    const onGeneratePassword = vi.fn();
    render(
      <MemoryRouter>
        <PasswordFieldComponent
          registration={registration()}
          id="confirmPassword"
          label="Confirm new password"
          placeholder="Re-enter new password"
          onGeneratePassword={onGeneratePassword}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Confirm new password')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Re-enter new password')
    ).toHaveAttribute('id', 'confirmPassword');

    fireEvent.click(screen.getByRole('button', { name: 'Generate password' }));
    expect(onGeneratePassword).toHaveBeenCalledTimes(1);
  });
});
