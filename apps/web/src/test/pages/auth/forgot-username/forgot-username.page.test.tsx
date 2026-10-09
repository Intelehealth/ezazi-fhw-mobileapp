import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ForgotUsernamePage from '../../../../pages/auth/forgot-username/forgot-username.page';
import { renderWithProviders } from '../../../test-providers';

describe('ForgotUsernamePage', () => {
  it('renders the real forgot-username module through the shared provider wrapper', () => {
    renderWithProviders(<ForgotUsernamePage />);
    expect(
      screen.getByRole('heading', { name: 'Forgot Username' })
    ).toBeInTheDocument();
  });
});
