import '@/core/i18n';
import { Platform, ToastAndroid } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PrivacyNoticeScreen } from '../PrivacyNoticeScreen';
import { useAuthStore } from '@/core/session/auth.store';

const mockGoBack = jest.fn();

jest.mock('@/core/session/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

function renderScreen() {
  const navigation = { goBack: mockGoBack } as never;
  const route = { params: undefined } as never;
  return render(<PrivacyNoticeScreen navigation={navigation} route={route} />);
}

describe('PrivacyNoticeScreen', () => {
  const setAuthenticated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
    Platform.OS = 'android';
    (useAuthStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { setAuthenticated: typeof setAuthenticated }) => unknown) =>
        selector({ setAuthenticated }),
    );
  });

  it('renders the title and consent checkbox, unchecked by default', () => {
    renderScreen();

    expect(screen.getByText('Privacy Notice')).toBeTruthy();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(false);
  });

  it('toggles the checkbox when tapped', () => {
    renderScreen();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.press(checkbox);

    expect(checkbox.props.accessibilityState.checked).toBe(true);
  });

  it('toasts a reminder and does not authenticate when Accept is tapped unchecked', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Accept' }));

    expect(ToastAndroid.show).toHaveBeenCalledWith(
      'Please read out the Privacy Consent first.',
      ToastAndroid.SHORT,
    );
    expect(setAuthenticated).not.toHaveBeenCalled();
  });

  it('authenticates as a mock fhw when Accept is tapped after checking the box', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByRole('button', { name: 'Accept' }));

    expect(setAuthenticated).toHaveBeenCalledWith('mock', 'fhw');
  });

  it('toasts a rejection and goes back when Reject is tapped after checking the box', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByRole('button', { name: 'Reject' }));

    expect(ToastAndroid.show).toHaveBeenCalledWith(
      'You cannot register a patient without consent',
      ToastAndroid.SHORT,
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does nothing on Reject when the box is unchecked', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Reject' }));

    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
