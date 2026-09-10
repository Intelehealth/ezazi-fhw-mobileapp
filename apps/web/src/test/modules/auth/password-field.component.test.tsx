import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PasswordFieldComponent } from '../../../modules/auth/password-field.component';

describe('PasswordFieldComponent', () => {
  it('toggles the input between password and text on eye-icon click', () => {
    render(
      <MemoryRouter>
        <PasswordFieldComponent
          registration={{
            name: 'password',
            onChange: vi.fn(),
            onBlur: vi.fn(),
            ref: vi.fn(),
          }}
          forgotPasswordPath="/auth/forgot-password"
        />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button'));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button'));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows the forgot-password link and an error message when given one', () => {
    render(
      <MemoryRouter>
        <PasswordFieldComponent
          registration={{
            name: 'password',
            onChange: vi.fn(),
            onBlur: vi.fn(),
            ref: vi.fn(),
          }}
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
});
