import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { success } from '@ezazi/api-client';
import { useUpdateProviderProfile } from '../../../hooks/mutations/useUpdateProviderProfile';
import { profileService } from '../../../services/profile.service';
import { showToast } from '../../../services/toast';
import type { ProfileFormValues } from '../../../modules/dashboard/profile/profile.validation';

vi.mock('../../../services/profile.service', () => ({
  profileService: {
    updatePerson: vi.fn(),
    savePersonName: vi.fn(),
    addOrUpdateProviderAttribute: vi.fn(),
  },
}));

vi.mock('../../../services/toast', () => ({ showToast: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const VALUES: ProfileFormValues = {
  givenName: 'Demo',
  middleName: 'K',
  familyName: 'Doctor',
  gender: 'M',
  birthdate: '1988-04-12',
  phoneNumber: '9800000000',
  whatsapp: '9800000000',
  emailId: 'demo@example.com',
  visitState: 'Bagmati',
  qualification: 'MBBS',
  otherQualification: '',
  specialization: 'Obstetrician & Gynecologist',
  registrationNumber: 'REG-1',
  facilityName: 'Ason Primary Health Care Centre',
  providerWard: 'Labor Ward',
  textOfSign: 'D. Doctor',
  fontOfSign: 'arty',
};

beforeEach(() => {
  vi.mocked(profileService.updatePerson).mockReset();
  vi.mocked(profileService.savePersonName).mockReset();
  vi.mocked(profileService.addOrUpdateProviderAttribute).mockReset();
  vi.mocked(showToast).mockReset();
});

describe('useUpdateProviderProfile', () => {
  it('updates the person, saves the name, and upserts every mapped attribute in parallel', async () => {
    vi.mocked(profileService.updatePerson).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.savePersonName).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.addOrUpdateProviderAttribute).mockResolvedValue(
      success(undefined)
    );

    const { result } = renderHook(() => useUpdateProviderProfile(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        values: VALUES,
        providerUuid: 'p-1',
        personUuid: 'per-1',
        preferredNameUuid: 'name-1',
        attributeTypeUuidByField: {
          phoneNumber: 'type-phoneNumber',
          emailId: 'type-emailId',
        },
        existingAttributeUuidByField: { emailId: 'attr-email' },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(profileService.updatePerson).toHaveBeenCalledWith('per-1', {
      gender: 'M',
      age: expect.any(Number),
      birthdate: '1988-04-12',
    });
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
    // emailId already has an existing attribute uuid -> update path.
    expect(profileService.addOrUpdateProviderAttribute).toHaveBeenCalledWith(
      'p-1',
      'type-emailId',
      'demo@example.com',
      'attr-email'
    );
    // phoneNumber has no existing attribute uuid -> create path.
    expect(profileService.addOrUpdateProviderAttribute).toHaveBeenCalledWith(
      'p-1',
      'type-phoneNumber',
      '9800000000',
      undefined
    );
    // Fields with no resolved attributeType uuid (not in this test's map) are skipped, not failed.
    expect(profileService.addOrUpdateProviderAttribute).toHaveBeenCalledTimes(
      2
    );
    expect(showToast).toHaveBeenCalledWith(
      'Profile Updated',
      expect.any(String),
      'success'
    );
  });

  it('fails the whole mutation if the person update rejects, without saving the name or attributes', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(profileService.updatePerson).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'invalid birthdate'),
    });

    const { result } = renderHook(() => useUpdateProviderProfile(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        values: VALUES,
        providerUuid: 'p-1',
        personUuid: 'per-1',
        preferredNameUuid: null,
        attributeTypeUuidByField: {},
        existingAttributeUuidByField: {},
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('invalid birthdate');
    expect(profileService.savePersonName).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'Update Failed',
      'invalid birthdate',
      'error'
    );
  });

  it('fails the whole mutation if saving the name rejects, without upserting any attributes', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(profileService.updatePerson).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.savePersonName).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'invalid name'),
    });

    const { result } = renderHook(() => useUpdateProviderProfile(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        values: VALUES,
        providerUuid: 'p-1',
        personUuid: 'per-1',
        preferredNameUuid: 'name-1',
        attributeTypeUuidByField: { emailId: 'type-emailId' },
        existingAttributeUuidByField: {},
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('invalid name');
    expect(profileService.addOrUpdateProviderAttribute).not.toHaveBeenCalled();
  });

  it('fails the whole mutation if any attribute upsert rejects', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(profileService.updatePerson).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.savePersonName).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.addOrUpdateProviderAttribute).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'attribute rejected'),
    });

    const { result } = renderHook(() => useUpdateProviderProfile(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        values: VALUES,
        providerUuid: 'p-1',
        personUuid: 'per-1',
        preferredNameUuid: null,
        attributeTypeUuidByField: { emailId: 'type-emailId' },
        existingAttributeUuidByField: {},
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('attribute rejected');
  });

  it("computes age correctly on both sides of this year's birthday", async () => {
    vi.mocked(profileService.updatePerson).mockResolvedValue(
      success(undefined)
    );
    vi.mocked(profileService.savePersonName).mockResolvedValue(
      success(undefined)
    );

    // Built from the real current date (no fake timers — those interact
    // badly with @testing-library's real-timer-based waitFor polling) so
    // this passes regardless of which day it actually runs on.
    const alreadyHadBirthday = new Date();
    alreadyHadBirthday.setDate(alreadyHadBirthday.getDate() - 5);
    alreadyHadBirthday.setFullYear(alreadyHadBirthday.getFullYear() - 20);

    const notYetHadBirthday = new Date();
    notYetHadBirthday.setDate(notYetHadBirthday.getDate() + 5);
    notYetHadBirthday.setFullYear(notYetHadBirthday.getFullYear() - 20);

    const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

    const { result } = renderHook(() => useUpdateProviderProfile(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        values: { ...VALUES, birthdate: toDateOnly(alreadyHadBirthday) },
        providerUuid: 'p-1',
        personUuid: 'per-1',
        preferredNameUuid: null,
        attributeTypeUuidByField: {},
        existingAttributeUuidByField: {},
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(profileService.updatePerson).toHaveBeenCalledWith('per-1', {
      gender: 'M',
      age: 20,
      birthdate: toDateOnly(alreadyHadBirthday),
    });

    act(() => {
      result.current.mutate({
        values: { ...VALUES, birthdate: toDateOnly(notYetHadBirthday) },
        providerUuid: 'p-1',
        personUuid: 'per-1',
        preferredNameUuid: null,
        attributeTypeUuidByField: {},
        existingAttributeUuidByField: {},
      });
    });

    await waitFor(() =>
      expect(profileService.updatePerson).toHaveBeenCalledWith('per-1', {
        gender: 'M',
        age: 19,
        birthdate: toDateOnly(notYetHadBirthday),
      })
    );
  });
});
