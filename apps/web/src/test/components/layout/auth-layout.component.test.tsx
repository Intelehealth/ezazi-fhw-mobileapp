import { render, screen } from '@testing-library/react';
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from 'react-router-dom';
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

  it('renders a nested route via Outlet when no children are passed', async () => {
    const router = createMemoryRouter(
      [
        {
          element: <AuthLayoutComponent />,
          children: [
            {
              index: true,
              element: <p data-testid="outlet-content">from outlet</p>,
            },
          ],
        },
      ],
      { initialEntries: ['/'] }
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByTestId('outlet-content')).toBeInTheDocument();
  });
});
