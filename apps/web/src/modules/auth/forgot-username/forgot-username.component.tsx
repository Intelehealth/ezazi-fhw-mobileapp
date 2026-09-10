import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
} from './forgot-username.validation';

const OTP_VERIFICATION_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.OTP_VERIFICATION}`;

/**
 * Screen 1 (forgot-username.component.html/.ts) — matches the Angular
 * source's own direct-to-OTP behavior unchanged: submit calls requestOtp
 * itself, then navigates straight to otp-verification (unlike screen 2,
 * forgot-password, which was deliberately changed — see its component for
 * why).
 *
 * Two independent useForm instances (one per tab) rather than one shared
 * FormGroup with swapped validators (Angular's `reset()`) — switching tabs
 * resets both, matching the Angular form being blanked on every tab change.
 */
export function ForgotUsernameComponent() {
  const navigate = useNavigate();
  const { mutate: requestOtp, isPending } = useRequestOtp();
  const [active, setActive] = useState<ContactMethod>('phone');

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
    const value =
      active === 'phone'
        ? phoneForm.getValues('phone')
        : emailForm.getValues('email');

    requestOtp(
      { otpFor: 'username', via: active, value },
      {
        onSuccess: () =>
          navigate(OTP_VERIFICATION_PATH, {
            state: { verificationFor: 'forgot-username', via: active, value },
          }),
      }
    );
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
