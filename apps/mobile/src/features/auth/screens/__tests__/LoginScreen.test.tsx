import '@/core/i18n';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';
import { useAuthStore } from '@/core/session/auth.store';
import { showToast } from '@/core/utils/toast';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/core/session/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/core/utils/toast', () => ({
  showToast: jest.fn(),
}));

describe('LoginScreen', () => {
  const login = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { login: typeof login }) => unknown) => selector({ login }),
    );
  });

  it('renders username/password fields and the submit button', () => {
    render(<LoginScreen />);

    expect(screen.getByPlaceholderText('Username')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Login' })).toBeTruthy();
  });

  it('shows required-field errors when submitted empty, and never calls login()', async () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Please enter your username')).toBeTruthy();
    expect(screen.getByText('Please enter your password')).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it('calls login() with the entered credentials and toasts on success', async () => {
    login.mockResolvedValue({ ok: true, data: {} });
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Username'), 'nurse1');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'Password@123');
    fireEvent.press(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('nurse1', 'Password@123'));
    expect(showToast).toHaveBeenCalledWith('Login successful');
  });

  it('shows the invalid-credentials banner on a failed login', async () => {
    login.mockResolvedValue({
      ok: false,
      error: { kind: 'unauthorized', status: 401, code: 'INVALID_CREDENTIALS', message: 'nope' },
    });
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Username'), 'nurse1');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'wrongpass');
    fireEvent.press(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Username or password is incorrect')).toBeTruthy();
    expect(screen.getByText('Please check your credentials and try again.')).toBeTruthy();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('navigates to ForgotPasswordRequest with origin "Login" when the link is tapped', () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText('Forgot password?'));

    expect(mockNavigate).toHaveBeenCalledWith('ForgotPasswordRequest', { origin: 'Login' });
  });
});
