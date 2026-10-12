import type { ReactNode } from 'react';
import rightArrow from '../../assets/svgs/right-arrow.svg';
import rightArrowBlue from '../../assets/svgs/right-arrow-blue.svg';

interface NextButtonComponentProps {
  isValid: boolean;
  isLoading?: boolean;
  children?: ReactNode;
  /**
   * The trailing arrow icon is part of every "Next" button (forgot-username,
   * forgot-password, verification-method) but otp-verification.component.html's
   * submit button has no `<img>` at all, just the text "Verify" — set to
   * false there instead of adding a second near-identical component.
   */
  showIcon?: boolean;
}

/**
 * Filled/outlined "Next" button extracted from login.component.tsx's inline
 * submit button — same isValid-driven filled-vs-outlined swap and
 * right-arrow/right-arrow-blue icon logic, now shared across every screen
 * that repeats it (forgot-username, forgot-password, verification-method,
 * otp-verification's Verify button).
 */
export function NextButtonComponent({
  isValid,
  isLoading,
  children = 'Next',
  showIcon = true,
}: NextButtonComponentProps) {
  const className = isValid
    ? 'flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2E1E91] text-lg text-white disabled:cursor-not-allowed'
    : 'flex h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border-[3px] border-[#2E1E91] bg-white text-lg font-bold text-[#2E1E91]';

  return (
    <button
      type="submit"
      disabled={!isValid || isLoading}
      className={className}
    >
      {children}
      {showIcon && (
        <img
          className="h-5 w-5"
          src={isValid ? rightArrow : rightArrowBlue}
          alt=""
        />
      )}
    </button>
  );
}
