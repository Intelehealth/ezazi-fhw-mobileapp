import '@/core/i18n';
import { ScrollView } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { clientConfig } from '@/core/config/clients';
import { AppDropdown } from '@/core/ui/AppDropdown';
import { showToast } from '@/core/utils/toast';
import { districtsOf } from '../../domain/addressMaster';
import type { AddressInfoFormValues } from '../../domain/addressInfoForm.schema';
import { useRegistrationDraftStore } from '../../stores/registrationDraft.store';

// The screen calls useNavigation, so it needs a navigation object. Same shape
// as LoginScreen.test.tsx.
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockPopTo = jest.fn();

// `popTo` and `usePreventRemove` are for the layout this screen renders, which
// owns the discard path — the screen itself only uses `goBack`.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, popTo: mockPopTo }),
  usePreventRemove: jest.fn(),
}));

jest.mock('@/core/utils/toast', () => ({ showToast: jest.fn() }));

/**
 * The District block is the one piece of markup that depends on a form value,
 * so it reads a seam module (see addressLayoutSeam.ts). Mocking it here is
 * what lets one test file cover both layouts; the screen itself holds no
 * state for it.
 *
 * `null` means "use the real rule", added when the form was wired: the layout
 * tests force the answer, while the cascade tests pick a state for real and
 * need the seam to answer for real.
 */
let mockHasDistrict: boolean | null = false;

jest.mock('../addressLayoutSeam', () => {
  const actual = jest.requireActual('../addressLayoutSeam');

  return {
    hasDistrict: (stateName: string) =>
      mockHasDistrict === null ? actual.hasDistrict(stateName) : mockHasDistrict,
  };
});

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

/**
 * ───────────────────────────────────────────────────────────────────────────
 * The wiring. Tests 6 to 14 of PATIENT_ADDRESS_INFO_PLAN.md section 8.
 *
 * HOW A STATE GETS PICKED HERE. Not by opening the panel: it anchors with
 * `measureInWindow`, which the React Native test renderer never calls, so the
 * open path is unverifiable at this layer and is checked on a device instead
 * (SetupScreen.test.tsx carries the same note about the location picker). The
 * panel's `onSelect` is the screen's real handler, so these drive it through
 * the component's props - the idiom PatientPersonalInfoScreen.test.tsx already
 * uses for its date picker.
 *
 * THE STORE IS REAL, with the two actions this screen calls swapped for spies
 * through `setState`. The layout this screen renders reads
 * `discardRegistration` off the same store, so a selector-shaped mock would
 * have to re-implement it.
 */

interface DropdownProps {
  visible: boolean;
  options: string[];
  onSelect: (option: string) => void;
  emptyText: string;
}

const panelFor = (emptyText: string): DropdownProps => {
  const panel = screen
    .UNSAFE_getAllByType(AppDropdown)
    .find((node) => (node.props as DropdownProps).emptyText === emptyText);

  if (!panel) throw new Error(`no dropdown panel with emptyText "${emptyText}"`);

  return panel.props as DropdownProps;
};

const statePanel = () => panelFor('Select State');
const districtPanel = () => panelFor('Select District');

/** Picks from a panel exactly as a tap on one of its rows would. */
const pick = (panel: DropdownProps, option: string) => {
  act(() => panel.onSelect(option));
};

const valueOf = (accessibleName: string) =>
  screen.getByLabelText(accessibleName).props.value as string;

/**
 * The scroll block a field is laid out in - the nearest ancestor carrying an
 * `onLayout`. The screen records one offset per block rather than per field,
 * because the first two rows hold two fields each.
 */
const blockHolding = (field: ReactTestInstance): ReactTestInstance => {
  let current = field.parent;

  while (current && typeof current.props.onLayout !== 'function') {
    current = current.parent;
  }

  if (!current) throw new Error('no ancestor with an onLayout');

  return current;
};

const pressSave = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Register Patient' }));

const pressBack = () => fireEvent.press(screen.getByRole('button', { name: 'Back' }));

const mockSetAddress = jest.fn();
const mockSubmitRegistration = jest.fn();

const EMPTY_ADDRESS: AddressInfoFormValues = {
  state: '',
  district: '',
  village: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
};

