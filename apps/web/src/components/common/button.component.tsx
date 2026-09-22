import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
}

/**
 * `components/` per §3 is dumb/presentational only — no data fetching, no
 * business logic. modules/auth/login.component.tsx is its first consumer.
 */
export function Button({
  children,
  isLoading,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`w-full rounded-md bg-[--color-primary] px-4 py-2 font-medium text-white transition-opacity disabled:opacity-60 ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? '…' : children}
    </button>
  );
}
