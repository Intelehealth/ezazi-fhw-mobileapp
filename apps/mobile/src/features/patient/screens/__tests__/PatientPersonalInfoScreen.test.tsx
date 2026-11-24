import '@/core/i18n';
import { render, screen } from '@testing-library/react-native';
import { PatientPersonalInfoScreen } from '../PatientPersonalInfoScreen';

// The screen calls useNavigation, so it needs a navigation object. Same shape
// as LoginScreen.test.tsx. Continue's destination is temporary — item 4's code
// chat replaces it with a validated submit — so nothing asserts on it here.
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Every input carries an accessibilityLabel equal to its label, because the
// two mobile fields share the placeholder "Enter Mobile Number" and
// getByPlaceholderText would match two nodes and throw.
const FIELDS = [
  'First Name',
  'Middle Name',
  'Last Name',
  'Gender',
  'Date of Birth',
  'Age',
  'Mobile Number',
  'Alternate Mobile Number',
];

describe('PatientPersonalInfoScreen', () => {
  it('renders the eight inputs, the photo field and the Continue button', () => {
    render(<PatientPersonalInfoScreen />);

    FIELDS.forEach(label => {
      expect(screen.getByLabelText(label)).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: 'Add a picture' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });

  // Gender is a constant the user cannot touch, not a form field. The column
  // stores 'F'; the shown word and the stored code differ on purpose.
  it('shows Gender as Female and does not let it be edited', () => {
    render(<PatientPersonalInfoScreen />);

    const gender = screen.getByLabelText('Gender');
    expect(gender.props.value).toBe('Female');
    expect(gender.props.editable).toBe(false);
  });
});
