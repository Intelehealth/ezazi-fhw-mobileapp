import { configure } from '@testing-library/dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, failure, success } from '@ezazi/api-client';
import { authService } from '../../services/auth.service';
import { showToast } from '../../services/toast';
import { useAppSelector } from '../../store/hooks';

// This suite's renderAtPath() forces a fresh module graph on every test via
// vi.resetModules() (see below), which now also re-transforms
// react-international-phone (a real third-party UI dep, inlined in
// vitest.config.ts to dodge the dual-React hazard) from scratch each time —
// occasionally pushing past find*/waitFor's 1000ms default when this file
// runs alongside the rest of the suite under CPU contention, making an
// otherwise-passing assertion flaky. Both this file's own test timeout and
// find*/waitFor's async-utility timeout are raised to give that
// re-transform enough headroom; scoped to this file only.
vi.setConfig({ testTimeout: 20000 });
configure({ asyncUtilTimeout: 10000 });

/**
 * End-to-end walkthroughs of both recovery flows (forgot-username and
 * forgot-password), rendering the ACTUAL router (routes/app.routes.tsx) and
 * clicking through it with React Testing Library — this environment has no
 * browser/e2e tool (no Playwright/Cypress), so this RTL integration suite is
 * what stands in for a live browser walkthrough of the full flow end to end.
 *
 * authService (not the individual hooks) is mocked at the network boundary,
 * matching useLogin.test.tsx's own convention — the hooks themselves
 * (useRequestOtp/useVerifyOtp/useResetPassword) run for real here, exercising
 * their real payload-building/error-toast wiring against a stand-in for the
 * actual auth-gateway responses (see auth-gateway/src/modules/auth/auth.dto.ts
 * for the real shapes these mocks mirror — both `otpFor: 'username'` and
 * `otpFor: 'password'` are real now, phone AND email).
 *
 * Same window.history.pushState + fresh dynamic import per test as
 * routes/app.routes.test.tsx, for the same reason (the router reads
 * window.location once at module-eval time). store/hooks and useLogin are
 * mocked for the same dual-React-hoisting reason as that file.
 */
vi.mock('../../store/hooks', () => ({
  useAppSelector: vi.fn(() => false),
  useAppDispatch: () => vi.fn(),
}));

