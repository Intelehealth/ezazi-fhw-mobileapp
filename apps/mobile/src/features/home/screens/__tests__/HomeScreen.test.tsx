import '@/core/i18n';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';
import { useAuthStore } from '@/core/session/auth.store';

jest.mock('@/core/session/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

describe('HomeScreen', () => {
  const logout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { logout: () => Promise<void> }) => unknown) => selector({ logout }),
    );
  });

  it('renders the placeholder title and note', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Logged in. Active cases will appear here.')).toBeTruthy();
  });

  it('calls logout() when the logout button is pressed', () => {
    render(<HomeScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Log out (EZ-943)' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
