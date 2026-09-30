import { render, screen } from '@testing-library/react-native';
import { RootNavigator } from '../RootNavigator';
import { useAuthStore } from '@/core/session/auth.store';
import type { AuthStatus } from '@/core/session/auth.store';

// RootNavigator only cares about `status` — every screen it can render is
// mocked down to a bare marker so this test exercises its own routing logic
// (which screen set is mounted, which one is initial) and nothing inside
// the real screens (forms, permissions, SVG, location pickers, …).
// No JSX here: babel-plugin-jest-hoist forbids a jest.mock() factory from
// closing over any out-of-scope variable (including an outer `React`/`Text`
// import), so each marker is built with plain `require(...).createElement`.
function mockScreen(name: string) {
  return () => require('react').createElement(require('react-native').Text, null, name);
}

jest.mock('@/features/auth/screens/SplashScreen', () => ({ SplashScreen: mockScreen('SplashScreen') }));
jest.mock('@/features/auth/screens/SetupScreen', () => ({ SetupScreen: mockScreen('SetupScreen') }));
jest.mock('@/features/auth/screens/LoginScreen', () => ({ LoginScreen: mockScreen('LoginScreen') }));
jest.mock('@/features/auth/screens/PrivacyNoticeScreen', () => ({
  PrivacyNoticeScreen: mockScreen('PrivacyNoticeScreen'),
}));
jest.mock('@/features/auth/screens/ForgotPasswordRequestOtpScreen', () => ({
  ForgotPasswordRequestOtpScreen: mockScreen('ForgotPasswordRequestOtpScreen'),
}));
jest.mock('@/features/auth/screens/ForgotPasswordVerifyOtpScreen', () => ({
  ForgotPasswordVerifyOtpScreen: mockScreen('ForgotPasswordVerifyOtpScreen'),
}));
jest.mock('@/features/auth/screens/ForgotPasswordResetScreen', () => ({
  ForgotPasswordResetScreen: mockScreen('ForgotPasswordResetScreen'),
}));
jest.mock('@/features/home/screens/HomeScreen', () => ({ HomeScreen: mockScreen('HomeScreen') }));

jest.mock('@/core/session/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

function setStatus(status: AuthStatus) {
  (useAuthStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: { status: AuthStatus }) => unknown) => selector({ status }),
  );
}

describe('RootNavigator', () => {
  it('shows only Splash while status is unknown', () => {
    setStatus('unknown');
    render(<RootNavigator />);

    expect(screen.getByText('SplashScreen')).toBeTruthy();
    expect(screen.queryByText('SetupScreen')).toBeNull();
    expect(screen.queryByText('LoginScreen')).toBeNull();
    expect(screen.queryByText('HomeScreen')).toBeNull();
  });

  it('opens on Setup for a first-run device (needsSetup)', () => {
    setStatus('needsSetup');
    render(<RootNavigator />);

    expect(screen.getByText('SetupScreen')).toBeTruthy();
    expect(screen.queryByText('LoginScreen')).toBeNull();
  });

  it('opens on Login for a returning device with an expired session (needsLogin)', () => {
    setStatus('needsLogin');
    render(<RootNavigator />);

    expect(screen.getByText('LoginScreen')).toBeTruthy();
    expect(screen.queryByText('SetupScreen')).toBeNull();
  });

  it('shows only Home when authenticated', () => {
    setStatus('authenticated');
    render(<RootNavigator />);

    expect(screen.getByText('HomeScreen')).toBeTruthy();
    expect(screen.queryByText('SetupScreen')).toBeNull();
    expect(screen.queryByText('LoginScreen')).toBeNull();
    expect(screen.queryByText('SplashScreen')).toBeNull();
  });
});
