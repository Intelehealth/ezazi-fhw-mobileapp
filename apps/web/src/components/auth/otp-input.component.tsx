import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

const OTP_LENGTH = 6;

interface OtpInputComponentProps {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}

/**
 * 6-box numeric OTP input replacing Angular's ng-otp-input dependency
 * (otp-verification.component.html's `<ng-otp-input>`). Digit-per-box with
 * auto-advance on entry and backspace-to-previous, driven entirely by a
 * single combined `value` string so the parent can wire it into
 * react-hook-form via Controller (see otp-verification.component.tsx).
 */
export function OtpInputComponent({
  value,
  onChange,
  hasError,
}: OtpInputComponentProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(''));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setDigit(index, digit);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setDigit(index - 1, '');
    }
  }

  function handlePaste(event: ClipboardEvent) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted.slice(0, OTP_LENGTH));
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  }

  const boxClassName = `otp-input-box h-12 w-12 rounded-lg border bg-[#FAF9FF] text-center text-base text-[#1B163A] outline-none ${
    hasError ? 'border-red-600' : 'border-[rgba(178,175,190,0.2)]'
  }`;

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={`otp-digit-${index}`}
          ref={el => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          placeholder="_"
          value={digit}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          className={boxClassName}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
