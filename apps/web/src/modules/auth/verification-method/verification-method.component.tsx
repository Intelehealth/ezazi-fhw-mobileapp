import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ContactTabsComponent,
  type ContactMethod,
} from '../../../components/auth/contact-tabs.component';
import { NextButtonComponent } from '../../../components/auth/next-button.component';
import { useRequestOtp } from '../../../hooks/mutations/useRequestOtp';
import { ROUTES } from '../../../routes/paths';
import {
  emailContactSchema,
  phoneContactSchema,
  type EmailContactFormValues,
  type PhoneContactFormValues,
} from '../forgot-username/forgot-username.validation';

const FORGOT_PASSWORD_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.FORGOT_PASSWORD}`;
const OTP_VERIFICATION_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.OTP_VERIFICATION}`;

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
 */
export function VerificationMethodComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = (location.state ?? {}) as VerificationMethodLocationState;
  const { mutate: requestOtp, isPending } = useRequestOtp();
  const [active, setActive] = useState<ContactMethod>('phone');

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
    const value =
      active === 'phone'
        ? phoneForm.getValues('phone')
        : emailForm.getValues('email');

    requestOtp(
      { otpFor: 'password', username, via: active, value },
      {
        onSuccess: () =>
          navigate(OTP_VERIFICATION_PATH, {
            state: {
              verificationFor: 'forgot-password',
              via: active,
              value,
              username,
            },
          }),
      }
    );
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

      <ContactTabsComponent
        active={active}
        onActiveChange={handleActiveChange}
        phoneRegistration={phoneForm.register('phone')}
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

      <div className="mt-5">
        <NextButtonComponent
          isValid={activeForm.formState.isValid}
          isLoading={isPending}
        />
      </div>
    </form>
  );
}
