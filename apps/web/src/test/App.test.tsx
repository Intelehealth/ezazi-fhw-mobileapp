import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Same reasoning as routes/app.routes.test.tsx: AppRoutes' router reads
// window.location at module-eval time, and store/hooks + useLogin are
// mocked to route around this monorepo's dual-React react-redux hazard
// and avoid needing a QueryClientProvider here — App.tsx's own job is just
// composing AppUIProvider + AppRoutes + ToastContainer, already covered
// individually by their own test suites.
vi.mock('../store/hooks', () => ({
  useAppSelector: vi.fn(() => false),
  useAppDispatch: () => vi.fn(),
}));

vi.mock('../hooks/mutations/useLogin', () => ({
  useLogin: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

describe('App', () => {
  afterEach(() => {
    window.history.pushState(null, '', '/');
  });

  it('renders the routed app shell with the toast container mounted', async () => {
    vi.resetModules();
    window.history.pushState(null, '', '/auth/login');
    const { default: App } = await import('../App');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Login' })
    ).toBeInTheDocument();
    expect(document.querySelector('.Toastify')).not.toBeNull();
  });
});
