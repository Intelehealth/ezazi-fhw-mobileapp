import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppSelector } from '../../store/hooks';

/**
 * End-to-end walkthroughs of both recovery flows (forgot-username and
 * forgot-password), rendering the ACTUAL router (routes/app.routes.tsx) and
 * clicking through it with React Testing Library — this environment has no
 * browser/e2e tool (no Playwright/Cypress), so this RTL integration suite is
 * what stands in for a live browser walkthrough of the full flow end to end.
 *
 * Same window.history.pushState + fresh dynamic import per test as
 * routes/app.routes.test.tsx, for the same reason (the router reads
 * window.location once at module-eval time). store/hooks and useLogin are
 * mocked for the same dual-React-hoisting reason as that file; the OTP/reset
 * hooks are NOT mocked here — this suite exercises the real mock hooks
 * (useRequestOtp/useVerifyOtp/useResetPassword) end to end, including their
 * "fail"/000000 trigger convention. mock-utils' network delay is sped up so
 * this doesn't spend real seconds waiting on it.
 */
vi.mock('../../store/hooks', () => ({
  useAppSelector: vi.fn(() => false),
  useAppDispatch: () => vi.fn(),
}));

vi.mock('../../hooks/mutations/useLogin', () => ({
  useLogin: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

vi.mock('../../hooks/mutations/mock-utils', async () => {
  const actual = await vi.importActual<
    typeof import('../../hooks/mutations/mock-utils')
  >('../../hooks/mutations/mock-utils');
  return { ...actual, simulateNetworkDelay: vi.fn().mockResolvedValue(undefined) };
});

function mockIsAuthenticated(isAuthenticated: boolean) {
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: { user: null, token: null, isAuthenticated },
      config: { data: null, error: null, lastFetched: null },
    })
  );
}

async function renderAtPath(path: string) {
  vi.resetModules();
  window.history.pushState(null, '', path);
  // @tanstack/react-query is imported dynamically too, AFTER resetModules —
  // importing it statically at the top of this file would resolve to a
  // different module instance (and thus a different QueryClientContext
  // object) than the one app.routes' own dependency tree picks up via this
  // dynamic import, which silently breaks "No QueryClient set" style context
  // matching despite a provider visibly wrapping the tree.
  const { QueryClient, QueryClientProvider } = await import(
    '@tanstack/react-query'
  );
  const { AppRoutes } = await import('../../routes/app.routes');
  // main.tsx is the only place QueryClientProvider normally wraps AppRoutes
  // (App.tsx itself doesn't) — the new screens' real useRequestOtp/
  // useVerifyOtp/useResetPassword hooks need one here since this suite
  // exercises them unmocked.
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}

function typeOtp(digits: string) {
  const boxes = screen.getAllByLabelText(/OTP digit/);
  digits.split('').forEach((digit, i) => {
    fireEvent.change(boxes[i], { target: { value: digit } });
  });
}

async function waitForEnabledAndClick(name: RegExp | string) {
  const button = screen.getByRole('button', { name });
  await waitFor(() => expect(button).not.toBeDisabled());
  fireEvent.click(button);
}

beforeEach(() => {
  mockIsAuthenticated(false);
});

afterEach(() => {
  window.history.pushState(null, '', '/');
});

describe('forgot-username recovery flow (success)', () => {
  it('walks login -> forgot-username -> otp-verification -> back to login', async () => {
    await renderAtPath('/auth/login');

    fireEvent.click(await screen.findByRole('link', { name: 'Forgot Username ?' }));
    expect(
      await screen.findByRole('heading', { name: 'Forgot Username' })
    ).toBeInTheDocument();

    fireEvent.input(screen.getByPlaceholderText('Enter Mobile Number'), {
      target: { value: '9876543210' },
    });
    await waitForEnabledAndClick(/next/i);

    expect(
      await screen.findByRole('heading', { name: 'OTP verification' })
    ).toBeInTheDocument();

    typeOtp('123456');
    await waitForEnabledAndClick('Verify');

    expect(
      await screen.findByRole('heading', { name: 'Login' })
    ).toBeInTheDocument();
  });

  it('failure path: an email containing "fail" keeps the user on forgot-username (requestOtp rejects)', async () => {
    await renderAtPath('/auth/login');

    fireEvent.click(await screen.findByRole('link', { name: 'Forgot Username ?' }));
    await screen.findByRole('heading', { name: 'Forgot Username' });

    fireEvent.click(screen.getByRole('button', { name: 'Email ID' }));
    fireEvent.input(screen.getByPlaceholderText('Enter Email ID'), {
      target: { value: 'fail@example.com' },
    });
    await waitForEnabledAndClick(/next/i);

    // Give the rejected mutation a tick to settle, then confirm no navigation happened.
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Forgot Username' })
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByRole('heading', { name: 'OTP verification' })
    ).not.toBeInTheDocument();
  });
});

describe('forgot-password recovery flow', () => {
  it('walks login -> forgot-password -> verification-method -> otp-verification -> setup-new-password -> login (success)', async () => {
    await renderAtPath('/auth/login');

    fireEvent.click(await screen.findByRole('link', { name: 'Forgot Password ?' }));
    expect(
      await screen.findByRole('heading', { name: 'Forgot Password' })
    ).toBeInTheDocument();

    fireEvent.input(screen.getByPlaceholderText('Enter username'), {
      target: { value: 'nurse1' },
    });
    await waitForEnabledAndClick(/next/i);

    expect(
      await screen.findByRole('heading', { name: 'Choose verification method' })
    ).toBeInTheDocument();

    fireEvent.input(screen.getByPlaceholderText('Enter Mobile Number'), {
      target: { value: '9876543210' },
    });
    await waitForEnabledAndClick(/next/i);

    expect(
      await screen.findByRole('heading', { name: 'OTP verification' })
    ).toBeInTheDocument();

    typeOtp('123456');
    await waitForEnabledAndClick('Verify');

    expect(
      await screen.findByRole('heading', { name: 'Set new password' })
    ).toBeInTheDocument();

    fireEvent.input(screen.getByPlaceholderText('Enter or generate new password'), {
      target: { value: 'Abcdefg1$' },
    });
    fireEvent.input(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'Abcdefg1$' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    expect(
      await screen.findByRole('heading', { name: 'Login' })
    ).toBeInTheDocument();
  });

  it('failure path: OTP 000000 keeps the user on otp-verification instead of reaching setup-new-password', async () => {
    await renderAtPath('/auth/login');

    fireEvent.click(await screen.findByRole('link', { name: 'Forgot Password ?' }));
    await screen.findByRole('heading', { name: 'Forgot Password' });

    fireEvent.input(screen.getByPlaceholderText('Enter username'), {
      target: { value: 'nurse1' },
    });
    await waitForEnabledAndClick(/next/i);
    await screen.findByRole('heading', { name: 'Choose verification method' });

    fireEvent.input(screen.getByPlaceholderText('Enter Mobile Number'), {
      target: { value: '9876543210' },
    });
    await waitForEnabledAndClick(/next/i);
    await screen.findByRole('heading', { name: 'OTP verification' });

    typeOtp('000000');
    await waitForEnabledAndClick('Verify');

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'OTP verification' })
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByRole('heading', { name: 'Set new password' })
    ).not.toBeInTheDocument();
  });
});
