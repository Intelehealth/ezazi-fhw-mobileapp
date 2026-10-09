import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, success } from '@ezazi/api-client';
import { HwProfileComponent } from '../../../../modules/dashboard/hw-profile/hw-profile.component';
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

/*
 * Same dual-React hoisting hazard profile.component.test.tsx documents:
 * a real react-redux Provider crashes here, so store/hooks is mocked.
 */
vi.mock('../../../../store/hooks', () => ({
  useAppSelector: vi.fn(),
}));

const USER: AuthUser = {
  uuid: 'u-1',
  username: 'nurse1',
  displayName: 'Demo Nurse',
  roles: ['ORGANIZATIONAL: NURSE'],
  providerUuid: 'p-1',
  personUuid: 'per-1',
};

function attribute(display: string, value: string) {
  return {
    uuid: `attr-${display}`,
    attributeType: { uuid: `type-${display}`, display },
    value,
    voided: false,
  };
}

const PROVIDER: OpenMrsProvider = {
  uuid: 'p-1',
  person: {
    uuid: 'per-1',
    display: 'Demo Nurse',
    gender: 'F',
    age: 30,
    birthdate: '1995-04-12',
    preferredName: {
      uuid: 'name-1',
      givenName: 'Demo',
      middleName: 'K',
      familyName: 'Nurse',
    },
  },
  attributes: [
    attribute('emailId', 'nurse@example.com'),
    attribute('phoneNumber', '9800000000'),
    attribute('whatsapp', '9800000001'),
    attribute('facility_name', 'Ason Primary Health Care Centre'),
    attribute('provider_ward', 'Post Natal Ward'),
    attribute('qualification', 'MBBS'),
  ],
};

const ATTRIBUTE_TYPES: ProviderAttributeType[] = PROVIDER.attributes.map(
  attr => attr.attributeType
);

const LOCATIONS: OpenMrsLocation[] = [
  { uuid: 'loc-1', display: 'Ason Primary Health Care Centre' },
];

function renderHwProfile() {
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

  return render(<HwProfileComponent />, { wrapper: Wrapper });
}

async function openEditMode() {
  renderHwProfile();
  await waitFor(() =>
    expect(screen.getByText('nurse@example.com')).toBeInTheDocument()
  );
  fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
}

beforeEach(() => {
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: { user: USER, token: 'tok-123', isAuthenticated: true },
      config: { data: null, error: null, lastFetched: null },
    })
  );
  Object.values(profileService).forEach(fn => vi.mocked(fn).mockReset());

  vi.mocked(profileService.getProvider).mockResolvedValue(success(PROVIDER));
  vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue(
    success(ATTRIBUTE_TYPES)
  );
  vi.mocked(profileService.getLoginLocations).mockResolvedValue(
    success(LOCATIONS)
  );
});

