import '@/core/i18n';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';
import { useAuthStore } from '@/core/session/auth.store';

// HomeScreen pulls in the labour-monitor service, which imports AsyncStorage
// (no native module under Jest), so use the library's official jest mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/core/session/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

const mockNavigate = jest.fn();

function renderScreen() {
  const navigation = { navigate: mockNavigate } as never;
  const route = { params: undefined } as never;
  return render(<HomeScreen navigation={navigation} route={route} />);
}

describe('HomeScreen', () => {
  const logout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { logout: () => Promise<void> }) => unknown) => selector({ logout }),
    );
  });

  it('renders the placeholder title and note', () => {
    renderScreen();

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Logged in. Active cases will appear here.')).toBeTruthy();
  });

  it('calls logout() when the logout button is pressed', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Log out (EZ-943)' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  // Was PrivacyNotice. The consent step is skipped for now (settled
  // 2026-11-23) and registration is entered straight from here, so this
  // assertion is what pins that decision - see the comment on the button.
  it('opens patient registration when Add Patient is pressed', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Add Patient' }));

    expect(mockNavigate).toHaveBeenCalledWith('AddPatientPersonal');
  });
});
