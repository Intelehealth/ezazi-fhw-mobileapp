import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import { getOpenMrsBaseUrl } from '../../services/http';
import { profileService } from '../../services/profile.service';
import { useAppSelector } from '../../store/hooks';
import { ATTRIBUTE_FIELD_MAP } from '../../modules/dashboard/profile/profile.attribute-map';
import type {
  DoctorProfile,
  Gender,
} from '../../modules/dashboard/profile/profile.types';
import type {
  OpenMrsLocation,
  OpenMrsProvider,
  ProviderAttributeType,
} from '../../types/profile.types';

export interface ProviderProfileData {
  profile: DoctorProfile;
  providerUuid: string;
  personUuid: string;
  preferredNameUuid: string | null;
  facilities: OpenMrsLocation[];
  /** attribute field -> its OpenMRS attributeType uuid (needed to create a new attribute). */
  attributeTypeUuidByField: Partial<Record<string, string>>;
  /** attribute field -> the doctor's EXISTING attribute uuid, if one is already set (needed to update instead of create). */
  existingAttributeUuidByField: Partial<Record<string, string>>;
}

function toGender(openMrsGender: string): Gender {
  return openMrsGender === 'M' || openMrsGender === 'F' ? openMrsGender : 'U';
}

/**
 * OpenMRS's `person.birthdate` comes back as a full ISO datetime (e.g.
 * `1988-04-12T00:00:00.000+0000`), not a plain date — profile.component.ts
 * reformats it with `moment(...).format('YYYY-MM-DD')` before binding it to
 * the form for exactly this reason: a native `<input type="date">` (see
 * profile.component.tsx's TextField) silently renders blank for any value
 * that isn't precisely `YYYY-MM-DD`, so without this the DOB field looks
 * empty after every load/reload even though the data is there.
 */
function toDateOnly(isoDatetime: string | null): string {
  return isoDatetime?.slice(0, 10) ?? '';
}

/**
 * Maps the OpenMRS wire shapes into the form's DoctorProfile shape — the
 * inverse of ATTRIBUTE_FIELD_MAP, used again (forward direction) by
 * useUpdateProviderProfile when saving.
 */
function buildProviderProfileData(
  provider: OpenMrsProvider,
  attributeTypes: ProviderAttributeType[],
  facilities: OpenMrsLocation[]
): ProviderProfileData {
  const { person } = provider;
  const attributeTypeUuidByField: Partial<Record<string, string>> = {};
  const existingAttributeUuidByField: Partial<Record<string, string>> = {};
  const valueByField: Partial<Record<string, string>> = {};

  for (const { field, attributeDisplayName } of ATTRIBUTE_FIELD_MAP) {
    const type = attributeTypes.find(t => t.display === attributeDisplayName);
    if (type) attributeTypeUuidByField[field] = type.uuid;

    const existing = provider.attributes.find(
      attr =>
        !attr.voided && attr.attributeType.display === attributeDisplayName
    );
    if (existing) {
      existingAttributeUuidByField[field] = existing.uuid;
      valueByField[field] = existing.value;
    }
  }

  const profile: DoctorProfile = {
    givenName: person.preferredName?.givenName ?? '',
    middleName: person.preferredName?.middleName ?? '',
    familyName: person.preferredName?.familyName ?? '',
    gender: toGender(person.gender),
    birthdate: toDateOnly(person.birthdate),
    phoneNumber: valueByField.phoneNumber ?? '',
    whatsapp: valueByField.whatsapp ?? '',
    emailId: valueByField.emailId ?? '',
    visitState: valueByField.visitState ?? '',
    qualification: valueByField.qualification ?? '',
    otherQualification: valueByField.otherQualification ?? '',
    specialization: valueByField.specialization ?? '',
    registrationNumber: valueByField.registrationNumber ?? '',
    facilityName: valueByField.facilityName ?? '',
    providerWard: valueByField.providerWard ?? '',
    textOfSign: valueByField.textOfSign ?? '',
    fontOfSign: valueByField.fontOfSign ?? '',
    // Ports profile.component.html's `[src]="profilePicUrl"` — a plain GET
    // rendered by the <img> tag itself, not routed through our authenticated
    // axios client, exactly like the Angular source (see profile.service.ts's
    // own note on what this app does and doesn't wrap in HttpClient).
    // getOpenMrsBaseUrl() (not env.OPENMRS_URL directly) so this rides the
    // same dev-proxy path as every other OpenMRS call — see that function's
    // own note in services/http.ts on why the raw cross-origin URL 401s here.
    photoUrl: `${getOpenMrsBaseUrl()}/personimage/${person.uuid}`,
  };

  return {
    profile,
    providerUuid: provider.uuid,
    personUuid: person.uuid,
    preferredNameUuid: person.preferredName?.uuid ?? null,
    facilities,
    attributeTypeUuidByField,
    existingAttributeUuidByField,
  };
}

/**
 * Loads the signed-in doctor's OpenMRS provider record, the provider
 * attribute-type vocabulary, and the facility lookup list, then maps them
 * into the profile module's DoctorProfile form shape — ports
 * profile.component.ts's ngOnInit load (AuthService.getProvider +
 * ProviderService.getProviderAttributeTypes/getLoginLocations) as one
 * query so profile.component.tsx has a single loading/error state.
 */
export function useProviderProfile() {
  const userUuid = useAppSelector(state => state.auth.user?.uuid);

  return useQuery<ProviderProfileData, ApiError>({
    queryKey: ['provider-profile', userUuid],
    enabled: Boolean(userUuid),
    queryFn: async () => {
      if (!userUuid) throw new Error('Not authenticated.');

      const [providerResult, attributeTypesResult, locationsResult] =
        await Promise.all([
          profileService.getProvider(userUuid),
          profileService.getProviderAttributeTypes(),
          profileService.getLoginLocations(),
        ]);

      if (!providerResult.ok) throw providerResult.error;
      if (!attributeTypesResult.ok) throw attributeTypesResult.error;
      if (!locationsResult.ok) throw locationsResult.error;

      return buildProviderProfileData(
        providerResult.data,
        attributeTypesResult.data,
        locationsResult.data
      );
    },
  });
}
