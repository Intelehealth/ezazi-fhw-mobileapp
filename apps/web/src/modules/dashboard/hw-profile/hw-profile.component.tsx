import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, type ChangeEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import editIcon from '../../../assets/svgs/edit.svg';
import { DatePickerComponent } from '../../../components/common/date-picker.component';
import { PhoneNumberFieldComponent } from '../../../components/common/phone-number-field.component';
import { useProviderProfile } from '../../../hooks/queries/useProviderProfile';
import type { ProviderProfileData } from '../../../hooks/queries/useProviderProfile';
import { useUpdateProviderProfile } from '../../../hooks/mutations/useUpdateProviderProfile';
import { useUpdateProfileImage } from '../../../hooks/mutations/useUpdateProfileImage';
import { useValidateProviderAttribute } from '../../../hooks/mutations/useValidateProviderAttribute';
import {
  GENDER_LABELS,
  LABEL_CLASS,
  ProfileInfoRow,
  ProfilePhotoCard,
  SelectField,
  TextField,
  computeAge,
  fullName,
} from '../profile/profile-fields';
import { WARD_OPTIONS } from '../profile/profile.static-options';
import type { Gender } from '../profile/profile.types';
import {
  hwProfileSchema,
  type HwProfileFormValues,
} from './hw-profile.validation';

/** hw-profile.component.ts's `provider_ward` control defaults to 'Labor Ward'. */
const DEFAULT_WARD = 'Labor Ward';

function toFormValues(data: ProviderProfileData): HwProfileFormValues {
  const { profile } = data;
  return {
    givenName: profile.givenName,
    middleName: profile.middleName,
    familyName: profile.familyName,
    gender: profile.gender,
    birthdate: profile.birthdate,
    phoneNumber: profile.phoneNumber,
    whatsapp: profile.whatsapp,
    emailId: profile.emailId,
    facilityName: profile.facilityName,
    providerWard: profile.providerWard || DEFAULT_WARD,
  };
}

/**
 * Ports hw-profile.component.html (intelehealth-doctor-webapp) — the profile
 * screen nurses (health workers) get instead of the doctor's
 * ProfileComponent. Same photo card and view/edit layout, but only the
 * person + contact + facility/ward fields: no State, qualification,
 * specialization, registration number or signature. Reuses the doctor
 * profile's data hooks and form primitives (see profile/profile-fields.tsx);
 * saving leaves the doctor-only attributes untouched.
 */
export function HwProfileComponent() {
  const query = useProviderProfile();

  if (query.isPending) {
    return <HwProfileStatusCard message="Loading profile…" />;
  }

  if (query.isError) {
    return <HwProfileStatusCard message={query.error.message} isError />;
  }

  return <HwProfileEditor data={query.data} />;
}

function HwProfileStatusCard({
  message,
  isError,
}: {
  message: string;
  isError?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div
        className={`rounded-xl bg-white p-10 text-center shadow-[0px_4px_24px_rgba(31,28,58,0.08)] md:col-span-4 ${isError ? 'text-red-600' : 'text-[#7F7B92]'}`}
      >
        {message}
      </div>
    </div>
  );
}

