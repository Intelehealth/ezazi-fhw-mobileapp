import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ForgotPasswordPage from '../../../../pages/auth/forgot-password/forgot-password.page';
import { renderWithProviders } from '../../../test-providers';

describe('ForgotPasswordPage', () => {
  it('renders the real forgot-password module through the shared provider wrapper', () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(
      screen.getByRole('heading', { name: 'Forgot Password' })
    ).toBeInTheDocument();
  });
});
