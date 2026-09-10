import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthLayoutComponent } from '../../../components/layout/auth-layout.component';
import { clientConfig } from '../../../config/clients';

describe('AuthLayoutComponent', () => {
  it('renders the active client logo and tagline', () => {
    render(
      <MemoryRouter>
        <AuthLayoutComponent>
          <p>routed form content</p>
        </AuthLayoutComponent>
      </MemoryRouter>
    );

    const logos = screen.getAllByAltText(clientConfig.displayName);
    expect(logos.length).toBeGreaterThan(0);
    logos.forEach(logo =>
      expect(logo).toHaveAttribute('src', clientConfig.assets.logo)
    );
    expect(screen.getByText(/Empowering labor management/)).toBeInTheDocument();
  });

  it('renders the given children rather than requiring a router Outlet', () => {
    render(
      <MemoryRouter>
        <AuthLayoutComponent>
          <p data-testid="routed-content">routed form content</p>
        </AuthLayoutComponent>
      </MemoryRouter>
    );

    expect(screen.getByTestId('routed-content')).toBeInTheDocument();
  });
});
