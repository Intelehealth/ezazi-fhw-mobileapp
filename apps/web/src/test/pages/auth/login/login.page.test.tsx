import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoginPage from '../../../../pages/auth/login/login.page';
import { renderWithProviders } from '../../../test-providers';

describe('LoginPage', () => {
  it('renders the real login module through the shared provider wrapper', () => {
    // Exercises the actual LoginComponent (not a stub) via
    // renderWithProviders — its useLogin() hook needs QueryClientProvider,
    // and its "Forgot Username/Password ?" links need a Router, both of
    // which this shared wrapper supplies (migration guide §3's
    // test/providers.tsx). LoginComponent's own deeper behavior (validation,
    // submit, mutation wiring) has its own full suite under
    // test/modules/auth — this is just the composition smoke test.
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });
});
