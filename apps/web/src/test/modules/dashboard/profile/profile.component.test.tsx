import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { success } from '@ezazi/api-client';
import userIcon from '../../../../assets/svgs/user.svg';
import { ProfileComponent } from '../../../../modules/dashboard/profile/profile.component';
import { profileService } from '../../../../services/profile.service';
import { useAppSelector } from '../../../../store/hooks';
import type {
  OpenMrsLocation,
  OpenMrsProvider,
  ProviderAttributeType,
} from '../../../../types/profile.types';
import type { AuthUser } from '../../../../types/auth.types';

vi.mock('../../../../services/profile.service', () => ({
  profileService: {
    getProvider: vi.fn(),
    getProviderAttributeTypes: vi.fn(),
    getLoginLocations: vi.fn(),
    updatePerson: vi.fn(),
    savePersonName: vi.fn(),
    addOrUpdateProviderAttribute: vi.fn(),
    updateProfileImage: vi.fn(),
    validateProviderAttribute: vi.fn(),
  },
}));

// Real react-redux + a real Provider crashes here with "Cannot read
// properties of null (reading 'useRef')" — the same dual-React hoisting
// hazard dashboard.page.test.tsx documents and works around by mocking
// store/hooks instead of wiring a real Provider.
vi.mock('../../../../store/hooks', () => ({
  useAppSelector: vi.fn(),
}));

const USER: AuthUser = {
  uuid: 'u-1',
  username: 'doctor1',
  displayName: 'Demo Male Doctor',
  roles: ['ORGANIZATIONAL: DOCTOR'],
  providerUuid: 'p-1',
  personUuid: 'per-1',
};

const PROVIDER: OpenMrsProvider = {
  uuid: 'p-1',
  person: {
    uuid: 'per-1',
    display: 'Demo Male Doctor',
    gender: 'M',
    age: 38,
    birthdate: '1988-04-12',
    preferredName: {
      uuid: 'name-1',
      givenName: 'Demo',
      middleName: 'K',
      familyName: 'Doctor',
    },
  },
  attributes: [
    {
      uuid: 'attr-email',
      attributeType: { uuid: 'type-emailId', display: 'emailId' },
      value: 'demo@example.com',
      voided: false,
    },
    {
      uuid: 'attr-phone',
      attributeType: { uuid: 'type-phoneNumber', display: 'phoneNumber' },
      value: '9800000000',
      voided: false,
    },
    {
      uuid: 'attr-whatsapp',
      attributeType: { uuid: 'type-whatsapp', display: 'whatsapp' },
      value: '9800000000',
      voided: false,
    },
    {
      uuid: 'attr-qualification',
      attributeType: { uuid: 'type-qualification', display: 'qualification' },
      value: 'MBBS',
      voided: false,
    },
    {
      uuid: 'attr-specialization',
      attributeType: { uuid: 'type-specialization', display: 'specialization' },
      value: 'Obstetrician & Gynecologist',
      voided: false,
    },
    {
      uuid: 'attr-registration',
      attributeType: {
        uuid: 'type-registrationNumber',
        display: 'registrationNumber',
      },
      value: 'REG-1',
      voided: false,
    },
    {
      uuid: 'attr-facility',
      attributeType: { uuid: 'type-facility_name', display: 'facility_name' },
      value: 'Ason Primary Health Care Centre',
      voided: false,
    },
    {
      uuid: 'attr-ward',
      attributeType: { uuid: 'type-provider_ward', display: 'provider_ward' },
      value: 'Labor Ward',
      voided: false,
    },
    {
      uuid: 'attr-signature',
      attributeType: { uuid: 'type-textOfSign', display: 'textOfSign' },
      value: 'D. Doctor',
      voided: false,
    },
    {
      uuid: 'attr-font',
      attributeType: { uuid: 'type-fontOfSign', display: 'fontOfSign' },
      value: 'arty',
      voided: false,
    },
  ],
};

const ATTRIBUTE_TYPES: ProviderAttributeType[] = PROVIDER.attributes.map(
  attr => attr.attributeType
);

const LOCATIONS: OpenMrsLocation[] = [
  { uuid: 'loc-1', display: 'Ason Primary Health Care Centre' },
];

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(<ProfileComponent />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: { user: USER, token: 'tok-123', isAuthenticated: true },
      config: { data: null, error: null, lastFetched: null },
    })
  );
  // Every profileService function is a shared vi.fn() across this whole
  // file's tests — without resetting both call history AND implementation
  // here, a later test can silently inherit an earlier test's mockResolvedValue
  // (and its accumulated call count), which is exactly what previously made
  // a `.not.toHaveBeenCalled()` assertion fail for the wrong reason.
  vi.mocked(profileService.getProvider).mockReset();
  vi.mocked(profileService.getProviderAttributeTypes).mockReset();
  vi.mocked(profileService.getLoginLocations).mockReset();
  vi.mocked(profileService.updatePerson).mockReset();
  vi.mocked(profileService.savePersonName).mockReset();
  vi.mocked(profileService.addOrUpdateProviderAttribute).mockReset();
  vi.mocked(profileService.updateProfileImage).mockReset();
  vi.mocked(profileService.validateProviderAttribute).mockReset();

  vi.mocked(profileService.getProvider).mockResolvedValue(success(PROVIDER));
  vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue(
    success(ATTRIBUTE_TYPES)
  );
  vi.mocked(profileService.getLoginLocations).mockResolvedValue(
    success(LOCATIONS)
  );
});

