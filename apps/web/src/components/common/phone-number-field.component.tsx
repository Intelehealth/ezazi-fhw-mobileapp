import { useState } from 'react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { splitE164Phone } from '../../utils/split-phone-number';
import {
  COUNTRY_DROPDOWN_STYLE,
  COUNTRY_SELECTOR_ARROW_STYLE,
  COUNTRY_SELECTOR_BUTTON_STYLE,
  DIAL_CODE_PREVIEW_ARROW_CLASS,
  DIAL_CODE_PREVIEW_STYLE,
  forwardClickToCountrySelector,
  PHONE_INPUT_CONTAINER_STYLE,
  PHONE_INPUT_FIELD_STYLE,
} from './phone-input-style';

// Matches components/auth/contact-tabs.component.tsx's own default (India,
// per Angular's `initialCountry: 'in'`) — profile.component.ts's own
// initialCountryIso2 is a static per-client constant too (India/Nepal),
// never restored from the loaded provider attribute (see this component's
// own doc comment below), so there's nothing to hydrate here either.
const DEFAULT_COUNTRY = 'in';
const DEFAULT_DIAL_CODE = '91';

interface PhoneNumberFieldProps {
  id: string;
  label: string;
  /** Plain national digits, no dial code — the OpenMRS attribute's actual persisted shape. */
  value: string;
  onChange: (nationalDigits: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
}

/**
 * Ports profile.component.html's `ng2TelInput` phone/whatsapp fields
 * (`separateDialCode: true`) using this app's existing react-international-phone
 * setup (see components/auth/contact-tabs.component.tsx, which this shares
 * styling with via ./phone-input-style). Two things the Angular source does
 * that this deliberately does NOT reproduce:
 *
 * - Its ng2TelInput widget's initial flag comes from a static
 *   `initialCountryIso2` client constant (India/Nepal), never from the
 *   loaded `countryCode` provider attribute — confirmed against
 *   profile.component.ts (that attribute is written from the phone field's
 *   own edits on save, but nothing ever reads it back into the widget on
 *   load). Since it doesn't actually affect what a user sees or can do,
 *   this port skips modeling that attribute at all rather than adding a
 *   field that's write-only in the source too.
 * - Only the plain digits round-trip through the form value (matching the
 *   already-persisted OpenMRS data these fields load real values from
 *   today) — the dial code itself is local-only UI state, reset to
 *   DEFAULT_COUNTRY on every mount rather than carried in DoctorProfile.
 */
export function PhoneNumberFieldComponent({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder = 'Enter Mobile Number',
}: PhoneNumberFieldProps) {
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-bold text-[#1B163A]"
      >
        {label}
      </label>
      <div onClick={forwardClickToCountrySelector}>
        <PhoneInput
          defaultCountry={DEFAULT_COUNTRY}
          disableDialCodeAndPrefix
          // The library's per-country masks (India: ".....-.....") insert a
          // dash mid-number; the persisted value and the Angular source's
          // ng2TelInput show plain digits, so turn masking off.
          disableFormatting
          showDisabledDialCodeAndPrefix
          value={`+${dialCode}${value}`}
          onChange={(fullValue, meta) => {
            setDialCode(meta.country.dialCode);
            onChange(splitE164Phone(fullValue, meta.country.dialCode));
          }}
          onBlur={onBlur}
          inputProps={{ id, placeholder }}
          style={PHONE_INPUT_CONTAINER_STYLE}
          inputStyle={PHONE_INPUT_FIELD_STYLE}
          dialCodePreviewStyleProps={{
            style: DIAL_CODE_PREVIEW_STYLE,
            className: DIAL_CODE_PREVIEW_ARROW_CLASS,
          }}
          countrySelectorStyleProps={{
            buttonStyle: COUNTRY_SELECTOR_BUTTON_STYLE,
            dropdownArrowStyle: COUNTRY_SELECTOR_ARROW_STYLE,
            dropdownStyleProps: { style: COUNTRY_DROPDOWN_STYLE },
          }}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
