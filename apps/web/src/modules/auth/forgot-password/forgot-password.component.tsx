import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { NextButtonComponent } from '../../../components/auth/next-button.component';
import { ROUTES } from '../../../routes/paths';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from './forgot-password.validation';

const FORGOT_USERNAME_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.FORGOT_USERNAME}`;
const VERIFICATION_METHOD_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.VERIFICATION_METHOD}`;

/**
 * Screen 2 (forgot-password.component.html/.ts) — DELIBERATELY differs from
 * the Angular source here: the real forgot-password.component.ts calls
 * authService.requestOtp() itself and navigates straight to the OTP screen.
 * This rebuild instead does pure client-side validation only, then hands the
 * entered username to screen 3 (verification-method) via route state —
 * screen 3 is the one that actually requests the OTP once a channel
 * (phone/email) is chosen. See verification-method.component.tsx.
 */
export function ForgotPasswordComponent() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitted },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: { username: '' },
  });

  function onSubmit(values: ForgotPasswordFormValues) {
    navigate(VERIFICATION_METHOD_PATH, { state: { username: values.username } });
  }

  return (
    <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
      <h1 className="mb-2 text-[32px] leading-[150%] font-bold text-[#2E1E91]">
        Forgot Password
      </h1>
      <p className="mb-4 text-base leading-[150%] text-[#7F7B92]">
        No worries, enter your username and we will send you the OTP to reset
        your password.
      </p>

      <div className="mb-4">
        <label
          className="mb-1 flex items-center justify-between text-sm font-bold text-[#2E1E91]"
          htmlFor="username"
        >
          Username
          <Link
            className="text-sm font-normal text-[#7F7B92] underline"
            to={FORGOT_USERNAME_PATH}
          >
            Forgot Username ?
          </Link>
        </label>
        <input
          id="username"
          placeholder="Enter username"
          className="h-12 w-full rounded-lg border border-[rgba(178,175,190,0.2)] bg-white px-4 text-base text-[#1B163A]"
          {...register('username')}
        />
        {isSubmitted && errors.username && (
          <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
        )}
      </div>

      <div className="mt-5">
        <NextButtonComponent isValid={isValid} />
      </div>
    </form>
  );
}
