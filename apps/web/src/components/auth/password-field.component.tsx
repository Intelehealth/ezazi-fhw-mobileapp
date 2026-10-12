import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Link } from 'react-router-dom';
import iconEye from '../../assets/svgs/icon-eye.svg';

interface PasswordFieldComponentProps {
  registration: UseFormRegisterReturn;
  errorMessage?: string;
  /** id/label/placeholder default to the login screen's own copy. */
  id?: string;
  label?: string;
  placeholder?: string;
  /** Omitted on setup-new-password's two fields — login is the only screen with this link. */
  forgotPasswordPath?: string;
  /** Wires setup-new-password's "Generate password" link; absent everywhere else. */
  onGeneratePassword?: () => void;
}

/**
 * Password input + show/hide toggle, generalized from its original
 * login-only version (moved here from modules/auth/password-field.component.tsx)
 * so setup-new-password.component.tsx can reuse it for both its new-password
 * and confirm-password fields — which need different ids/labels/placeholders
 * and only one has the "Generate password" link, hence those becoming
 * optional props instead of duplicating the eye-toggle logic in a second
 * component.
 */
export function PasswordFieldComponent({
  registration,
  errorMessage,
  id = 'password',
  label = 'Password',
  placeholder = 'Enter password',
  forgotPasswordPath,
  onGeneratePassword,
}: PasswordFieldComponentProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-4">
      <label
        className="mb-1 flex items-center justify-between text-sm font-bold text-[#2E1E91]"
        htmlFor={id}
      >
        {label}
        {forgotPasswordPath && (
          <Link
            className="text-sm font-normal text-[#7F7B92] underline"
            to={forgotPasswordPath}
          >
            Forgot Password ?
          </Link>
        )}
        {onGeneratePassword && (
          <button
            type="button"
            className="cursor-pointer text-sm font-normal text-[#7F7B92] underline"
            onClick={onGeneratePassword}
          >
            Generate password
          </button>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          className="h-12 w-full rounded-lg border border-[rgba(178,175,190,0.2)] bg-white px-4 text-base text-[#1B163A]"
          {...registration}
        />
        <button
          type="button"
          className="absolute bottom-1.5 right-0.5 cursor-pointer rounded bg-white p-1"
          onClick={() => setVisible(prev => !prev)}
        >
          <img src={iconEye} alt="" />
        </button>
      </div>
      {errorMessage && (
        <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
