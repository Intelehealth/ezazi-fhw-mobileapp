import '@/core/i18n';
import { Linking, Platform, ToastAndroid } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PrivacyNoticeScreen } from '../PrivacyNoticeScreen';

const mockGoBack = jest.fn();

function renderScreen() {
  const navigation = { goBack: mockGoBack } as never;
  const route = { params: undefined } as never;
  return render(<PrivacyNoticeScreen navigation={navigation} route={route} />);
}

describe('PrivacyNoticeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
    Platform.OS = 'android';
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

  it('keeps Accept disabled and does not leave the screen until the box is checked', () => {
    renderScreen();

    const accept = screen.getByRole('button', { name: 'Accept' });
    expect(accept.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(accept);

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('keeps the original notice copy, with the Use lines as bullets', () => {
    renderScreen();

    expect(screen.getByText('Personal Information')).toBeTruthy();
    expect(screen.getByText('Your information is')).toBeTruthy();
    expect(screen.getByText('used for diagnosing and treating you.')).toBeTruthy();
    expect(screen.getByText(/Data Privacy Officer at support@intelehealth.io/)).toBeTruthy();
    expect(screen.getByText(/I \(Health Worker\) confirm that I have read out the privacy notice/)).toBeTruthy();
  });

  it('opens the privacy policy URL from the inline link', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderScreen();

    fireEvent.press(screen.getByText('https://www.intelehealth.org/privacy-policy'));

    expect(openURL).toHaveBeenCalledWith('https://www.intelehealth.org/privacy-policy');
  });

  it('goes back on Accept after checking the box (until AddNewPatient exists)', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByRole('button', { name: 'Accept' }));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
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

  it('toasts a read-first reminder and stays on Reject when the box is unchecked', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Reject' }));

    expect(ToastAndroid.show).toHaveBeenCalledWith(
      'Please read out the Privacy Consent first.',
      ToastAndroid.SHORT,
    );
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
