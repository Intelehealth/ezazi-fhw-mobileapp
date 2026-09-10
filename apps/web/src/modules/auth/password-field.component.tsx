import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Link } from 'react-router-dom';
import iconEye from '../../assets/svgs/icon-eye.svg';

interface PasswordFieldComponentProps {
  registration: UseFormRegisterReturn<'password'>;
  errorMessage?: string;
  forgotPasswordPath: string;
}

/**
 * Password input + inline "Forgot Password?" link + show/hide toggle —
 * Angular's .password-field/.toggle-password-btn (login.component.html/
 * .scss). Split out of login.component.tsx per the coding standards' "one
 * concept per file" rule.
 */
export function PasswordFieldComponent({
  registration,
  errorMessage,
  forgotPasswordPath,
}: PasswordFieldComponentProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-4">
      <label
        className="mb-1 flex items-center justify-between text-sm font-bold text-[#2E1E91]"
        htmlFor="password"
      >
        Password
        <Link
          className="text-sm font-normal text-[#7F7B92] underline"
          to={forgotPasswordPath}
        >
          Forgot Password ?
        </Link>
      </label>
      <div className="relative">
        <input
          id="password"
          type={visible ? 'text' : 'password'}
          placeholder="Enter password"
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
