import type { UseFormRegisterReturn } from 'react-hook-form';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import emailIcon from '../../assets/svgs/email.svg';
import {
  COUNTRY_DROPDOWN_STYLE,
  COUNTRY_SELECTOR_ARROW_STYLE,
  COUNTRY_SELECTOR_BUTTON_STYLE,
  DIAL_CODE_PREVIEW_ARROW_CLASS,
  DIAL_CODE_PREVIEW_STYLE,
  forwardClickToCountrySelector,
  PHONE_INPUT_CONTAINER_STYLE,
  PHONE_INPUT_FIELD_STYLE,
} from '../common/phone-input-style';
import { TabSwitcherComponent } from './tab-switcher.component';

export type ContactMethod = 'phone' | 'email';

interface ContactTabsComponentProps {
  active: ContactMethod;
  onActiveChange: (method: ContactMethod) => void;
  phoneValue: string;
  /** `dialCode` (e.g. "91", no "+") is the selected country's — callers that
   * need to build a real requestOtp/verifyOtp payload split `value` into
   * `phoneNumber` + `countryCode` with it (see utils/split-phone-number.ts);
   * callers that don't need the real payload (forgot-username) can ignore it. */
  onPhoneChange: (value: string, dialCode: string) => void;
  onPhoneBlur?: () => void;
  phoneError?: string;
  emailRegistration: UseFormRegisterReturn;
  emailError?: string;
}

const TABS = [
  { id: 'phone', label: 'Mobile number' },
  { id: 'email', label: 'Email ID' },
];

/**
 * Tab switcher + the active tab's phone/email field, bundled together
 * because forgot-username.component.html and verification-method.component.html
 * repeat this exact block verbatim (same tabs, same phone-field/email-id-field
 * markup) — extracted once so neither screen rebuilds it.
 *
 * The phone tab uses react-international-phone's <PhoneInput> (flag + dial-code
 * selector, defaulting to India per Angular's `initialCountry: 'in'`) instead
 * of a decorative icon button — Angular's ng2TelInput is a real country-aware
 * widget too (see forgot-username.component.ts's `ng2TelInputOptions`), styled
 * (see PHONE_INPUT_CONTAINER_STYLE above) as two separate boxes matching the
 * production site's actual look. The email tab keeps its plain input +
 * decorative icon button, which the Angular source's email-id-field really
 * is (`type="button"` with no click handler, `cursor: default` in its .scss).
 *
 * Phone value is a controlled string in E.164 format (e.g. "+918876543210",
 * dial code included) rather than Angular's separate `phone`/`countryCode`
 * form fields — see forgot-username.validation.ts.
 */
export function ContactTabsComponent({
  active,
  onActiveChange,
  phoneValue,
  onPhoneChange,
  onPhoneBlur,
  phoneError,
  emailRegistration,
  emailError,
}: ContactTabsComponentProps) {
  return (
    <div>
      <TabSwitcherComponent
        tabs={TABS}
        active={active}
        onChange={id => onActiveChange(id as ContactMethod)}
      />
      <div className="mt-5">
        {active === 'phone' ? (
          <div className="mb-4">
            <label
              className="mb-1 block text-sm font-bold text-[#2E1E91]"
              htmlFor="phone"
            >
              Mobile number
            </label>
            <div onClick={forwardClickToCountrySelector}>
              <PhoneInput
                defaultCountry="in"
                disableDialCodeAndPrefix
                showDisabledDialCodeAndPrefix
                value={phoneValue}
                onChange={(value, meta) =>
                  onPhoneChange(value, meta.country.dialCode)
                }
                onBlur={onPhoneBlur}
                inputProps={{ id: 'phone', placeholder: 'Enter Mobile Number' }}
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
            {phoneError && (
              <p className="mt-1 text-xs text-red-600">{phoneError}</p>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <label
              className="mb-1 block text-sm font-bold text-[#2E1E91]"
              htmlFor="email"
            >
              Email ID
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                placeholder="Enter Email ID"
                className="h-12 w-full rounded-lg border border-[rgba(178,175,190,0.2)] bg-white px-4 text-base text-[#1B163A]"
                {...emailRegistration}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute bottom-1.5 right-0.5 cursor-default rounded bg-white p-1"
              >
                <img src={emailIcon} alt="" />
              </button>
            </div>
            {emailError && (
              <p className="mt-1 text-xs text-red-600">{emailError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
