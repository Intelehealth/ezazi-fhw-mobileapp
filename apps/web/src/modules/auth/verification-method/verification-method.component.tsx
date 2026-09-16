import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
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
} from '../forgot-username/forgot-username.validation';

const FORGOT_PASSWORD_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.FORGOT_PASSWORD}`;
const OTP_VERIFICATION_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.OTP_VERIFICATION}`;
const DEFAULT_DIAL_CODE = '91'; // matches ContactTabsComponent's PhoneInput defaultCountry="in"

interface VerificationMethodLocationState {
  username?: string;
}

/**
 * Screen 3 (verification-method.component.html/.ts). Structurally identical
 * tab UI to screen 1 (forgot-username) — same ContactTabsComponent and the
 * same phone/email schemas imported straight from forgot-username.validation.ts
 * rather than duplicated here.
 *
 * Entry guard mirrors Angular's `if (!username...) router.navigate(['/session/login'])`
 * pattern, but redirects to /auth/forgot-password instead — that's this
 * rebuild's actual entry point into this flow (screen 2 hands off `username`
 * via route state; see forgot-password.component.tsx).
 *
 * `username` is carried through to screen 4/5 for DISPLAY only (screen 5's
 * profile row) — this screen's own requestOtp call identifies the account
 * by the phone/email the user re-types here, matching auth-gateway's
 * `otpFor: 'password'` fallback lookup (username-first, else phone/email);
 * since this screen already has the user pick a specific channel to type
 * into, `username` is deliberately not also sent here.
 *
 * Both tabs map to real backend actions now — auth-gateway's `otpFor:
 * 'password'` accepts `phoneNumber` OR `email` (see useRequestOtp.ts).
 */
export function VerificationMethodComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = (location.state ?? {}) as VerificationMethodLocationState;
  const { mutate: requestOtp, isPending } = useRequestOtp();
  const [active, setActive] = useState<ContactMethod>('phone');
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);

  useEffect(() => {
    if (!username) navigate(FORGOT_PASSWORD_PATH, { replace: true });
  }, [username, navigate]);

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

  if (!username) return null;

  function handleActiveChange(method: ContactMethod) {
    phoneForm.reset();
    emailForm.reset();
    setActive(method);
  }

  function onSubmit() {
    if (active === 'phone') {
      const phoneNumber = splitE164Phone(phoneForm.getValues('phone'), dialCode);
      requestOtp(
        { otpFor: 'password', phoneNumber, countryCode: dialCode },
        {
          onSuccess: () =>
            navigate(OTP_VERIFICATION_PATH, {
              state: { verifyFor: 'password', phoneNumber, countryCode: dialCode, username },
            }),
        }
      );
    } else {
      const email = emailForm.getValues('email');
      requestOtp(
        { otpFor: 'password', email },
        {
          onSuccess: () =>
            navigate(OTP_VERIFICATION_PATH, {
              state: { verifyFor: 'password', email, username },
            }),
        }
      );
    }
  }

  return (
    <form className="w-full" onSubmit={activeForm.handleSubmit(onSubmit)}>
      <h1 className="mb-2 text-[32px] leading-[150%] font-bold text-[#2E1E91]">
        Choose verification method
      </h1>
      <p className="mb-4 text-base leading-[150%] text-[#7F7B92]">
        Choose your email or phone number through which you want to verify
        your identity. We will send a verification code to confirm your
        entry.
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
