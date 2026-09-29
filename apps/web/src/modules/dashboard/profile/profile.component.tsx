import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import cameraIcon from '../../../assets/svgs/camera.svg';
import chevronIcon from '../../../assets/svgs/chevron-down.svg';
import editIcon from '../../../assets/svgs/edit.svg';
import userIcon from '../../../assets/svgs/user.svg';
import profileBg from '../../../assets/images/profile-bg.png';
import {
  FACILITY_OPTIONS,
  MOCK_DOCTOR_PROFILE,
  QUALIFICATION_OPTIONS,
  SPECIALIZATION_OPTIONS,
  WARD_OPTIONS,
} from './profile.mock-data';
import { SignatureFontSelect } from './signature-font-select.component';
import { profileSchema, type ProfileFormValues } from './profile.validation';
import type { Gender } from './profile.types';

const GENDER_LABELS: Record<Gender, string> = {
  M: 'Male',
  F: 'Female',
  U: 'Other',
};

const INPUT_CLASS =
  'h-12 w-full rounded-lg border border-[rgba(178,175,190,0.2)] bg-[#FAF9FF] px-4 text-base text-[#1B163A]';
const LABEL_CLASS = 'mb-1 block text-sm font-bold text-[#1B163A]';

function fullName(profile: { givenName: string; familyName: string }) {
  return [profile.givenName, profile.familyName].filter(Boolean).join(' ');
}

/**
 * Ports profile.component.html (intelehealth-doctor-webapp) 1:1: a photo
 * card, then a view-mode label/value list (Gender…Signature, same order) or
 * an edit-mode form behind the pencil icon, matching `personalInfoForm`'s
 * field set and required-field validation (see profile.validation.ts).
 *
 * One deliberate simplification versus the Angular source: qualification/
 * specialization/facility/ward are plain text inputs here rather than
 * ng-select dropdowns (those load their options from lookups this app
 * doesn't fetch yet). The signature-font picker (see
 * signature-font-select.component.tsx) is ported using the same four font
 * files as the reference app. Data is static (profile.mock-data.ts) until
 * a profile endpoint lands in the shared api-client package, the same
 * "build the UI ahead of the backend" pattern dashboard.component.tsx
 * already uses for visit rows.
 */