describe('HwProfileComponent', () => {
  it('shows a loading state, then only the nurse fields in view mode', async () => {
    renderHwProfile();

    expect(screen.getByText('Loading profile…')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText('nurse@example.com')).toBeInTheDocument()
    );
    expect(screen.getByText('Demo Nurse')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('9800000000')).toBeInTheDocument();
    expect(screen.getByText('9800000001')).toBeInTheDocument();
    expect(
      screen.getByText('Ason Primary Health Care Centre')
    ).toBeInTheDocument();
    expect(screen.getByText('Post Natal Ward')).toBeInTheDocument();
    expect(screen.queryByText('Qualification')).not.toBeInTheDocument();
    expect(screen.queryByText('Signature')).not.toBeInTheDocument();
    expect(screen.queryByText('State')).not.toBeInTheDocument();
  });

  it('shows an error state when the provider fetch fails', async () => {
    vi.mocked(profileService.getProvider).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'provider not found'),
    });

    renderHwProfile();

    await waitFor(() =>
      expect(screen.getByText('provider not found')).toBeInTheDocument()
    );
  });

  it('defaults the ward to Labor Ward when none is saved', async () => {
    vi.mocked(profileService.getProvider).mockResolvedValue(
      success({
        ...PROVIDER,
        attributes: PROVIDER.attributes.filter(
          attr => attr.attributeType.display !== 'provider_ward'
        ),
      })
    );

    renderHwProfile();

    await waitFor(() =>
      expect(screen.getByText('Labor Ward')).toBeInTheDocument()
    );
  });

  it('saves person/name/contact/facility/ward changes and leaves doctor-only attributes alone', async () => {
    vi.mocked(profileService.updatePerson).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.savePersonName).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.addOrUpdateProviderAttribute).mockResolvedValue(
      success(undefined)
    );

    await openEditMode();
    fireEvent.change(screen.getByLabelText('Ward *'), {
      target: { value: 'Labor Ward' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(profileService.updatePerson).toHaveBeenCalledWith('per-1', {
        gender: 'F',
        age: expect.any(Number),
        birthdate: '1995-04-12',
      })
    );
    expect(profileService.savePersonName).toHaveBeenCalledWith(
      'per-1',
      {
        givenName: 'Demo',
        middleName: 'K',
        familyName: 'Nurse',
        preferred: true,
        prefix: null,
      },
      'name-1'
    );
    await waitFor(() =>
      expect(profileService.addOrUpdateProviderAttribute).toHaveBeenCalledWith(
        'p-1',
        'type-provider_ward',
        'Labor Ward',
        'attr-provider_ward'
      )
    );
    const touchedTypes = vi
      .mocked(profileService.addOrUpdateProviderAttribute)
      .mock.calls.map(call => call[1]);
    expect(touchedTypes).not.toContain('type-qualification');
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

    const { container } = renderHwProfile();
    await waitFor(() =>
      expect(screen.getByText('nurse@example.com')).toBeInTheDocument()
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

  it('flags an already-taken email on blur and clears the flag when edited', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue(
      success({ success: true, data: false })
    );

    await openEditMode();
    const emailInput = screen.getByPlaceholderText('Enter email');
    fireEvent.change(emailInput, { target: { value: 'taken@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() =>
      expect(
        screen.getByText('Email already exists. Please enter another email.')
      ).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: 'free@example.com' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('flags an already-taken phone number on blur and clears the flag when edited', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue(
      success({ success: true, data: false })
    );

    await openEditMode();
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

    fireEvent.change(phoneInput, { target: { value: '9222222222' } });
    await waitFor(() =>
      expect(
        screen.queryByText(
          'Phone number already exists. Please enter another phone number.'
        )
      ).not.toBeInTheDocument()
    );
  });

  it('does not check attribute availability when the field is blurred blank', async () => {
    await openEditMode();

    const emailInput = screen.getByPlaceholderText('Enter email');
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.blur(emailInput);

    await Promise.resolve();
    expect(profileService.validateProviderAttribute).not.toHaveBeenCalled();
  });

  /*
   * Longer timeout: fast on its own, but many field edits plus a full
   * submit can exceed the default 5000ms under the whole suite's parallel
   * load with coverage on (same note as profile.component.test.tsx).
   */
  it('shows a validation error for every required field on an invalid submit', async () => {
    await openEditMode();

    fireEvent.change(screen.getByLabelText('First name *'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Middle name *'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Last name *'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Phone Number *'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('WhatsApp Number *'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter email'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Facility Name *'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Ward *'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText('Enter first name')).toBeInTheDocument()
    );
    expect(screen.getByText('Enter middle name')).toBeInTheDocument();
    expect(screen.getByText('Enter last name')).toBeInTheDocument();
    expect(screen.getByText('Enter phone number')).toBeInTheDocument();
    expect(screen.getByText('Enter whatsApp number')).toBeInTheDocument();
    expect(screen.getByText('Enter email')).toBeInTheDocument();
    expect(screen.getByText('Select facility name')).toBeInTheDocument();
    expect(screen.getByText('Select ward')).toBeInTheDocument();
    expect(profileService.updatePerson).not.toHaveBeenCalled();
  }, 15000);

  it('shows the date-of-birth error when the nurse has no birthdate saved', async () => {
    vi.mocked(profileService.getProvider).mockResolvedValue(
      success({ ...PROVIDER, person: { ...PROVIDER.person, birthdate: '' } })
    );

    renderHwProfile();
    await waitFor(() =>
      expect(screen.getByText('nurse@example.com')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText('Enter DOB')).toBeInTheDocument()
    );
    expect(profileService.updatePerson).not.toHaveBeenCalled();
  });

  it('shows "Saving…" on the submit button while the save is in flight', async () => {
    vi.mocked(profileService.updatePerson).mockReturnValue(
      new Promise(() => undefined)
    );

    await openEditMode();
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    );
  });

  it('shows the age computed from the date of birth as a read-only field', async () => {
    await openEditMode();

    /* Computed from today's date so the expectation never goes stale. */
    const today = new Date();
    const hadBirthday =
      today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 12);
    const expectedAge = today.getFullYear() - 1995 - (hadBirthday ? 0 : 1);

    expect(screen.getByLabelText('Age *')).toHaveValue(String(expectedAge));
    expect(screen.getByLabelText('Age *')).toHaveAttribute('readonly');
  });
});
