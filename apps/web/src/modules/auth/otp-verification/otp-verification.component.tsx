import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { NextButtonComponent } from '../../../components/auth/next-button.component';
import { OtpInputComponent } from '../../../components/auth/otp-input.component';
import { useRequestOtp } from '../../../hooks/mutations/useRequestOtp';
import { useVerifyOtp } from '../../../hooks/mutations/useVerifyOtp';
import { ROUTES } from '../../../routes/paths';
import { maskContact, type ContactMethod } from '../../../utils/mask-contact';
import { otpSchema, type OtpFormValues } from './otp-verification.validation';

const LOGIN_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.LOGIN}`;
const SETUP_NEW_PASSWORD_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.SETUP_NEW_PASSWORD}`;
const RESEND_COUNTDOWN_SECONDS = 60;

type VerificationFor = 'forgot-username' | 'forgot-password';

interface OtpVerificationLocationState {
  verificationFor?: VerificationFor;
  via?: ContactMethod;
  value?: string;
  username?: string;
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

/**
 * Screen 4 (otp-verification.component.html/.ts). Only the two
 * verificationFor cases this rebuild's flow produces are handled —
 * 'forgot-username' (from screen 1, verifies then returns to login with a
 * success toast, matching verifyForgetUsername) and 'forgot-password' (from
 * screen 3, verifies then moves on to screen 5, matching verifyForgetPassword)
 * — Angular's other cases ('login', 'presctiption-verification') aren't part
 * of the 6-screen scope given here.
 *
 * Entry guard mirrors Angular's `if (!verificationFor && !via && !val)`
 * check exactly, redirecting to /auth/login per the task spec (rather than
 * screen 2/3's forgot-password redirect).
 */
export function OtpVerificationComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verificationFor, via, value, username } = (location.state ??
    {}) as OtpVerificationLocationState;
  const { mutate: requestOtp } = useRequestOtp();
  const { mutate: verifyOtp, isPending } = useVerifyOtp();
  const [counter, setCounter] = useState(RESEND_COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!verificationFor && !via && !value) navigate(LOGIN_PATH, { replace: true });
  }, [verificationFor, via, value, navigate]);

  // Single real setInterval for the component's lifetime — resend just
  // resets the counter back to 60, matching Angular's timer(0, 1000) tick.
  useEffect(() => {
    const id = setInterval(() => {
      setCounter(current => (current > 0 ? current - 1 : current));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitted },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    mode: 'onChange',
    defaultValues: { otp: '' },
  });

  if (!verificationFor || !via || !value) return null;

  // Reassigned into their own consts so TS carries the non-undefined
  // narrowing above into the nested closures below (control-flow narrowing
  // doesn't otherwise cross into a `function` body for destructured values).
  const safeVerificationFor: VerificationFor = verificationFor;
  const safeVia: ContactMethod = via;
  const safeValue: string = value;

  function handleResend() {
    if (counter > 0) return;
    const vars =
      safeVerificationFor === 'forgot-username'
        ? ({ otpFor: 'username', via: safeVia, value: safeValue } as const)
        : ({ otpFor: 'password', via: safeVia, value: safeValue, username } as const);
    requestOtp(vars);
    setCounter(RESEND_COUNTDOWN_SECONDS);
  }

  function onSubmit(values: OtpFormValues) {
    verifyOtp(
      {
        otp: values.otp,
        verificationFor: safeVerificationFor,
        via: safeVia,
        value: safeValue,
        username,
      },
      {
        onSuccess: data => {
          if (verificationFor === 'forgot-username') {
            navigate(LOGIN_PATH);
          } else {
            navigate(SETUP_NEW_PASSWORD_PATH, {
              state: { username, userUuid: data.userUuid },
            });
          }
        },
      }
    );
  }

  return (
    <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
      <h1 className="mb-2 text-[32px] leading-[150%] font-bold text-[#2E1E91]">
        OTP verification
      </h1>
      <p className="mb-4 text-base leading-[150%] text-[#7F7B92]">
        Please enter the verification code which is sent to your{' '}
        {via === 'phone' ? 'mobile number' : 'email id'} {maskContact(value, via)}
      </p>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-bold text-[#1B163A]">
          Enter OTP
        </label>
        <Controller
          name="otp"
          control={control}
          render={({ field }) => (
            <OtpInputComponent
              value={field.value}
              onChange={field.onChange}
              hasError={isSubmitted && !!errors.otp}
            />
          )}
        />
        {isSubmitted && errors.otp && (
          <p className="mt-1 text-xs text-red-600">{errors.otp.message}</p>
        )}
      </div>

      <div className="py-2 text-base text-[#7F7B92]">
        Didn&rsquo;t receive OTP ?{' '}
        {counter > 0 ? (
          <span className="text-[#2E1E91] underline">
            Resend in {formatCountdown(counter)}
          </span>
        ) : (
          <button
            type="button"
            className="cursor-pointer text-[#2E1E91] underline"
            onClick={handleResend}
          >
            Resend
          </button>
        )}
      </div>

      <div className="mt-5">
        <NextButtonComponent isValid={isValid} isLoading={isPending} showIcon={false}>
          Verify
        </NextButtonComponent>
      </div>
    </form>
  );
}
