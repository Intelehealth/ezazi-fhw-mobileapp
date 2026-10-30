import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { logout } from '../../../actions/auth.actions';
import { NextButtonComponent } from '../../../components/auth/next-button.component';
import { PasswordFieldComponent } from '../../../components/auth/password-field.component';
import { PasswordStrengthMeterComponent } from '../../../components/auth/password-strength-meter.component';
import { useChangePassword } from '../../../hooks/mutations/useChangePassword';
import { showToast } from '../../../services/toast';
import { useAppDispatch } from '../../../store/hooks';
import { generatePassword } from '../../../utils/generate-password';
import {
  checkPasswordStrength,
  hasLowerCase,
  hasNumber,
  hasSpecialCharacter,
  hasUpperCase,
} from '../../../utils/password-strength';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from './change-password.validation';

/**
 * Ports change-password.component.html/.ts (intelehealth-doctor-webapp) —
 * the signed-in user's own "Old password / New password / Confirm new
 * password" form, shown to every role. After the form's own required/min-8
 * checks, submit still refuses (with a warning toast, like the Angular
 * source) when the two new passwords differ or the new one lacks a lower
 * case letter, upper case letter, number or symbol. The new password also
 * gets the live strength meter and a "Generate password" link, exactly as on
 * the setup-new-password screen. Once the password has changed the user is
 * logged out, so they sign in again with the new one.
 */
export function ChangePasswordComponent() {
  const { mutate: changePassword, isPending } = useChangePassword();
  const dispatch = useAppDispatch();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitted, isValid },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    defaultValues: { oldPassword: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');
  const strengthLevel = useMemo(
    () => checkPasswordStrength(password),
    [password]
  );

  function handleGeneratePassword() {
    const generated = generatePassword();
    setValue('password', generated, { shouldValidate: true });
    setValue('confirmPassword', generated, { shouldValidate: true });
  }

  function onSubmit(values: ChangePasswordFormValues) {
    if (values.password !== values.confirmPassword) {
      showToast(
        "Password doesn't match!",
        "New Password and Confirm Password doesn't match.",
        'warning'
      );
      return;
    }

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

    changePassword(
      { oldPassword: values.oldPassword, newPassword: values.password },
      /*
       * The password has changed, so the current session (and the OpenMRS
       * one, which logout() also ends) is signed out and the user is sent to
       * the login screen to sign in with the new password.
       */
      { onSuccess: () => dispatch(logout()) }
    );
  }

  return (
    <div>
      <h6 className="text-[32px] leading-[150%] font-bold text-[#2E1E91]">
        Change password
      </h6>
      <p className="text-base leading-[150%] font-medium text-[#7F7B92]">
        Your new password must be different to the previously used passwords.
      </p>

      <form className="py-6" onSubmit={handleSubmit(onSubmit)}>
        <PasswordFieldComponent
          registration={register('oldPassword')}
          errorMessage={isSubmitted ? errors.oldPassword?.message : undefined}
          id="oldPassword"
          label="Old password"
          placeholder="Enter old password"
        />

        <PasswordFieldComponent
          registration={register('password')}
          errorMessage={isSubmitted ? errors.password?.message : undefined}
          id="password"
          label="New password"
          placeholder="Enter or generate new password"
          onGeneratePassword={handleGeneratePassword}
        />

        <PasswordStrengthMeterComponent level={strengthLevel} />

        <PasswordFieldComponent
          registration={register('confirmPassword')}
          errorMessage={
            isSubmitted ? errors.confirmPassword?.message : undefined
          }
          id="confirmPassword"
          label="Confirm new password"
          placeholder="Re-enter new password"
        />

        <div className="mt-12">
          {/*
           * Outlined while the form is invalid and filled once it is valid —
           * but clickable either way, like the Angular button, so clicking
           * an invalid form is how the field errors appear.
           */}
          <NextButtonComponent
            isValid={isValid}
            showIcon={false}
            isLoading={isPending}
            submittableWhenInvalid
          >
            Change Password
          </NextButtonComponent>
        </div>
      </form>
    </div>
  );
}
