import type { UseFormRegisterReturn } from 'react-hook-form';
import mobileIcon from '../../assets/svgs/mobile.svg';
import emailIcon from '../../assets/svgs/email.svg';
import { TabSwitcherComponent } from './tab-switcher.component';

export type ContactMethod = 'phone' | 'email';

interface ContactTabsComponentProps {
  active: ContactMethod;
  onActiveChange: (method: ContactMethod) => void;
  phoneRegistration: UseFormRegisterReturn;
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
 * markup with a decorative icon button) — extracted once so neither screen
 * rebuilds it. The icon button is decorative only in the Angular source too
 * (a `type="button"` with no click handler, `cursor: default` in its .scss).
 *
 * Phone validation here is a digit-length approximation, not a real
 * intl-tel-input port (see forgot-username.validation.ts) — this field is a
 * plain text input, not the ng2TelInput country-aware widget.
 */
export function ContactTabsComponent({
  active,
  onActiveChange,
  phoneRegistration,
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
            <div className="relative">
              <input
                id="phone"
                placeholder="Enter Mobile Number"
                className="h-12 w-full rounded-lg border border-[rgba(178,175,190,0.2)] bg-white px-4 text-base text-[#1B163A]"
                {...phoneRegistration}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute bottom-1.5 right-0.5 cursor-default rounded bg-white p-1"
              >
                <img src={mobileIcon} alt="" />
              </button>
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