// Raw uuid literals are banned under src/ by eslint's NO_RAW_UUID rule, which
// excludes src/**/__tests__/** - exactly so a test can name one.
const PATIENT_UUID = '6f3c1b2a-0d5e-4a87-9c11-2b7f8e4d6a30';

const VALID_POSTAL = '4'.repeat(clientConfig.postalCodeLength);

describe('PatientAddressInfoScreen - the form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The real rule, so picking a state really does decide whether District
    // appears. Individual tests still force it where the layout is the point.
    mockHasDistrict = null;
    mockSubmitRegistration.mockResolvedValue({ ok: true, patientUuid: PATIENT_UUID });

    // Zustand state is module-global and survives between tests.
    useRegistrationDraftStore.setState({
      mode: 'create',
      patientUuid: PATIENT_UUID,
      personal: null,
      address: null,
      isSaving: false,
      setAddress: mockSetAddress,
      submitRegistration: mockSubmitRegistration,
    });
  });

  // 6 -------------------------------------------------------------------------

  describe('the cascade', () => {
    it('brings District on screen once a state with districts is picked', () => {
      render(<PatientAddressInfoScreen />);

      expect(screen.queryByText(anyLabel(LABELS.district))).toBeNull();

      pick(statePanel(), 'Maharashtra');

      expect(screen.getByText(requiredLabel(LABELS.district))).toBeTruthy();
      expect(valueOf('Select province or state')).toBe('Maharashtra');
    });

    it('fills the District panel with that state`s districts', () => {
      render(<PatientAddressInfoScreen />);

      pick(statePanel(), 'Maharashtra');

      // The real list, from the real asset - 33 for Maharashtra.
      expect(districtPanel().options).toEqual([...districtsOf('Maharashtra')]);
    });

    it('rebuilds the District panel when the state changes', () => {
      render(<PatientAddressInfoScreen />);

      pick(statePanel(), 'Maharashtra');
      pick(statePanel(), 'Kerala');

      expect(districtPanel().options).toEqual([...districtsOf('Kerala')]);
    });

    // 7 -----------------------------------------------------------------------

    it('clears a chosen district when the state changes', () => {
      render(<PatientAddressInfoScreen />);

      pick(statePanel(), 'Maharashtra');
      pick(districtPanel(), 'Pune');

      expect(valueOf('Select district')).toBe('Pune');

      pick(statePanel(), 'Kerala');

      // Pune is not a district of Kerala. Leaving it would submit a district
      // that does not belong to the state - which the schema also rejects.
      expect(valueOf('Select district')).toBe('');
    });

    // 8 -----------------------------------------------------------------------

    it('leaves the district alone when the SAME state is re-picked', () => {
      render(<PatientAddressInfoScreen />);

      pick(statePanel(), 'Maharashtra');
      pick(districtPanel(), 'Pune');
      pick(statePanel(), 'Maharashtra');

      // The legacy cleared it on every tap of the state list, including a tap
      // on the state already chosen - so re-opening the list just to check
      // what you had picked cost you the district.
      expect(valueOf('Select district')).toBe('Pune');
    });
  });

  // 9 -------------------------------------------------------------------------

  describe('submitting an empty form', () => {
    it('shows the required errors and never calls the submit action', async () => {
      render(<PatientAddressInfoScreen />);

      pressSave();

      await waitFor(() => {
        expect(screen.getByText('Please select province')).toBeTruthy();
      });
      expect(screen.getByText('Please enter city/village')).toBeTruthy();
      expect(mockSubmitRegistration).not.toHaveBeenCalled();
      expect(mockSetAddress).not.toHaveBeenCalled();
    });

    it('raises no district error, because there is no district field', async () => {
      render(<PatientAddressInfoScreen />);

      pressSave();

      await waitFor(() => {
        expect(screen.getByText('Please select province')).toBeTruthy();
      });

      // One call gates both the field and the rule, so a field that is not on
      // screen cannot produce an error the user has no way to clear.
      expect(screen.queryByText('Please select district')).toBeNull();
    });

    it('does require the district once a state has put it on screen', async () => {
      render(<PatientAddressInfoScreen />);

      pick(statePanel(), 'Maharashtra');
      pressSave();

      await waitFor(() => {
        expect(screen.getByText('Please select district')).toBeTruthy();
      });
      expect(mockSubmitRegistration).not.toHaveBeenCalled();
    });
  });

  // 10 ------------------------------------------------------------------------

  describe('an invalid postal code', () => {
    it('blocks the submit and says how many digits', async () => {
      render(<PatientAddressInfoScreen />);

      pick(statePanel(), 'Maharashtra');
      pick(districtPanel(), 'Pune');
      fireEvent.changeText(screen.getByLabelText(LABELS.village), 'Sinnar');
      fireEvent.changeText(screen.getByLabelText(LABELS.postalCode), VALID_POSTAL.slice(1));

      pressSave();

      await waitFor(() => {
        expect(
          screen.getByText(
            `Please enter ${clientConfig.postalCodeLength} digits valid postal code`,
          ),
        ).toBeTruthy();
      });
      expect(mockSubmitRegistration).not.toHaveBeenCalled();
    });
  });

  // 11 ------------------------------------------------------------------------

  describe('a valid submit', () => {
    const fillValidForm = () => {
      pick(statePanel(), 'Maharashtra');
      pick(districtPanel(), 'Pune');
      fireEvent.changeText(screen.getByLabelText(LABELS.village), 'Sinnar');
      fireEvent.changeText(screen.getByLabelText(LABELS.address1), '12 Market Road');
      fireEvent.changeText(screen.getByLabelText(LABELS.address2), 'Near the clinic');
      fireEvent.changeText(screen.getByLabelText(LABELS.postalCode), VALID_POSTAL);
    };

    it('writes all six values into the draft and calls the submit action once', async () => {
      render(<PatientAddressInfoScreen />);

      fillValidForm();
      pressSave();

      await waitFor(() => {
        expect(mockSubmitRegistration).toHaveBeenCalledTimes(1);
      });
      expect(mockSetAddress).toHaveBeenCalledWith({
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Sinnar',
        addressLine1: '12 Market Road',
        addressLine2: 'Near the clinic',
        postalCode: VALID_POSTAL,
      });
    });

    it('parks the draft BEFORE the write, so a failure keeps what was typed', async () => {
      mockSubmitRegistration.mockResolvedValue({ ok: false, reason: 'failed' });
      render(<PatientAddressInfoScreen />);

      fillValidForm();
      pressSave();

      await waitFor(() => {
        expect(mockSubmitRegistration).toHaveBeenCalled();
      });
      expect(mockSetAddress).toHaveBeenCalled();
    });

    it('says nothing and does not navigate on success - item 6 routes it', async () => {
      render(<PatientAddressInfoScreen />);

      fillValidForm();
      pressSave();

      await waitFor(() => {
        expect(mockSubmitRegistration).toHaveBeenCalled();
      });
      expect(showToast).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockPopTo).not.toHaveBeenCalled();
    });

    it('is blocked while a save is already in flight', () => {
      useRegistrationDraftStore.setState({ isSaving: true });
      render(<PatientAddressInfoScreen />);

      fillValidForm();
      pressSave();

      // Both guards: the button is disabled off `isSaving`, and the handler
      // re-checks it because Postal Code's "done" key bypasses the button.
      expect(mockSubmitRegistration).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: 'Register Patient' }).props
          .accessibilityState.disabled,
      ).toBe(true);
    });
  });

  // 12 ------------------------------------------------------------------------

  describe('Back', () => {
    it('writes the values as they stand and goes back without validating', () => {
      render(<PatientAddressInfoScreen />);

      fireEvent.changeText(screen.getByLabelText(LABELS.village), 'Navi:Mumbai');

      pressBack();

      // Invalid values included - the user is going to step 1 to change
      // something and must find step 2 as they left it.
      expect(mockSetAddress).toHaveBeenCalledWith({
        ...EMPTY_ADDRESS,
        village: 'Navi:Mumbai',
      });
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Please enter a valid city/village name')).toBeNull();
    });

    it('goes back from an untouched form without raising an error', () => {
      render(<PatientAddressInfoScreen />);

      pressBack();

      expect(mockSetAddress).toHaveBeenCalledWith(EMPTY_ADDRESS);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Please select province')).toBeNull();
    });

    it('restores the draft when the step is re-entered', () => {
      useRegistrationDraftStore.setState({
        address: { ...EMPTY_ADDRESS, state: 'Maharashtra', district: 'Pune', village: 'Sinnar' },
      });

      render(<PatientAddressInfoScreen />);

      // A fresh mount: step 2 is popped on Back, so the values can only come
      // from the draft. District is on screen because the restored state has
      // districts - no effect needed, the render reads the seam.
      expect(valueOf('Select province or state')).toBe('Maharashtra');
      expect(valueOf('Select district')).toBe('Pune');
      expect(valueOf(LABELS.village)).toBe('Sinnar');
    });
  });

  // 13 ------------------------------------------------------------------------

  describe('a failed save', () => {
    const fillValidForm = () => {
      pick(statePanel(), 'Maharashtra');
      pick(districtPanel(), 'Pune');
      fireEvent.changeText(screen.getByLabelText(LABELS.village), 'Sinnar');
    };

    it('shows the message and does not navigate', async () => {
      mockSubmitRegistration.mockResolvedValue({ ok: false, reason: 'failed' });
      render(<PatientAddressInfoScreen />);

      fillValidForm();
      pressSave();

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          'Could not save the patient. Please try again.',
        );
      });
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockPopTo).not.toHaveBeenCalled();
    });

    it('stays silent when the store says a save was already running', async () => {
      mockSubmitRegistration.mockResolvedValue({ ok: false, reason: 'busy' });
      render(<PatientAddressInfoScreen />);

      fillValidForm();
      pressSave();

      await waitFor(() => {
        expect(mockSubmitRegistration).toHaveBeenCalled();
      });

      // The first save is still running and will very likely succeed. Saying
      // "could not save" here would be a lie.
      expect(showToast).not.toHaveBeenCalled();
    });
  });

  // 14 ------------------------------------------------------------------------

  describe('clearing an error', () => {
    it('clears on type, and raises nothing new until the next submit', async () => {
      render(<PatientAddressInfoScreen />);

      pressSave();
      await waitFor(() => {
        expect(screen.getByText('Please enter city/village')).toBeTruthy();
      });

      fireEvent.changeText(screen.getByLabelText(LABELS.village), 'N');

      expect(screen.queryByText('Please enter city/village')).toBeNull();

      // "N" is valid, but a single colon would not be - and no error appears
      // for it either, because reValidateMode is 'onSubmit'. The legacy
      // validated on every keystroke with rules that disagreed with its own
      // submit rules.
      fireEvent.changeText(screen.getByLabelText(LABELS.village), 'Navi:');

      expect(screen.queryByText('Please enter a valid city/village name')).toBeNull();
    });

    it('clears the state and district errors when a state is picked', async () => {
      render(<PatientAddressInfoScreen />);

      pressSave();
      await waitFor(() => {
        expect(screen.getByText('Please select province')).toBeTruthy();
      });

      pick(statePanel(), 'Maharashtra');

      expect(screen.queryByText('Please select province')).toBeNull();
      expect(screen.queryByText('Please select district')).toBeNull();
    });

    it('scrolls to the first errored field after a failed submit', async () => {
      const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');

      render(<PatientAddressInfoScreen />);

      // onLayout never fires in the test renderer, so the measurement the real
      // layout pass would make is fed in by hand. State is the first field in
      // submit order and is laid out in row 1, which is the nearest ancestor
      // of the Country field carrying an onLayout.
      act(() => {
        fireEvent(blockHolding(screen.getByDisplayValue(clientConfig.countryName)), 'layout', {
          nativeEvent: { layout: { x: 0, y: 200, width: 0, height: 0 } },
        });
      });

      pressSave();

      await waitFor(() => {
        expect(scrollTo).toHaveBeenCalled();
      });

      // The block's own y, less the margin that keeps the label off the top
      // edge. The legacy passed an absolute screen Y straight through as a
      // content offset, which was wrong by the height of the whole header.
      expect(scrollTo).toHaveBeenCalledWith({ y: 200 - 12, animated: true });

      scrollTo.mockRestore();
    });
  });
});
