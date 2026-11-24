import '@/core/i18n';
import { Image } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import dayjs from 'dayjs';
import { capturePhoto } from '@/core/services/photo';
import { AppDatePicker } from '@/core/ui/AppDatePicker';
import { useRegistrationDraftStore } from '../../stores/registrationDraft.store';
import type { PersonalInfoFormValues } from '../../domain/personalInfoForm.schema';
import { PatientPersonalInfoScreen } from '../PatientPersonalInfoScreen';

// The screen calls useNavigation, so it needs a navigation object. Same shape
// as LoginScreen.test.tsx.
const mockNavigate = jest.fn();
const mockPopTo = jest.fn();

// `popTo` and `usePreventRemove` are for the layout this screen renders, which
// owns the discard path — the screen itself only uses `navigate`.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), popTo: mockPopTo }),
  usePreventRemove: jest.fn(),
}));

// `deletePatientPhoto` belongs to the store's discard path, which nothing here
// drives — it is mocked only so the real module (expo-image-picker,
// expo-file-system) never loads.
jest.mock('@/core/services/photo', () => ({
  capturePhoto: jest.fn(),
  deletePatientPhoto: jest.fn().mockResolvedValue(undefined),
}));

const mockCapturePhoto = capturePhoto as jest.MockedFunction<typeof capturePhoto>;

/**
 * The REAL draft store, with its two actions swapped for spies through
 * `setState`. SetupScreen.test.tsx jest.mocks its store modules, but this
 * screen also reads `useRegistrationDraftStore.getState()` for its seed and
 * the layout it renders reads `discardRegistration`, so a selector-shaped mock
 * would have to re-implement both. Swapping the actions keeps the real store
 * and still pins what the screen calls.
 */
const mockStartRegistration = jest.fn();
const mockSetPersonal = jest.fn();

// Raw uuid literals are banned under src/ by eslint's NO_RAW_UUID rule, which
// excludes src/**/__tests__/** — exactly so a test can name one.
const PATIENT_UUID = '6f3c1b2a-0d5e-4a87-9c11-2b7f8e4d6a30';
const OTHER_PATIENT_UUID = 'c0ffee00-1111-4222-8333-444455556666';

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

const STORAGE = 'YYYY-MM-DD';
const DISPLAY = 'DD-MM-YY';

const valueOf = (label: string) => screen.getByLabelText(label).props.value as string;

const pressContinue = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

/** The three fields a submit needs. AGE also back-dates DATE OF BIRTH. */
const fillRequired = () => {
  fireEvent.changeText(screen.getByLabelText('First Name'), 'Asha');
  fireEvent.changeText(screen.getByLabelText('Last Name'), 'Patil');
  fireEvent.changeText(screen.getByLabelText('Age'), '28');
};

/** The modal's props, typed — the picker is driven through them, not its UI. */
const datePicker = () =>
  screen.UNSAFE_getByType(AppDatePicker).props as React.ComponentProps<typeof AppDatePicker>;

const openPhotoChooser = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Add a picture' }));

