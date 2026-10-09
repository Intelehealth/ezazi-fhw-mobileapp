import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  ContactTabsComponent,
  type ContactMethod,
} from '../../../components/auth/contact-tabs.component';
import { NextButtonComponent } from '../../../components/auth/next-button.component';
import { useRequestOtp } from '../../../hooks/mutations/useRequestOtp';
import { ROUTES } from '../../../routes/paths';
import { splitE164Phone } from '../../../utils/split-phone-number';
import {
  emailContactSchema,
  phoneContactSchema,
  type EmailContactFormValues,
  type PhoneContactFormValues,
} from './forgot-username.validation';

const OTP_VERIFICATION_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.OTP_VERIFICATION}`;
const DEFAULT_DIAL_CODE = '91'; // matches ContactTabsComponent's PhoneInput defaultCountry="in"

/**
 * Screen 1 (forgot-username.component.html/.ts) — POST /auth/requestOtp with
 * `otpFor: 'username'` (auth-gateway now supports this: phone-or-email
 * lookup, OTP sent on whichever channel was submitted — see otp/README.md
 * on the backend). Structurally identical to screen 3 (verification-method):
 * same ContactTabsComponent, same phone/email schemas, same dial-code
 * tracking for splitting the phone field's E.164 value into
 * phoneNumber/countryCode.
 *
 * Two independent useForm instances (one per tab) rather than one shared
 * FormGroup with swapped validators (Angular's `reset()`) — switching tabs
 * resets both, matching the Angular form being blanked on every tab change.
 */
export function ForgotUsernameComponent() {
  const navigate = useNavigate();
  const { mutate: requestOtp, isPending } = useRequestOtp();
  const [active, setActive] = useState<ContactMethod>('phone');
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);

  const phoneForm = useForm<PhoneContactFormValues>({
    resolver: zodResolver(phoneContactSchema),
    mode: 'onChange',
    defaultValues: { phone: '' },
  });
  const emailForm = useForm<EmailContactFormValues>({
    resolver: zodResolver(emailContactSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });
  const activeForm = active === 'phone' ? phoneForm : emailForm;

  function handleActiveChange(method: ContactMethod) {
    phoneForm.reset();
    emailForm.reset();
    setActive(method);
  }

  function onSubmit() {
    if (active === 'phone') {
      const phoneNumber = splitE164Phone(phoneForm.getValues('phone'), dialCode);
      requestOtp(
        { otpFor: 'username', phoneNumber, countryCode: dialCode },
        {
          onSuccess: () =>
            navigate(OTP_VERIFICATION_PATH, {
              state: { verifyFor: 'username', phoneNumber, countryCode: dialCode },
            }),
        }
      );
    } else {
      const email = emailForm.getValues('email');
      requestOtp(
        { otpFor: 'username', email },
        {
          onSuccess: () =>
            navigate(OTP_VERIFICATION_PATH, { state: { verifyFor: 'username', email } }),
        }
      );
    }
  }

  return (
    <form className="w-full" onSubmit={activeForm.handleSubmit(onSubmit)}>
      <h1 className="mb-2 text-[32px] leading-[150%] font-bold text-[#2E1E91]">
        Forgot Username
      </h1>
      <p className="mb-4 text-base leading-[150%] text-[#7F7B92]">
        No worries, enter your Mobile number or Email ID and we will send you
        the OTP to retrive your username.
      </p>

      <Controller
        name="phone"
        control={phoneForm.control}
        render={({ field: { value, onChange, onBlur } }) => (
          <ContactTabsComponent
            active={active}
            onActiveChange={handleActiveChange}
            phoneValue={value}
            onPhoneChange={(nextValue, nextDialCode) => {
              onChange(nextValue);
              setDialCode(nextDialCode);
            }}
            onPhoneBlur={onBlur}
            phoneError={
              phoneForm.formState.isSubmitted
                ? phoneForm.formState.errors.phone?.message
                : undefined
            }
            emailRegistration={emailForm.register('email')}
            emailError={
              emailForm.formState.isSubmitted
                ? emailForm.formState.errors.email?.message
                : undefined
            }
          />
        )}
      />

      <div className="mt-5">
        <NextButtonComponent
          isValid={activeForm.formState.isValid}
          isLoading={isPending}
        />
      </div>
    </form>
  );
}
