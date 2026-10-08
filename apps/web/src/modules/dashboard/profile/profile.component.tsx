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
  QUALIFICATION_OPTIONS,
  SPECIALIZATION_OPTIONS,
  WARD_OPTIONS,
} from './profile.static-options';
import {
  GENDER_LABELS,
  LABEL_CLASS,
  ProfileInfoRow,
  ProfilePhotoCard,
  SelectField,
  TextField,
  computeAge,
  fullName,
} from './profile-fields';
import { SignatureFontSelect } from './signature-font-select.component';
import { profileSchema, type ProfileFormValues } from './profile.validation';
import type { Gender } from './profile.types';

/**
 * Ports profile.component.html (intelehealth-doctor-webapp) 1:1: a photo
 * card, then a view-mode label/value list (Gender…Signature, same order) or
 * an edit-mode form behind the pencil icon, matching `personalInfoForm`'s
 * field set and required-field validation (see profile.validation.ts).
 *
 * Real API integration (see hooks/queries/useProviderProfile.ts and
 * hooks/mutations/use{UpdateProviderProfile,UpdateProfileImage,
 * ValidateProviderAttribute}.ts): loads the signed-in doctor's OpenMRS
 * provider record, saves person/name/attribute changes the same way the
 * Angular source does (parallel provider-attribute POSTs, not one combined
 * "profile" endpoint — OpenMRS has no such endpoint), and uploads a new
 * photo as base64. One deliberate simplification versus the Angular
 * source: qualification/specialization/ward stay hardcoded option lists
 * (profile.static-options.ts) because the reference app hardcodes them too — only
 * Facility Name is genuinely API-backed there (GET /location), and this
 * port fetches it the same way.
 */
export function ProfileComponent() {
  const query = useProviderProfile();

  if (query.isPending) {
    return <ProfileStatusCard message="Loading profile…" />;
  }

  if (query.isError) {
    return <ProfileStatusCard message={query.error.message} isError />;
  }

  return <ProfileEditor data={query.data} />;
}

function ProfileStatusCard({
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

function ProfileEditor({ data }: { data: ProviderProfileData }) {
  const [editMode, setEditMode] = useState(false);
  const updateProfile = useUpdateProviderProfile();
  const updatePhoto = useUpdateProfileImage();
  const validateAttribute = useValidateProviderAttribute();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: data.profile,
  });

  // Separate from RHF's own `errors` state on purpose: the zod resolver
  // re-validates emailId/phoneNumber on every change/blur and would
  // immediately clear a `setError()` call for this async, schema-external
  // check (RHF's next validation pass has no way to know about it) —
  // see ProviderAttributeValidator's Angular equivalent, an async
  // validator wired into the FormControl itself instead of the schema.
  const [emailTaken, setEmailTaken] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);

  const qualification = watch('qualification');
  const fontOfSign = watch('fontOfSign');
  const textOfSign = watch('textOfSign');
  const birthdate = watch('birthdate');
  const age = useMemo(() => computeAge(birthdate), [birthdate]);
  // Matches profile.component.html's `[max]="today"` on its mat-datepicker —
  // the doctor can't pick a future DOB (which would otherwise compute a
  // negative age below).
  const now = new Date();
  const maxBirthdate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const facilityOptions = useMemo(
    () => data.facilities.map(facility => facility.display),
    [data.facilities]
  );

  function openEdit() {
    reset(data.profile);
    setEditMode(true);
  }

  function handleSave(values: ProfileFormValues) {
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

  /**
   * Ports ProviderAttributeValidator/AuthService.validateProviderAttribute —
   * checked on blur rather than Angular's debounced valueChanges stream,
   * since this field only needs a one-shot check, not a live one. Takes the
   * raw value directly (not a blur event) since PhoneNumberFieldComponent's
   * onBlur — used for the phoneNumber case — hands back neither.
   */
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
        name={`Dr. ${fullName(data.profile)}`}
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
                value={GENDER_LABELS[data.profile.gender]}
              />
              <ProfileInfoRow label="State" value={data.profile.visitState} />
              <ProfileInfoRow
                label="Mobile No."
                value={data.profile.phoneNumber}
              />
              <ProfileInfoRow
                label="WhatsApp No."
                value={data.profile.whatsapp}
              />
              <ProfileInfoRow label="Email" value={data.profile.emailId} />
              <ProfileInfoRow
                label="Qualification"
                value={
                  data.profile.qualification === 'Other' &&
                  data.profile.otherQualification
                    ? `${data.profile.qualification} (${data.profile.otherQualification})`
                    : data.profile.qualification
                }
              />
              <ProfileInfoRow
                label="Specialization"
                value={data.profile.specialization}
              />
              <ProfileInfoRow
                label="Registration No."
                value={data.profile.registrationNumber}
              />
              <ProfileInfoRow
                label="Facility Name"
                value={data.profile.facilityName}
              />
              <ProfileInfoRow label="Ward" value={data.profile.providerWard} />
              <li className="mt-2 flex items-center gap-4 rounded-md bg-[rgba(215,212,234,0.4)] px-4 py-3">
                <span className="w-2/5 shrink-0 text-base text-[#7F7B92]">
                  Signature
                </span>
                <span
                  style={{ fontFamily: data.profile.fontOfSign }}
                  className="text-[28px] leading-none text-[#1B163A]"
                >
                  {data.profile.textOfSign || 'NA'}
                </span>
              </li>
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
              {/*
               * The radio group always holds a valid code (see toGender), so
               * the schema's gender error can't surface from this form — kept
               * for parity with the Angular template's own error block.
               */}
              {/* v8 ignore next 5 -- @preserve */}
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

            <TextField
              label="State"
              placeholder="Enter state"
              registration={register('visitState')}
              error={isSubmitted ? errors.visitState?.message : undefined}
            />
            <SelectField
              label="Qualification *"
              options={QUALIFICATION_OPTIONS}
              registration={register('qualification')}
              error={isSubmitted ? errors.qualification?.message : undefined}
            />
            {qualification === 'Other' && (
              <TextField
                label="Other Qualification *"
                placeholder="Enter other qualification"
                registration={register('otherQualification')}
                error={
                  isSubmitted ? errors.otherQualification?.message : undefined
                }
              />
            )}
            <SelectField
              label="Specialization *"
              options={SPECIALIZATION_OPTIONS}
              registration={register('specialization')}
              error={isSubmitted ? errors.specialization?.message : undefined}
            />

            <TextField
              label="Registration Number *"
              placeholder="Enter registration number"
              registration={register('registrationNumber')}
              error={
                isSubmitted ? errors.registrationNumber?.message : undefined
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

            <div className="md:col-span-3">
              <h6 className="text-lg font-bold text-[#2E1E91]">
                Edit signature
              </h6>
            </div>
            <div className="grid grid-cols-1 gap-4 md:col-span-3 md:grid-cols-2">
              <TextField
                label="Signature letters *"
                placeholder="Enter signature letters"
                registration={register('textOfSign')}
                error={isSubmitted ? errors.textOfSign?.message : undefined}
              />
              <SignatureFontSelect
                value={fontOfSign}
                onChange={name =>
                  setValue('fontOfSign', name, { shouldValidate: true })
                }
                previewText={textOfSign}
                error={isSubmitted ? errors.fontOfSign?.message : undefined}
              />
            </div>

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
