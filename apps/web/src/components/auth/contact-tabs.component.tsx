import type { CSSProperties, MouseEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import emailIcon from '../../assets/svgs/email.svg';
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
 * Design-token overrides for react-international-phone — matching the
 * production eZAZI site's actual rendered mobile-number field: box 1 is the
 * flag + dial code (e.g. "🇮🇳 +91 ▾"), box 2 holds ONLY the number typed, no
 * dial code inside its editable text. `disableDialCodeAndPrefix` (below, on
 * <PhoneInput>) is what moves the dial code out of the number input; the
 * flag button and the resulting dial-code-preview chip are then two
 * DIFFERENT elements the library renders side by side — flattening the
 * corners where they touch and letting the library's own `-1px` collapsing
 * margin join them into what reads as one box (box 1), while the preview
 * chip's *outer* edge stays rounded and gets a real margin before the
 * number input (box 2), which gets its own full border radius back since
 * it's no longer the library's default "joined to whatever's on its left"
 * assumption.
 */
const PHONE_INPUT_CONTAINER_STYLE = {
  '--react-international-phone-height': '48px',
  '--react-international-phone-border-radius': '8px',
  '--react-international-phone-border-color': 'rgba(178,175,190,0.2)',
  '--react-international-phone-background-color': '#FFFFFF',
  '--react-international-phone-text-color': '#1B163A',
  '--react-international-phone-font-size': '16px',
  width: '100%',
} as CSSProperties;

// Box 2 (the number-only input) — full rounded corners, since it's now a
// standalone box rather than sitting flush against the dial-code preview.
const PHONE_INPUT_FIELD_STYLE = {
  borderRadius: '8px',
  flex: 1,
} as CSSProperties;

// Box 1's left half (the flag button) — rounded left corners and flat right
// ones come from the library's own defaults (fine as-is); `borderRightWidth:
// 0` on top of that drops the seam that'd otherwise show where it meets the
// dial-code preview (both pieces have their own border, so even flush with
// no gap, TWO 1px edges were stacking into one visible line).
const COUNTRY_SELECTOR_BUTTON_STYLE = { borderRightWidth: 0 } as CSSProperties;

// The button's own built-in arrow sits right after the flag (before the dial
// code) — hidden here in favor of the `after:` pseudo-element on the preview
// below, which places a matching arrow after the code instead.
const COUNTRY_SELECTOR_ARROW_STYLE = { display: 'none' } as CSSProperties;

// Box 1's right half (the "+91" dial-code preview) — `borderLeftWidth: 0`
// is the other half of removing that middle seam (see button, above); flat
// on the left to sit flush against the button, rounded on the right to
// close off box 1, with a real gap before box 2 in place of the library's
// default `-1px` collapse into the input. The `after:` classes redraw the
// library's own arrow triangle (see its .dropdown-arrow CSS) after the dial
// code text instead of after the flag, using this app's muted-text token.
const DIAL_CODE_PREVIEW_STYLE = {
  borderTopLeftRadius: 0,
  borderBottomLeftRadius: 0,
  borderTopRightRadius: '8px',
  borderBottomRightRadius: '8px',
  borderLeftWidth: 0,
  marginRight: '10px',
  cursor: 'pointer',
} as CSSProperties;
const DIAL_CODE_PREVIEW_ARROW_CLASS =
  "after:content-[''] after:inline-block after:ml-1.5 after:border-x-4 after:border-x-transparent after:border-t-4 after:border-t-[#7F7B92]";

const COUNTRY_DROPDOWN_STYLE = { borderRadius: '8px' } as CSSProperties;

const COUNTRY_SELECTOR_BUTTON_SELECTOR =
  '.react-international-phone-country-selector-button';
const PHONE_NUMBER_INPUT_SELECTOR = '.react-international-phone-input';
const COUNTRY_DROPDOWN_SELECTOR =
  '.react-international-phone-country-selector-dropdown';

/**
 * The library only wires its own click-to-open handler onto the flag
 * button — the dial-code preview next to it (see DIAL_CODE_PREVIEW_STYLE
 * above) is plain, non-interactive text, with no onClick prop exposed to
 * add one directly. This delegates a click anywhere else in box 1 (the
 * "+91" text, its arrow, the sliver of box between them) to the real
 * button, so the whole box 1 group opens the picker — not just the flag —
 * while leaving clicks on the button itself (already handled), the number
 * input (box 2), and the open dropdown's own items alone.
 */
function forwardClickToCountrySelector(event: MouseEvent<HTMLDivElement>) {
  const target = event.target as HTMLElement;
  if (
    target.closest(COUNTRY_SELECTOR_BUTTON_SELECTOR) ||
    target.closest(PHONE_NUMBER_INPUT_SELECTOR) ||
    target.closest(COUNTRY_DROPDOWN_SELECTOR)
  ) {
    return;
  }
  event.currentTarget
    .querySelector<HTMLButtonElement>(COUNTRY_SELECTOR_BUTTON_SELECTOR)
    ?.click();
}

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
                onChange={(value, meta) => onPhoneChange(value, meta.country.dialCode)}
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
