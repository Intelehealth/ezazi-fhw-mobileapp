import '@/core/i18n';
import { render, screen } from '@testing-library/react-native';
import { clientConfig } from '@/core/config/clients';

// The screen calls useNavigation, so it needs a navigation object. Same shape
// as LoginScreen.test.tsx. Back's behaviour is temporary — item 5's code chat
// replaces it with the draft-writing Back — so nothing asserts on it here.
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// The District block is the one piece of markup that depends on a form value,
// so it reads a seam module (see addressLayoutSeam.ts). Mocking it here is
// what lets one test file cover both layouts; the screen itself holds no
// state for it.
let mockHasDistrict = false;

jest.mock('../addressLayoutSeam', () => ({
  get HAS_DISTRICT() {
    return mockHasDistrict;
  },
}));

// Imported after the mock only so the two read in order - babel hoists
// jest.mock above every import regardless.
import { PatientAddressInfoScreen } from '../PatientAddressInfoScreen';

/**
 * Labels are stored title case and uppercased by FieldLabel - with
 * `textTransform`, which is a style. The rendered tree still carries the
 * string table's own casing, so that is what these assert against.
 */
const LABELS = {
  country:    'Country',
  state:      'Province/State',
  district:   'District',
  village:    'Village/Town/City',
  address1:   'Address Line 1',
  address2:   'Address Line 2',
  postalCode: 'Postal Code',
};

const esc = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * FieldLabel draws the asterisk as a nested Text, so a required field's label
 * reads "Province/State*" as one string.
 *
 * These three matchers are deliberately separate. Asserting a label while
 * leaving the asterisk optional would let `required` move between fields with
 * every test still green - and section 1 makes the asterisk the screen's only
 * required-ness signal, so which field carries it is the whole point.
 */
const requiredLabel = (text: string) => new RegExp(`^${esc(text)}\\*$`);
/** Asserts the field is on screen AND carries no asterisk. */
const optionalLabel = (text: string) => new RegExp(`^${esc(text)}$`);
/** Either form - for proving a field is absent whatever its asterisk. */
const anyLabel = (text: string) => new RegExp(`^${esc(text)}\\*?$`);

beforeEach(() => {
  mockHasDistrict = false;
});

describe('PatientAddressInfoScreen', () => {

  // 1 -------------------------------------------------------------------------

  describe('first paint, before a state is picked', () => {
    it('renders the six fields that are on screen, and not District', () => {
      render(<PatientAddressInfoScreen />);

      expect(screen.getByText(optionalLabel(LABELS.country))).toBeTruthy();
      expect(screen.getByText(requiredLabel(LABELS.state))).toBeTruthy();
      expect(screen.getByText(requiredLabel(LABELS.village))).toBeTruthy();
      expect(screen.getByText(optionalLabel(LABELS.address1))).toBeTruthy();
      expect(screen.getByText(optionalLabel(LABELS.address2))).toBeTruthy();
      expect(screen.getByText(optionalLabel(LABELS.postalCode))).toBeTruthy();

      // Tolerant of an asterisk, so this fails if District renders at all.
      expect(screen.queryByText(anyLabel(LABELS.district))).toBeNull();
    });

    it('renders both footer buttons', () => {
      render(<PatientAddressInfoScreen />);

      expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Register Patient' })).toBeTruthy();
    });

    it('marks exactly two fields required', () => {
      render(<PatientAddressInfoScreen />);

      // The count, on top of the per-field matchers above: together they pin
      // both which fields are required and that no others are.
      expect(screen.getAllByText('*')).toHaveLength(2);
    });
  });

  // 2 -------------------------------------------------------------------------

  describe('once a state with districts is picked', () => {
    it('shows District beside Village', () => {
      mockHasDistrict = true;
      render(<PatientAddressInfoScreen />);

      expect(screen.getByText(requiredLabel(LABELS.district))).toBeTruthy();
      expect(screen.getByText(requiredLabel(LABELS.village))).toBeTruthy();
    });

    it('gives District an asterisk and no other field gains one', () => {
      mockHasDistrict = true;
      render(<PatientAddressInfoScreen />);

      expect(screen.getAllByText('*')).toHaveLength(3);
      expect(screen.getByText(optionalLabel(LABELS.country))).toBeTruthy();
      expect(screen.getByText(optionalLabel(LABELS.address1))).toBeTruthy();
      expect(screen.getByText(optionalLabel(LABELS.address2))).toBeTruthy();
      expect(screen.getByText(optionalLabel(LABELS.postalCode))).toBeTruthy();
    });
  });

  // 3 -------------------------------------------------------------------------

  describe('Country', () => {
    it('shows the configured country name', () => {
      render(<PatientAddressInfoScreen />);

      expect(screen.getByDisplayValue(clientConfig.countryName)).toBeTruthy();
    });

    it('is not a control - it opens nothing', () => {
      render(<PatientAddressInfoScreen />);

      // A role query resolves a button's name through its subtree, so wrapping
      // Country in the dropdown trigger idiom would make this match and fail.
      // Matching on the trigger's own accessibilityLabel would not: the
      // triggers carry theirs on the inner TextInput, not on the button.
      expect(screen.queryByRole('button', { name: LABELS.country })).toBeNull();
      expect(
        screen.queryByRole('button', { name: clientConfig.countryName }),
      ).toBeNull();
    });
  });

  // 4 -------------------------------------------------------------------------

  describe('the dropdown triggers', () => {
    it('expose State as a button with its own accessible name', () => {
      render(<PatientAddressInfoScreen />);

      expect(
        screen.getByRole('button', { name: 'Select province or state' }),
      ).toBeTruthy();
    });

    it('expose District as a button once it is on screen', () => {
      mockHasDistrict = true;
      render(<PatientAddressInfoScreen />);

      expect(screen.getByRole('button', { name: 'Select district' })).toBeTruthy();
    });
  });

  // 5 -------------------------------------------------------------------------

  describe('Postal Code', () => {
    it('takes a numeric keyboard', () => {
      render(<PatientAddressInfoScreen />);

      const field = screen.getByPlaceholderText('e.g. 411038');

      expect(field.props.keyboardType).toBe('number-pad');
    });

    it('stops at the configured number of digits', () => {
      render(<PatientAddressInfoScreen />);

      const field = screen.getByPlaceholderText('e.g. 411038');

      expect(field.props.maxLength).toBe(clientConfig.postalCodeLength);
    });

    it('ends the keyboard chain', () => {
      render(<PatientAddressInfoScreen />);

      expect(screen.getByPlaceholderText('e.g. 411038').props.returnKeyType).toBe('done');
      expect(screen.getByPlaceholderText('House / street').props.returnKeyType).toBe('next');
    });
  });

});
