import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import userIcon from '../../../assets/svgs/user.svg';
import { PasswordFieldComponent } from '../../../components/auth/password-field.component';
import { PasswordStrengthMeterComponent } from '../../../components/auth/password-strength-meter.component';
import { NextButtonComponent } from '../../../components/auth/next-button.component';
import { useResetPassword } from '../../../hooks/mutations/useResetPassword';
import { ROUTES } from '../../../routes/paths';
import { showToast } from '../../../services/toast';
import { generatePassword } from '../../../utils/generate-password';
import {
  checkPasswordStrength,
  hasLowerCase,
  hasNumber,
  hasSpecialCharacter,
  hasUpperCase,
} from '../../../utils/password-strength';
import {
  setupNewPasswordSchema,
  type SetupNewPasswordFormValues,
} from './setup-new-password.validation';

const LOGIN_PATH = `${ROUTES.AUTH.BASE}/${ROUTES.AUTH.LOGIN}`;
// No real personimage endpoint exists yet — this relative path deliberately
// 404s against apps/web's own origin (never leaves localhost) so the <img>
// onError fallback below to assets/svgs/user.svg is exercised, matching
// setup-new-password.component.ts's onImgError.
const AVATAR_BASE_PATH = '/mock-api/personimage';

interface SetupNewPasswordLocationState {
  username?: string;
  userUuid?: string;
}

export function SetupNewPasswordComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, userUuid } = (location.state ??
    {}) as SetupNewPasswordLocationState;
  const { mutate: resetPassword, isPending } = useResetPassword();

  useEffect(() => {
    if (!username && !userUuid) navigate(LOGIN_PATH, { replace: true });
  }, [username, userUuid, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<SetupNewPasswordFormValues>({
    resolver: zodResolver(setupNewPasswordSchema),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');
  const [strengthLevel, setStrengthLevel] = useState(checkPasswordStrength(''));

  useEffect(() => {
    setStrengthLevel(checkPasswordStrength(password));
  }, [password]);

  if (!username && !userUuid) return null;

  function handleGeneratePassword() {
    const generated = generatePassword();
    setValue('password', generated, { shouldValidate: true });
    setValue('confirmPassword', generated, { shouldValidate: true });
  }

  function onSubmit(values: SetupNewPasswordFormValues) {
    // Submit-time-only complexity check, matching resetPassword()'s toastr
    // warning — not a blocking RHF validator (see setup-new-password.validation.ts).
    if (
      !hasLowerCase(values.password) ||
      !hasUpperCase(values.password) ||
      !hasNumber(values.password) ||
      !hasSpecialCharacter(values.password)
    ) {
      showToast(
        'Password invalid!',
        'Password must be of atleast 8 characters & a mix of upper & lower case letters, numbers & symbols.',
        'warning'
      );
      return;
    }

    resetPassword(
      { userUuid: userUuid ?? '', password: values.password },
      { onSuccess: () => navigate(LOGIN_PATH) }
    );
  }

  return (
    <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
      <h1 className="mb-2 text-[32px] leading-[150%] font-bold text-[#2E1E91]">
        Set new password
      </h1>
      <p className="mb-4 text-base leading-[150%] text-[#7F7B92]">
        Your new password must be different to the previously used passwords.
      </p>

      <div className="mb-4 flex items-center">
        <img
          className="h-12 w-12 rounded-full"
          src={`${AVATAR_BASE_PATH}/${userUuid}`}
          alt=""
          onError={e => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = userIcon;
          }}
        />
        <div className="flex flex-col justify-center pl-3">
          <span className="text-sm text-[#7F7B92]">Username</span>
          <h6 className="text-base text-[#1B163A]">{username}</h6>
        </div>
      </div>

      <PasswordFieldComponent
        registration={register('password')}
        errorMessage={isSubmitted ? errors.password?.message : undefined}
        placeholder="Enter or generate new password"
        onGeneratePassword={handleGeneratePassword}
      />

      <PasswordStrengthMeterComponent level={strengthLevel} />

      <PasswordFieldComponent
        registration={register('confirmPassword')}
        errorMessage={isSubmitted ? errors.confirmPassword?.message : undefined}
        id="confirmPassword"
        label="Confirm new password"
        placeholder="Re-enter new password"
      />

      <div className="mt-5">
        {/* isValid is hardcoded true (never outline/disabled) — setup-new-password.component.html's
            submit button has no [disabled] binding at all, unlike every other screen's Next button. */}
        <NextButtonComponent isValid showIcon={false} isLoading={isPending}>
          Reset Password
        </NextButtonComponent>
      </div>
    </form>
  );
}
