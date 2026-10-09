import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import { profileService } from '../../services/profile.service';
import { showToast } from '../../services/toast';
import { ATTRIBUTE_FIELD_MAP } from '../../modules/dashboard/profile/profile.attribute-map';
import { calculateAge } from '../../utils/age';
import type { ProfileFormValues } from '../../modules/dashboard/profile/profile.validation';

/**
 * The doctor form's values, or the nurse (hw-profile) form's subset of them —
 * only the person fields are mandatory; attribute fields the form doesn't
 * have are left untouched on save rather than blanked.
 */
export type ProviderProfileFormValues = Pick<
  ProfileFormValues,
  'givenName' | 'middleName' | 'familyName' | 'gender' | 'birthdate'
> &
  Partial<ProfileFormValues>;

export interface UpdateProviderProfileInput {
  values: ProviderProfileFormValues;
  providerUuid: string;
  personUuid: string;
  preferredNameUuid: string | null;
  attributeTypeUuidByField: Partial<Record<string, string>>;
  existingAttributeUuidByField: Partial<Record<string, string>>;
}

/**
 * Ports profile.component.ts's updateProfile(): a person update (gender/
 * age/birthdate), a person-name create-or-update, and then every dynamic
 * field as a provider-attribute create-or-update — the last group fired in
 * parallel, mirroring ProviderService.requestDataFromMultipleSources's
 * forkJoin. Fields whose attribute type didn't come back from
 * getProviderAttributeTypes (no `attributeTypeUuidByField` entry) are
 * skipped rather than failing the whole save — that vocabulary is
 * server-defined and this app doesn't control it.
 */
async function performUpdate(input: UpdateProviderProfileInput): Promise<void> {
  const {
    values,
    providerUuid,
    personUuid,
    preferredNameUuid,
    attributeTypeUuidByField,
    existingAttributeUuidByField,
  } = input;

  const personResult = await profileService.updatePerson(personUuid, {
    gender: values.gender,
    age: calculateAge(values.birthdate) ?? 0,
    birthdate: values.birthdate,
  });
  if (!personResult.ok) throw personResult.error;

  const nameResult = await profileService.savePersonName(
    personUuid,
    {
      givenName: values.givenName,
      middleName: values.middleName,
      familyName: values.familyName,
      preferred: true,
      prefix: null,
    },
    preferredNameUuid ?? undefined
  );
  if (!nameResult.ok) throw nameResult.error;

  const attributeResults = await Promise.all(
    ATTRIBUTE_FIELD_MAP.map(({ field }) => {
      const attributeTypeUuid = attributeTypeUuidByField[field];
      const value = values[field];
      if (!attributeTypeUuid || value === undefined) return null;

      return profileService.addOrUpdateProviderAttribute(
        providerUuid,
        attributeTypeUuid,
        value,
        existingAttributeUuidByField[field]
      );
    })
  );

  for (const result of attributeResults) {
    if (result && !result.ok) throw result.error;
  }
}

export function useUpdateProviderProfile() {
  const queryClient = useQueryClient();

  return useMutation<void, Error | ApiError, UpdateProviderProfileInput>({
    mutationFn: performUpdate,
    onSuccess: () => {
      showToast(
        'Profile Updated',
        'Your profile has been saved successfully.',
        'success'
      );
      // Re-fetches the provider, matching profile.component.ts's own
      // refresh-after-save (see useProviderProfile's query key).
      void queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
    },
    onError: error => {
      showToast('Update Failed', error.message, 'error');
    },
  });
}