export function ProfileComponent() {
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState(MOCK_DOCTOR_PROFILE);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: profile,
  });

  const qualification = watch('qualification');
  const fontOfSign = watch('fontOfSign');
  const textOfSign = watch('textOfSign');
  const age = useMemo(() => computeAge(profile.birthdate), [profile.birthdate]);

  function openEdit() {
    reset(profile);
    setEditMode(true);
  }

  function handleSave(values: ProfileFormValues) {
    // TODO: call profileApi.updateProfile(values) once the profile endpoint exists.
    setProfile(prev => ({ ...prev, ...values }));
    setEditMode(false);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {/* user-profile-con-2 (profile.component.scss): the doctor-themed
          stethoscope photo fills the whole card; a white box covering its
          left half — profile-pic-con — holds the avatar/camera/name, so
          the background shows through on the right half. */}
      <div
        className="relative h-[192px] w-full self-start overflow-hidden rounded-xl bg-cover bg-center shadow-[0px_4px_24px_rgba(31,28,58,0.08)]"
        style={{ backgroundImage: `url(${profileBg})` }}
      >
        <div className="flex h-full w-1/2 flex-col items-center justify-center gap-3 rounded-xl bg-white px-2 py-4">
          <div className="relative">
            <img
              src={profile.photoUrl ?? userIcon}
              onError={e => {
                e.currentTarget.src = userIcon;
              }}
              alt=""
              className="h-20 w-20 rounded-full border border-[rgba(178,175,190,0.2)] object-cover"
            />
            <label className="absolute right-0 bottom-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[rgba(178,175,190,0.2)] bg-white">
              <img src={cameraIcon} alt="" className="w-3.5" />
              {/* Photo upload itself is out of scope here — this input has no
                  onChange handler yet, matching how dashboard.component.tsx's
                  search box and bell are visual-only for the same reason. */}
              <input
                id="profile-pic"
                type="file"
                accept="image/jpg"
                className="hidden"
              />
            </label>
          </div>
          <h6 className="text-center text-base font-bold text-[#1B163A]">
            Dr. {fullName(profile)}
          </h6>
        </div>
      </div>

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
              <ProfileInfoRow label="State" value={profile.visitState} />
              <ProfileInfoRow label="Mobile No." value={profile.phoneNumber} />
              <ProfileInfoRow label="WhatsApp No." value={profile.whatsapp} />
              <ProfileInfoRow label="Email" value={profile.emailId} />
              <ProfileInfoRow
                label="Qualification"
                value={
                  profile.qualification === 'Other' &&
                  profile.otherQualification
                    ? `${profile.qualification} (${profile.otherQualification})`
                    : profile.qualification
                }
              />
              <ProfileInfoRow
                label="Specialization"
                value={profile.specialization}
              />
              <ProfileInfoRow
                label="Registration No."
                value={profile.registrationNumber}
              />
              <ProfileInfoRow
                label="Facility Name"
                value={profile.facilityName}
              />
              <ProfileInfoRow label="Ward" value={profile.providerWard} />
              <li className="mt-2 flex items-center gap-4 rounded-md bg-[rgba(215,212,234,0.4)] px-4 py-3">
                <span className="w-2/5 shrink-0 text-base text-[#7F7B92]">
                  Signature
                </span>
                <span
                  style={{ fontFamily: profile.fontOfSign }}
                  className="text-[28px] leading-none text-[#1B163A]"
                >
                  {profile.textOfSign || 'NA'}
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
              {isSubmitted && errors.gender && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.gender.message}
                </p>
              )}
            </div>
            <TextField
              type="date"
              label="Date of birth *"
              registration={register('birthdate')}
              error={isSubmitted ? errors.birthdate?.message : undefined}
            />
            <TextField label="Age *" value={age} disabled readOnly />

            <TextField
              label="Phone Number *"
              placeholder="Enter Mobile Number"
              registration={register('phoneNumber')}
              error={isSubmitted ? errors.phoneNumber?.message : undefined}
            />
            <TextField
              label="WhatsApp Number *"
              placeholder="Enter Mobile Number"
              registration={register('whatsapp')}
              error={isSubmitted ? errors.whatsapp?.message : undefined}
            />
            <TextField
              type="email"
              label="Email ID *"
              placeholder="Enter email"
              registration={register('emailId')}
              error={isSubmitted ? errors.emailId?.message : undefined}
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
              options={FACILITY_OPTIONS}
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
                className="h-14 min-w-[206px] rounded-lg bg-[#2E1E91] px-6 text-lg text-white"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ProfileInfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <li className="flex gap-4 border-b border-[rgba(178,175,190,0.2)] py-3 last:border-b-0">
      <span className="w-2/5 shrink-0 text-base text-[#7F7B92]">{label}</span>
      <span className="text-base text-[#1B163A]">
        {value?.trim() ? value : 'NA'}
      </span>
    </li>
  );
}

interface TextFieldProps {
  label: string;
  placeholder?: string;
  type?: string;
  error?: string;
  registration?: UseFormRegisterReturn;
  value?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

function TextField({
  label,
  placeholder,
  type = 'text',
  error,
  registration,
  value,
  disabled,
  readOnly,
}: TextFieldProps) {
  // registration.name (e.g. "textOfSign") doubles as the input id so the
  // label is programmatically associated with it — without this, clicking
  // a field's label doesn't focus the input and screen readers can't pair
  // them (getByLabelText-style lookups also fail).
  const id = registration?.name ?? label.replace(/[^A-Za-z0-9]+/g, '-');

  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        className={INPUT_CLASS}
        {...registration}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  options: string[];
  error?: string;
  registration: UseFormRegisterReturn;
}

/**
 * Ports the ng-select dropdowns for Qualification/Specialization/Facility
 * Name/Ward (profile.component.html) — a native `<select>` styled to match
 * TextField, since none of these need ng-select's per-option custom
 * rendering (that's only the signature-font picker's job). Options come
 * from profile.mock-data.ts, standing in for the Angular source's hardcoded
 * professions/specializations/wards arrays (facilities is the one genuinely
 * API-backed list there — mocked here the same way).
 */
function SelectField({
  label,
  options,
  error,
  registration,
}: SelectFieldProps) {
  const id = registration.name;

  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className={`${INPUT_CLASS} appearance-none pr-10`}
          {...registration}
        >
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {/* chevron-down.svg is drawn pointing right (›) — rotated 90deg here
            too, same as SignatureFontSelect's trigger and dashboard.component.tsx's
            show/hide-all toggle. */}
        <img
          src={chevronIcon}
          alt=""
          className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 rotate-90"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Whole years between `birthdate` (YYYY-MM-DD) and today — mirrors profile.component.ts's readonly `age` field, computed on the fly instead of stored. */
function computeAge(birthdate: string): string {
  if (!birthdate) return '';
  const dob = new Date(birthdate);
  if (Number.isNaN(dob.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  return String(age);
}