vi.mock('../../hooks/mutations/useLogin', () => ({
  useLogin: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

vi.mock('../../services/auth.service', () => ({
  authService: {
    requestOtp: vi.fn(),
    verifyOtp: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('../../services/toast', () => ({ showToast: vi.fn() }));

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
  // exercises them (with authService mocked underneath).
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}

// react-international-phone's <PhoneInput> is a masked, keystroke-aware
// control: a single fireEvent.input() full-value replace (e.g. straight to
// '9876543210') loses the pre-filled "+91" India dial code entirely, which
// makes the library re-guess a country from the bare digits — matching Iran's
// "98" dial code instead of keeping India selected. Appending one digit at a
// time, like typeOtp below, keeps every intermediate value prefixed with the
// already-selected country's dial code, the same way real keystrokes would.
function typePhone(nationalNumber: string) {
  const input = screen.getByPlaceholderText(
    'Enter Mobile Number'
  ) as HTMLInputElement;
  for (const digit of nationalNumber) {
    fireEvent.change(input, { target: { value: input.value + digit } });
  }
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
  vi.mocked(showToast).mockClear();
  // A real, well-formed phone/email always succeeds (client-side validation
  // already guarantees that shape reaches here) — the substring "fail" in
  // either identifier is this suite's own deliberate failure trigger, not a
  // real auth-gateway convention.
  vi.mocked(authService.requestOtp).mockImplementation(async ({ phoneNumber, email }) => {
    const identifier = phoneNumber ?? email ?? '';
    return identifier.toLowerCase().includes('fail')
      ? failure(new ApiError('api', 'Something went wrong, please try again.', { status: 500 }))
      : success({ message: 'If the account exists, an OTP has been sent.' });
  });
  vi.mocked(authService.verifyOtp).mockImplementation(async ({ verifyFor, otp }) =>
    otp === '000000'
      ? failure(new ApiError('api', 'Invalid or expired code', { status: 401 }))
      : success(
          verifyFor === 'username'
            ? { verified: true }
            : { verified: true, userUuid: 'u-1', resetToken: 'reset-tok', expiresIn: 300 }
        )
  );
  vi.mocked(authService.resetPassword).mockResolvedValue(
    success({ message: 'Password reset successful.' })
  );
});

afterEach(() => {
  window.history.pushState(null, '', '/');
});

describe('forgot-username recovery flow', () => {
  it('walks login -> forgot-username (phone tab) -> otp-verification -> back to login (success)', async () => {
    await renderAtPath('/auth/login');

    fireEvent.click(await screen.findByRole('link', { name: 'Forgot Username ?' }));
    expect(
      await screen.findByRole('heading', { name: 'Forgot Username' })
    ).toBeInTheDocument();

    typePhone('9876543210');
    await waitForEnabledAndClick(/next/i);

    expect(
      await screen.findByRole('heading', { name: 'OTP verification' })
    ).toBeInTheDocument();
    expect(authService.requestOtp).toHaveBeenCalledWith({
      otpFor: 'username',
      phoneNumber: '9876543210',
      countryCode: '91',
    });

    typeOtp('123456');
    await waitForEnabledAndClick('Verify');

    expect(
      await screen.findByRole('heading', { name: 'Login' })
    ).toBeInTheDocument();
    expect(authService.verifyOtp).toHaveBeenCalledWith({
      verifyFor: 'username',
      phoneNumber: '9876543210',
      countryCode: '91',
      email: undefined,
      otp: '123456',
    });
  });

  it('walks login -> forgot-username (email tab) -> otp-verification -> back to login (success)', async () => {
    await renderAtPath('/auth/login');

    fireEvent.click(await screen.findByRole('link', { name: 'Forgot Username ?' }));
    await screen.findByRole('heading', { name: 'Forgot Username' });

    fireEvent.click(screen.getByRole('button', { name: 'Email ID' }));
    fireEvent.input(screen.getByPlaceholderText('Enter Email ID'), {
      target: { value: 'nurse1@example.com' },
    });
    await waitForEnabledAndClick(/next/i);

    expect(
      await screen.findByRole('heading', { name: 'OTP verification' })
    ).toBeInTheDocument();
    expect(authService.requestOtp).toHaveBeenCalledWith({
      otpFor: 'username',
      email: 'nurse1@example.com',
    });

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

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        'Error',
        'Something went wrong, please try again.',
        'error'
      )
    );
    expect(
      screen.getByRole('heading', { name: 'Forgot Username' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'OTP verification' })
    ).not.toBeInTheDocument();
  });
});

describe('forgot-password recovery flow', () => {
  it('walks login -> forgot-password -> verification-method (phone tab) -> otp-verification -> setup-new-password -> login (success)', async () => {
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

    typePhone('9876543210');
    await waitForEnabledAndClick(/next/i);

    expect(
      await screen.findByRole('heading', { name: 'OTP verification' })
    ).toBeInTheDocument();
    expect(authService.requestOtp).toHaveBeenCalledWith({
      otpFor: 'password',
      phoneNumber: '9876543210',
      countryCode: '91',
    });

    typeOtp('123456');
    await waitForEnabledAndClick('Verify');

    expect(
      await screen.findByRole('heading', { name: 'Set new password' })
    ).toBeInTheDocument();
    expect(authService.verifyOtp).toHaveBeenCalledWith({
      verifyFor: 'password',
      phoneNumber: '9876543210',
      countryCode: '91',
      email: undefined,
      otp: '123456',
    });

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
    expect(authService.resetPassword).toHaveBeenCalledWith('u-1', {
      newPassword: 'Abcdefg1$',
      resetToken: 'reset-tok',
    });
  });

  it('walks the same flow via verification-method\'s email tab (success — auth-gateway now supports email for password reset too)', async () => {
    await renderAtPath('/auth/login');

    fireEvent.click(await screen.findByRole('link', { name: 'Forgot Password ?' }));
    await screen.findByRole('heading', { name: 'Forgot Password' });

    fireEvent.input(screen.getByPlaceholderText('Enter username'), {
      target: { value: 'nurse1' },
    });
    await waitForEnabledAndClick(/next/i);
    await screen.findByRole('heading', { name: 'Choose verification method' });

    fireEvent.click(screen.getByRole('button', { name: 'Email ID' }));
    fireEvent.input(screen.getByPlaceholderText('Enter Email ID'), {
      target: { value: 'nurse1@example.com' },
    });
    await waitForEnabledAndClick(/next/i);

    expect(
      await screen.findByRole('heading', { name: 'OTP verification' })
    ).toBeInTheDocument();
    expect(authService.requestOtp).toHaveBeenCalledWith({
      otpFor: 'password',
      email: 'nurse1@example.com',
    });
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

    typePhone('9876543210');
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
