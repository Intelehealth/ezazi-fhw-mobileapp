import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RouteErrorBoundary } from '../../../components/common/route-error-boundary.component';

function ThrowingPage(): never {
  throw new Error('boom');
}

function renderWithError(element: React.ReactElement) {
  const router = createMemoryRouter(
    [{ path: '/', element, errorElement: <RouteErrorBoundary /> }],
    { initialEntries: ['/'] }
  );
  return render(<RouterProvider router={router} />);
}

describe('RouteErrorBoundary', () => {
  it('renders the thrown error message instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithError(<ThrowingPage />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders a 404 route error response by status and statusText', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <div />,
          errorElement: <RouteErrorBoundary />,
          loader: () => {
            throw new Response('Not Found', {
              status: 404,
              statusText: 'Not Found',
            });
          },
        },
      ],
      { initialEntries: ['/'] }
    );
    render(<RouterProvider router={router} />);

    // The loader throw is only discovered after the router's initial
    // (async) data load settles, so the error UI isn't there synchronously.
    expect(await screen.findByText('404 Not Found')).toBeInTheDocument();
  });

  it('links back to the root route', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithError(<ThrowingPage />);

    expect(
      screen.getByRole('button', { name: 'Go to home' })
    ).toBeInTheDocument();
  });

  it('navigates to the root route when "Go to home" is clicked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const router = createMemoryRouter(
      [
        { path: '/', element: <p>Home</p> },
        {
          path: '/broken',
          element: <ThrowingPage />,
          errorElement: <RouteErrorBoundary />,
        },
      ],
      { initialEntries: ['/broken'] }
    );
    render(<RouterProvider router={router} />);

    await userEvent.click(screen.getByRole('button', { name: 'Go to home' }));

    expect(await screen.findByText('Home')).toBeInTheDocument();
  });

  it('falls back to a generic message for a thrown value that is neither an Error nor a route Response', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    function ThrowNonError(): never {
      throw 'just a string';
    }

    renderWithError(<ThrowNonError />);

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });
});
