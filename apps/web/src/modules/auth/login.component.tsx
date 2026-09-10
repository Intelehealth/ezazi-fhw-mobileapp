import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import rightArrow from '../../assets/svgs/right-arrow.svg';
import rightArrowBlue from '../../assets/svgs/right-arrow-blue.svg';
import { RecaptchaComponent } from '../../components/common/recaptcha.component';
import { env } from '../../config/env';
import { useLogin } from '../../hooks/mutations/useLogin';
import { ROUTES } from '../../routes/paths';
import { PasswordFieldComponent } from '../../components/auth/password-field.component';
import { loginSchema, type LoginFormValues } from './login.validation';

const FORGOT_USERNAME_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.FORGOT_USERNAME}`;
const FORGOT_PASSWORD_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.FORGOT_PASSWORD}`;

/**
 * `modules/<feature>/*.component.tsx` per §3 — feature UI + its own
 * validation/hooks. pages/auth/login/login.page.tsx is the thin route
 * wrapper; components/layout/auth-layout.component.tsx is the shared shell
 * around it.
 *
 * mode: 'onChange' (not the scaffold's original 'onTouched') is required
 * here specifically — the submit button's filled/outlined state must track
 * `formState.isValid` live on every keystroke, matching
 * login.component.ts's `[disabled]="loginForm.invalid"` binding. Inline
 * error text still only shows after a submit attempt (`isSubmitted`), not
 * live, matching the Angular form's `submitted && f.x.errors` pattern.
 */
export function LoginComponent() {
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isSubmitted },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { username: '', password: '', recaptcha: '' },
  });

  const handleRecaptchaChange = useCallback(
    (token: string | null) =>
      setValue('recaptcha', token ?? '', { shouldValidate: true }),
    [setValue]
  );

  const submitButtonClassName = isValid
    ? 'flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2E1E91] text-lg text-white disabled:cursor-not-allowed'
    : 'flex h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border-[3px] border-[#2E1E91] bg-white text-lg font-bold text-[#2E1E91]';

  return (
    <form className="w-full" onSubmit={handleSubmit(values => login(values))}>
      <h1 className="mb-4 text-[32px] leading-[150%] font-bold text-[#2E1E91]">
        Login
      </h1>

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

      <PasswordFieldComponent
        registration={register('password')}
        errorMessage={isSubmitted ? errors.password?.message : undefined}
        forgotPasswordPath={FORGOT_PASSWORD_PATH}
      />

      <div className="mb-4">
        <label className="mb-2 block text-sm font-bold text-[#2E1E91]">
          Before logging in, please confirm you are not a robot
        </label>
        <RecaptchaComponent
          siteKey={env.RECAPTCHA_SITE_KEY}
          onChange={handleRecaptchaChange}
        />
      </div>

      <button
        type="submit"
        disabled={!isValid || isPending}
        className={submitButtonClassName}
      >
        Login
        <img
          className="h-5 w-5"
          src={isValid ? rightArrow : rightArrowBlue}
          alt=""
        />
      </button>
    </form>
  );
}