const chooseCamera = async () => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Camera' }));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCapturePhoto.mockResolvedValue(null);
  // Zustand state is module-global and survives between tests.
  useRegistrationDraftStore.setState({
    mode: 'create',
    patientUuid: PATIENT_UUID,
    personal: null,
    address: null,
    isSaving: false,
    startRegistration: mockStartRegistration,
    setPersonal: mockSetPersonal,
  });
});

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

  it('shows the four required messages on an empty submit and does not navigate', async () => {
    render(<PatientPersonalInfoScreen />);

    pressContinue();

    expect(await screen.findByText('Please enter first name')).toBeTruthy();
    expect(screen.getByText('Please enter last name')).toBeTruthy();
    expect(screen.getByText('Please select date of birth')).toBeTruthy();
    expect(screen.getByText('Age must be greater than 13 years')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // The house pattern: clearErrors on type, reValidateMode 'onSubmit'. The
  // legacy validated every keystroke with rules that disagreed with its own
  // submit rules.
  it('clears one field error on type and leaves the others standing', async () => {
    render(<PatientPersonalInfoScreen />);

    pressContinue();
    await screen.findByText('Please enter first name');

    fireEvent.changeText(screen.getByLabelText('First Name'), 'A');

    await waitFor(() => expect(screen.queryByText('Please enter first name')).toBeNull());
    expect(screen.getByText('Please enter last name')).toBeTruthy();
  });

  // Direction 2 of the age/date rule. Tests 5, 6 and 7 are the proof that the
  // legacy's isSyncing re-entrancy flag is not needed here.
  it('back-dates DATE OF BIRTH when an age is typed', () => {
    render(<PatientPersonalInfoScreen />);

    fireEvent.changeText(screen.getByLabelText('Age'), '25');

    expect(valueOf('Date of Birth')).toBe(dayjs().subtract(25, 'year').format(DISPLAY));
  });

  it('clears DATE OF BIRTH when AGE is cleared', () => {
    render(<PatientPersonalInfoScreen />);

    fireEvent.changeText(screen.getByLabelText('Age'), '25');
    fireEvent.changeText(screen.getByLabelText('Age'), '');

    expect(valueOf('Date of Birth')).toBe('');
  });

  // Direction 1 — whole years, so a date five days past the anniversary still
  // reads as the lower age.
  it('fills AGE with whole years when a date is confirmed', () => {
    render(<PatientPersonalInfoScreen />);

    const chosen = dayjs().subtract(30, 'year').subtract(5, 'day');
    act(() => datePicker().onChange(chosen.toDate()));

    expect(valueOf('Age')).toBe('30');
    expect(valueOf('Date of Birth')).toBe(chosen.format(DISPLAY));
  });

  // The floor is 1 January 1970 — where the legacy's previous-month chevron
  // disappeared, not the framework's 1900 default. The ceiling is the age rule.
  it('bounds the picker at 1 January 1970 and today minus thirteen years', () => {
    render(<PatientPersonalInfoScreen />);

    const { minDate, maxDate } = datePicker();

    expect(dayjs(minDate).format(STORAGE)).toBe('1970-01-01');
    expect(dayjs(maxDate).format(STORAGE)).toBe(dayjs().subtract(13, 'year').format(STORAGE));
  });

  // The floor binds the PICKER, not the schema: a typed age is the authority.
  it('accepts a typed age that back-dates below the picker floor', async () => {
    render(<PatientPersonalInfoScreen />);

    fireEvent.changeText(screen.getByLabelText('First Name'), 'Asha');
    fireEvent.changeText(screen.getByLabelText('Last Name'), 'Patil');
    fireEvent.changeText(screen.getByLabelText('Age'), '99');

    const backDated = dayjs().subtract(99, 'year');
    expect(dayjs(backDated).isBefore(dayjs('1970-01-01'))).toBe(true);
    expect(valueOf('Date of Birth')).toBe(backDated.format(DISPLAY));

    pressContinue();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('AddPatientAddress'));
    expect(mockSetPersonal).toHaveBeenCalledWith(
      expect.objectContaining({ age: '99', dateOfBirth: backDated.format(STORAGE) }),
    );
  });

  it('writes the typed values to the draft and goes to the address step', async () => {
    render(<PatientPersonalInfoScreen />);

    fillRequired();
    fireEvent.changeText(screen.getByLabelText('Mobile Number'), '9876543210');
    pressContinue();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('AddPatientAddress'));
    expect(mockSetPersonal).toHaveBeenCalledWith({
      photoPath: null,
      firstName: 'Asha',
      middleName: '',
      lastName: 'Patil',
      dateOfBirth: dayjs().subtract(28, 'year').format(STORAGE),
      age: '28',
      mobileNumber: '9876543210',
      alternateMobileNumber: '',
    });
  });

  it('writes nothing and goes nowhere on an invalid submit', async () => {
    render(<PatientPersonalInfoScreen />);

    fireEvent.changeText(screen.getByLabelText('First Name'), 'Asha');
    pressContinue();

    await screen.findByText('Please enter last name');
    expect(mockSetPersonal).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the chooser from the avatar and captures from the camera', async () => {
    render(<PatientPersonalInfoScreen />);

    expect(screen.queryByRole('button', { name: 'Camera' })).toBeNull();
    openPhotoChooser();
    expect(screen.getByRole('button', { name: 'Camera' })).toBeTruthy();

    await chooseCamera();

    expect(mockCapturePhoto).toHaveBeenCalledWith('camera', PATIENT_UUID);
  });

  // The service names the file from the uuid, so capture and the discard
  // delete cannot disagree about where it is.
  it('passes the uuid the draft is holding', async () => {
    useRegistrationDraftStore.setState({ patientUuid: OTHER_PATIENT_UUID });
    render(<PatientPersonalInfoScreen />);

    openPhotoChooser();
    await chooseCamera();

    expect(mockCapturePhoto).toHaveBeenCalledWith('camera', OTHER_PATIENT_UUID);
  });

  // A cancelled camera or gallery is not an error — it is the legacy acting
  // only on RESULT_OK.
  it('keeps the previous photo when a capture is cancelled', async () => {
    mockCapturePhoto.mockResolvedValueOnce('file:///document/patient-photos/first.jpg');
    render(<PatientPersonalInfoScreen />);

    openPhotoChooser();
    await chooseCamera();
    expect(screen.UNSAFE_getByType(Image).props.source.uri).toBe(
      'file:///document/patient-photos/first.jpg',
    );

    mockCapturePhoto.mockResolvedValueOnce(null);
    openPhotoChooser();
    await chooseCamera();

    expect(screen.UNSAFE_getByType(Image).props.source.uri).toBe(
      'file:///document/patient-photos/first.jpg',
    );
    expect(screen.queryByRole('button', { name: 'Camera' })).toBeNull();
  });

  // Coming Back from the address step re-fills the fields. AGE is in the draft
  // only for this; nothing past this screen reads it.
  it('seeds the fields from a personal half already in the draft', () => {
    const seeded: PersonalInfoFormValues = {
      photoPath: null,
      firstName: 'Asha',
      middleName: 'Rani',
      lastName: 'Patil',
      dateOfBirth: '1998-04-28',
      age: '28',
      mobileNumber: '9876543210',
      alternateMobileNumber: '9123456780',
    };
    useRegistrationDraftStore.setState({ personal: seeded });

    render(<PatientPersonalInfoScreen />);

    expect(valueOf('First Name')).toBe('Asha');
    expect(valueOf('Middle Name')).toBe('Rani');
    expect(valueOf('Last Name')).toBe('Patil');
    expect(valueOf('Date of Birth')).toBe('28-04-98');
    expect(valueOf('Age')).toBe('28');
    expect(valueOf('Mobile Number')).toBe('9876543210');
    expect(valueOf('Alternate Mobile Number')).toBe('9123456780');
  });
});
