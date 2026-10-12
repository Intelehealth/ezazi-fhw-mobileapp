import '@/core/i18n';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SetupScreen } from '../SetupScreen';
import { useAuthStore } from '@/core/session/auth.store';
import { useLocationStore } from '@/features/auth/stores/location.store';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/core/session/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/features/auth/stores/location.store', () => ({
  useLocationStore: jest.fn(),
}));

describe('SetupScreen', () => {
  const login = jest.fn();
  const fetchLocations = jest.fn();

  function setLocationState(state: {
    locations?: { uuid: string; display: string }[];
    isLoading?: boolean;
  }) {
    (useLocationStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: unknown) => unknown) =>
        selector({
          locations: state.locations ?? [],
          isLoading: state.isLoading ?? false,
          fetchLocations,
        }),
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    fetchLocations.mockResolvedValue({ ok: true, data: { results: [] } });
    (useAuthStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { login: typeof login }) => unknown) => selector({ login }),
    );
    setLocationState({});
  });

  it('renders location/username/password fields and the Setup button', () => {
    render(<SetupScreen />);

    expect(screen.getByPlaceholderText('Select Location')).toBeTruthy();
    expect(screen.getByPlaceholderText('Username')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Setup' })).toBeTruthy();
  });

  it('fetches locations once on mount', () => {
    render(<SetupScreen />);
    expect(fetchLocations).toHaveBeenCalledTimes(1);
  });

  it('shows required-field errors when submitted empty, and never calls login()', async () => {
    render(<SetupScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Setup' }));

    expect(await screen.findByText('Please select a location')).toBeTruthy();
    expect(screen.getByText('Please enter your username')).toBeTruthy();
    expect(screen.getByText('Please enter your password')).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the network banner when the location fetch fails offline', async () => {
    fetchLocations.mockResolvedValue({
      ok: false,
      error: { kind: 'network', status: 0, code: undefined, message: 'Network Error' },
    });
    render(<SetupScreen />);

    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Please check your connection and try again.')).toBeTruthy();
  });

  // The LOCATION picker opens off a real measureInWindow() callback
  // (openLocationPicker in SetupScreen.tsx), which the RN test renderer
  // never invokes — there's no native UIManager backing it under Jest. So
  // the picker itself (open → tap a row → field fills) is unverifiable at
  // this layer; it's covered by this session's on-device passes instead.
  // login()'s submit path with a real location value is exercised on
  // LoginScreen's equivalent test (SetupScreen shares the same onValidSubmit).

  it('navigates to ForgotPasswordRequest with origin "Setup" when the link is tapped', () => {
    render(<SetupScreen />);

    fireEvent.press(screen.getByText('Forgot password?'));

    expect(mockNavigate).toHaveBeenCalledWith('ForgotPasswordRequest', { origin: 'Setup' });
  });
});