function HwProfileEditor({ data }: { data: ProviderProfileData }) {
  const [editMode, setEditMode] = useState(false);
  const updateProfile = useUpdateProviderProfile();
  const updatePhoto = useUpdateProfileImage();
  const validateAttribute = useValidateProviderAttribute();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<HwProfileFormValues>({
    resolver: zodResolver(hwProfileSchema),
    mode: 'onChange',
    defaultValues: toFormValues(data),
  });

  // See profile.component.tsx: async "already exists" results live outside
  // RHF's schema-driven errors, which would otherwise clear them.
  const [emailTaken, setEmailTaken] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);

  const birthdate = watch('birthdate');
  const age = useMemo(() => computeAge(birthdate), [birthdate]);
  const now = new Date();
  const maxBirthdate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const facilityOptions = useMemo(
    () => data.facilities.map(facility => facility.display),
    [data.facilities]
  );
  const profile = toFormValues(data);

  function openEdit() {
    reset(toFormValues(data));
    setEditMode(true);
  }

  function handleSave(values: HwProfileFormValues) {
    updateProfile.mutate(
      {
        values,
        providerUuid: data.providerUuid,
        personUuid: data.personUuid,
        preferredNameUuid: data.preferredNameUuid,
        attributeTypeUuidByField: data.attributeTypeUuidByField,
        existingAttributeUuidByField: data.existingAttributeUuidByField,
      },
      { onSuccess: () => setEditMode(false) }
    );
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) updatePhoto.mutate({ personUuid: data.personUuid, file });
  }

  async function checkAttributeAvailable(
    field: 'emailId' | 'phoneNumber',
    rawValue: string
  ) {
    const value = rawValue.trim();
    if (!value) return;

    const isAvailable = await validateAttribute.mutateAsync({
      attributeType: field,
      attributeValue: value,
      providerUuid: data.providerUuid,
    });

    const setTaken = field === 'emailId' ? setEmailTaken : setPhoneTaken;
    setTaken(!isAvailable);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <ProfilePhotoCard
        photoUrl={data.profile.photoUrl}
        name={fullName(data.profile)}
        onPhotoChange={handlePhotoChange}
        uploading={updatePhoto.isPending}
      />

      <div className="rounded-xl bg-white p-6 shadow-[0px_4px_24px_rgba(31,28,58,0.08)] md:col-span-3">
        {!editMode ? (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openEdit}
                aria-label="Edit profile"
                className="cursor-pointer"
              >
                <img src={editIcon} alt="" className="w-5" />
              </button>
            </div>

            <ul className="list-none p-0">
              <ProfileInfoRow
                label="Gender"
                value={GENDER_LABELS[profile.gender]}
              />
              <ProfileInfoRow label="Mobile No." value={profile.phoneNumber} />
              <ProfileInfoRow label="WhatsApp No." value={profile.whatsapp} />
              <ProfileInfoRow label="Email" value={profile.emailId} />
              <ProfileInfoRow
                label="Facility Name"
                value={profile.facilityName}
              />
              <ProfileInfoRow label="Ward" value={profile.providerWard} />
            </ul>
          </>
        ) : (
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
            onSubmit={handleSubmit(handleSave)}
          >
            <TextField
              label="First name *"
              placeholder="Enter first name"
              registration={register('givenName')}
              error={isSubmitted ? errors.givenName?.message : undefined}
            />
            <TextField
              label="Middle name *"
              placeholder="Enter middle name"
              registration={register('middleName')}
              error={isSubmitted ? errors.middleName?.message : undefined}
            />
            <TextField
              label="Last name *"
              placeholder="Enter last name"
              registration={register('familyName')}
              error={isSubmitted ? errors.familyName?.message : undefined}
            />

            <div>
              <label className={LABEL_CLASS}>Gender *</label>
              <div className="flex h-12 items-center gap-4">
                {(Object.keys(GENDER_LABELS) as Gender[]).map(value => (
                  <label
                    key={value}
                    className="flex items-center gap-1 text-sm text-[#1B163A]"
                  >
                    <input type="radio" value={value} {...register('gender')} />
                    {GENDER_LABELS[value]}
                  </label>
                ))}
              </div>
              {isSubmitted && errors.gender && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.gender.message}
                </p>
              )}
            </div>
            <Controller
              name="birthdate"
              control={control}
              render={({ field }) => (
                <DatePickerComponent
                  id="birthdate"
                  label="Date of birth *"
                  value={field.value}
                  max={maxBirthdate}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={isSubmitted ? errors.birthdate?.message : undefined}
                />
              )}
            />
            <TextField label="Age *" value={age} disabled readOnly />

            <Controller
              name="phoneNumber"
              control={control}
              render={({ field }) => (
                <PhoneNumberFieldComponent
                  id="phoneNumber"
                  label="Phone Number *"
                  value={field.value}
                  onChange={value => {
                    field.onChange(value);
                    setPhoneTaken(false);
                  }}
                  onBlur={() => {
                    field.onBlur();
                    void checkAttributeAvailable('phoneNumber', field.value);
                  }}
                  error={
                    (isSubmitted ? errors.phoneNumber?.message : undefined) ??
                    (phoneTaken
                      ? 'Phone number already exists. Please enter another phone number.'
                      : undefined)
                  }
                />
              )}
            />
            <Controller
              name="whatsapp"
              control={control}
              render={({ field }) => (
                <PhoneNumberFieldComponent
                  id="whatsapp"
                  label="WhatsApp Number *"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={isSubmitted ? errors.whatsapp?.message : undefined}
                />
              )}
            />
            <TextField
              type="email"
              label="Email ID *"
              placeholder="Enter email"
              registration={register('emailId', {
                onBlur: event =>
                  checkAttributeAvailable('emailId', event.target.value),
                onChange: () => setEmailTaken(false),
              })}
              error={
                (isSubmitted ? errors.emailId?.message : undefined) ??
                (emailTaken
                  ? 'Email already exists. Please enter another email.'
                  : undefined)
              }
            />

            <SelectField
              label="Facility Name *"
              options={facilityOptions}
              registration={register('facilityName')}
              error={isSubmitted ? errors.facilityName?.message : undefined}
            />
            <SelectField
              label="Ward *"
              options={WARD_OPTIONS}
              registration={register('providerWard')}
              error={isSubmitted ? errors.providerWard?.message : undefined}
            />

            <div className="flex items-end justify-end md:col-span-3">
              <button
                type="submit"
                disabled={updateProfile.isPending || emailTaken || phoneTaken}
                className="h-14 min-w-[206px] cursor-pointer rounded-lg bg-[#2E1E91] px-6 text-lg text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateProfile.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