describe('ProfileComponent', () => {
  it('shows a loading state, then the fetched profile in view mode', async () => {
    renderProfile();

    expect(screen.getByText('Loading profile…')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );
    expect(screen.getByText('Dr. Demo Doctor')).toBeInTheDocument();
    expect(screen.getByText('D. Doctor')).toBeInTheDocument();
    expect(profileService.getProvider).toHaveBeenCalledWith('u-1');
  });

  it('shows an error state when the provider fetch fails', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(profileService.getProvider).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'provider not found'),
    });

    renderProfile();

    await waitFor(() =>
      expect(screen.getByText('provider not found')).toBeInTheDocument()
    );
  });

  it('saves person/name/attribute changes and returns to view mode', async () => {
    vi.mocked(profileService.updatePerson).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.savePersonName).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.addOrUpdateProviderAttribute).mockResolvedValue(
      success(undefined)
    );

    renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    fireEvent.change(screen.getByPlaceholderText('Enter registration number'), {
      target: { value: 'REG-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(profileService.updatePerson).toHaveBeenCalledWith('per-1', {
        gender: 'M',
        age: expect.any(Number),
        birthdate: '1988-04-12',
      })
    );
    expect(profileService.savePersonName).toHaveBeenCalledWith(
      'per-1',
      {
        givenName: 'Demo',
        middleName: 'K',
        familyName: 'Doctor',
        preferred: true,
        prefix: null,
      },
      'name-1'
    );
    expect(profileService.addOrUpdateProviderAttribute).toHaveBeenCalledWith(
      'p-1',
      'type-registrationNumber',
      'REG-2',
      'attr-registration'
    );
    // Save succeeded -> back to view mode's edit-pencil button.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /edit profile/i })
      ).toBeInTheDocument()
    );
  });

  it('uploads a chosen photo as base64', async () => {
    vi.mocked(profileService.updateProfileImage).mockResolvedValue(
      success(undefined)
    );

    const { container } = renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(profileService.updateProfileImage).toHaveBeenCalledWith({
        person: 'per-1',
        base64EncodedImage: expect.any(String),
      })
    );
  });

  it('flags an already-taken email on blur', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue(
      success({ success: true, data: false })
    );

    renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    const emailInput = screen.getByPlaceholderText('Enter email');
    fireEvent.change(emailInput, { target: { value: 'taken@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() =>
      expect(profileService.validateProviderAttribute).toHaveBeenCalled()
    );

    await waitFor(() =>
      expect(
        screen.getByText('Email already exists. Please enter another email.')
      ).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Editing the field clears the flag until the next blur re-checks it.
    fireEvent.change(emailInput, { target: { value: 'free@example.com' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('reveals the Other Qualification field when "Other" is selected', async () => {
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    expect(
      screen.queryByPlaceholderText('Enter other qualification')
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Qualification *'), {
      target: { value: 'Other' },
    });

    expect(
      screen.getByPlaceholderText('Enter other qualification')
    ).toBeInTheDocument();
  });

  it('updates fontOfSign when a font is picked from the signature selector', async () => {
    vi.mocked(profileService.updatePerson).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.savePersonName).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.addOrUpdateProviderAttribute).mockResolvedValue(
      success(undefined)
    );

    renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    // The trigger's accessible name is its preview text, not the "Select
    // Signature" label — that label isn't htmlFor-associated with it (see
    // signature-font-select.component.tsx) — which here is the provider's
    // existing signature text, "D. Doctor".
    fireEvent.click(screen.getByRole('button', { name: 'D. Doctor' }));
    const listbox = screen.getByRole('listbox');
    // Options are previewed in that same text — pick the second font
    // (asem), different from the provider's existing "arty".
    fireEvent.click(within(listbox).getAllByRole('button')[1]);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(profileService.addOrUpdateProviderAttribute).toHaveBeenCalledWith(
        'p-1',
        'type-fontOfSign',
        'asem',
        'attr-font'
      )
    );
  });

  // Longer timeout: this test alone is fast (~1s), but under the full
  // suite's parallel worker load with coverage instrumentation on, it can
  // occasionally exceed the default 5000ms purely from CPU contention, not
  // any actual hang — confirmed by running it isolated and with coverage
  // alone, both consistently fast.
  it("computes Age correctly on both sides of this year's birthday", async () => {
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    // Built from the real current date (no fake timers — see
    // useUpdateProviderProfile.test.tsx's own equivalent test for why:
    // mixing vi.useFakeTimers() with @testing-library's real-timer-based
    // polling, and now this form's own PhoneInput fields, is fragile) so
    // this passes regardless of which day it actually runs on.
    const alreadyHadBirthday = new Date();
    alreadyHadBirthday.setDate(alreadyHadBirthday.getDate() - 5);
    alreadyHadBirthday.setFullYear(alreadyHadBirthday.getFullYear() - 20);

    const notYetHadBirthday = new Date();
    notYetHadBirthday.setDate(notYetHadBirthday.getDate() + 5);
    notYetHadBirthday.setFullYear(notYetHadBirthday.getFullYear() - 20);

    const MONTHS = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
    ]; // prettier-ignore
    const pickDate = (date: Date) => {
      fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));
      fireEvent.click(
        screen.getByRole('button', { name: 'Choose month and year' })
      );
      fireEvent.click(screen.getByRole('button', { name: String(date.getFullYear()) }));
      fireEvent.click(screen.getByRole('button', { name: MONTHS[date.getMonth()] }));
      const month = MONTHS[date.getMonth()];
      const label = `${String(date.getDate()).padStart(2, '0')} ${month[0]}${month.slice(1).toLowerCase()} ${date.getFullYear()}`;
      fireEvent.click(screen.getByRole('button', { name: label }));
    };

    pickDate(alreadyHadBirthday);
    expect(screen.getByLabelText('Age *')).toHaveValue('20');

    pickDate(notYetHadBirthday);
    expect(screen.getByLabelText('Age *')).toHaveValue('19');
  }, 15000);

  it('does not check attribute availability when the field is blurred blank', async () => {
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    const emailInput = screen.getByPlaceholderText('Enter email');
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.blur(emailInput);

    // Give any (wrongly-fired) async validation a tick to run.
    await Promise.resolve();
    expect(profileService.validateProviderAttribute).not.toHaveBeenCalled();
  });

  it('shows phone/WhatsApp digits as typed, without the library\'s mid-number dash', async () => {
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    const phoneInput = screen.getByLabelText('Phone Number *');
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });

    expect(phoneInput).toHaveValue('9876543210');
    const whatsappInput = screen.getByLabelText('WhatsApp Number *');
    fireEvent.change(whatsappInput, { target: { value: '9123456789' } });
    expect(whatsappInput).toHaveValue('9123456789');
  });

  it('flags an already-taken phone number on blur', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue(
      success({ success: true, data: false })
    );

    renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    const phoneInput = screen.getByLabelText('Phone Number *');
    fireEvent.change(phoneInput, { target: { value: '9111111111' } });
    fireEvent.blur(phoneInput);

    await waitFor(() =>
      expect(
        screen.getByText(
          'Phone number already exists. Please enter another phone number.'
        )
      ).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('falls back to the user icon when the profile photo fails to load', async () => {
    const { container } = renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );

    const photo = container.querySelector(
      'img.rounded-full'
    ) as HTMLImageElement;
    fireEvent.error(photo);

    expect(photo.src).toBe(new URL(userIcon, window.location.href).href);
  });

  it('shows the combined "Other (specify)" qualification in view mode', async () => {
    vi.mocked(profileService.getProvider).mockResolvedValue(
      success({
        ...PROVIDER,
        attributes: PROVIDER.attributes
          .map(attr =>
            attr.attributeType.display === 'qualification'
              ? { ...attr, value: 'Other' }
              : attr
          )
          .concat({
            uuid: 'attr-other-qualification',
            attributeType: {
              uuid: 'type-otherQualification',
              display: 'otherQualification',
            },
            value: 'Ayurvedic Medicine',
            voided: false,
          }),
      })
    );
    vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue(
      success([
        ...ATTRIBUTE_TYPES,
        { uuid: 'type-otherQualification', display: 'otherQualification' },
      ])
    );

    renderProfile();

    await waitFor(() =>
      expect(screen.getByText('Other (Ayurvedic Medicine)')).toBeInTheDocument()
    );
  });

  it('shows validation errors and keeps the Other Qualification field required, on an invalid submit', async () => {
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    fireEvent.change(screen.getByLabelText('First name *'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Qualification *'), {
      target: { value: 'Other' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText('Enter first name')).toBeInTheDocument()
    );
    expect(screen.getByText('Enter other qualification')).toBeInTheDocument();
    expect(profileService.updatePerson).not.toHaveBeenCalled();
  });
});
