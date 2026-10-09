import type { PasswordStrengthLevel } from '../../utils/password-strength';

interface PasswordStrengthMeterComponentProps {
  level: PasswordStrengthLevel;
}

const LEVEL_LABELS: Record<PasswordStrengthLevel, string> = {
  4: 'Excellent',
  3: 'Good',
  2: 'Fair',
  1: 'Low',
};

const SEGMENT_COUNT = 4;

/**
 * 4-segment strength meter from setup-new-password.component.html's
 * `.password-strength-con` — level 1..4 fills that many segments, matching
 * `[class.filled]="level >= n"`. Score itself is computed by
 * utils/password-strength.ts, not here.
 */
export function PasswordStrengthMeterComponent({
  level,
}: PasswordStrengthMeterComponentProps) {
  return (
    <div className="mb-4">
      <p className="text-sm text-[#7F7B92]">
        Password strength: <span className="font-bold text-[#2E1E91]">{LEVEL_LABELS[level]}</span>
      </p>
      <div className="my-2 flex gap-[10px]">
        {Array.from({ length: SEGMENT_COUNT }, (_, i) => i + 1).map(segment => (
          <div
            key={segment}
            className={`h-1 flex-1 rounded-[10px] ${
              segment <= level ? 'bg-[#2E1E91]' : 'bg-[#B0ADBE]'
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-[#7F7B92]">
        Password must be of atleast <b>8 characters</b> & a mix of{' '}
        <b>upper & lower case letters, numbers & symbols.</b>
      </p>
    </div>
  );
}
