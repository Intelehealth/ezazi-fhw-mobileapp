import type { ChangeEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import cameraIcon from '../../../assets/svgs/camera.svg';
import chevronIcon from '../../../assets/svgs/chevron-down.svg';
import userIcon from '../../../assets/svgs/user.svg';
import profileBg from '../../../assets/images/profile-bg.png';
import { calculateAge } from '../../../utils/age';
import type { Gender } from './profile.types';

/**
 * Form/view primitives shared by the doctor profile (profile.component.tsx)
 * and the nurse profile (modules/dashboard/hw-profile) — the Angular app has
 * the same two screens sharing one stylesheet and template idioms.
 */
export const GENDER_LABELS: Record<Gender, string> = {
  M: 'Male',
  F: 'Female',
  U: 'Other',
};

export const INPUT_CLASS =
  'h-12 w-full rounded-lg border border-[rgba(178,175,190,0.2)] bg-[#FAF9FF] px-4 text-base text-[#1B163A]';
export const LABEL_CLASS = 'mb-1 block text-sm font-bold text-[#1B163A]';

export function fullName(profile: { givenName: string; familyName: string }) {
  return [profile.givenName, profile.familyName].filter(Boolean).join(' ');
}

interface ProfilePhotoCardProps {
  photoUrl: string | null;
  name: string;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}

/**
 * user-profile-con-2 (profile.component.scss, shared by profile and
 * hw-profile): the themed photo fills the whole card; a white box covering
 * its left half — profile-pic-con — holds the avatar/camera/name, so the
 * background shows through on the right half.
 */
export function ProfilePhotoCard({
  photoUrl,
  name,
  onPhotoChange,
  uploading,
}: ProfilePhotoCardProps) {
  return (
    <div
      className="relative h-[192px] w-full self-start overflow-hidden rounded-xl bg-cover bg-center shadow-[0px_4px_24px_rgba(31,28,58,0.08)]"
      style={{ backgroundImage: `url(${profileBg})` }}
    >
      <div className="flex h-full w-1/2 flex-col items-center justify-center gap-3 rounded-xl bg-white px-2 py-4">
        <div className="relative">
          <img
            src={photoUrl ?? userIcon}
            onError={e => {
              e.currentTarget.src = userIcon;
            }}
            alt=""
            className="h-20 w-20 rounded-full border border-[rgba(178,175,190,0.2)] object-cover"
          />
          <label className="absolute right-0 bottom-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[rgba(178,175,190,0.2)] bg-white">
            <img src={cameraIcon} alt="" className="w-3.5" />
            <input
              id="profile-pic"
              type="file"
              accept="image/jpg"
              className="hidden"
              onChange={onPhotoChange}
              disabled={uploading}
            />
          </label>
        </div>
        <h6 className="text-center text-base font-bold text-[#1B163A]">
          {name}
        </h6>
      </div>
    </div>
  );
}

export function ProfileInfoRow({
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

export interface TextFieldProps {
  label: string;
  placeholder?: string;
  type?: string;
  error?: string;
  registration?: UseFormRegisterReturn;
  value?: string;
  disabled?: boolean;
  readOnly?: boolean;
  max?: string;
}

export function TextField({
  label,
  placeholder,
  type = 'text',
  error,
  registration,
  value,
  disabled,
  readOnly,
  max,
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
        max={max}
        className={INPUT_CLASS}
        {...registration}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export interface SelectFieldProps {
  label: string;
  options: string[];
  error?: string;
  registration: UseFormRegisterReturn;
}

/**
 * Ports the ng-select dropdowns for Qualification/Specialization/Facility
 * Name/Ward (profile.component.html) — a native `<select>` styled to match
 * TextField, since none of these need ng-select's per-option custom
 * rendering (that's only the signature-font picker's job). Qualification/
 * Specialization/Ward options are hardcoded (profile.static-options.ts, matching
 * the Angular source's own hardcoded arrays); Facility Name's come from
 * useProviderProfile's GET /location call — the one genuinely API-backed
 * list there.
 */
export function SelectField({
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
          className={`${INPUT_CLASS} cursor-pointer appearance-none pr-10`}
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

/** The read-only Age field's text — profile.component.ts's `age`, computed on the fly instead of stored. Empty while the birthdate is blank or invalid. */
export function computeAge(birthdate: string): string {
  const age = calculateAge(birthdate);
  return age === null ? '' : String(age);
}
