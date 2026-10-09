import { describe, expect, it } from 'vitest';
import { splitE164Phone } from '../../utils/split-phone-number';

describe('splitE164Phone', () => {
  it('strips the matching "+<dialCode>" prefix, leaving just the national number', () => {
    expect(splitE164Phone('+919876543210', '91')).toBe('9876543210');
  });

  it('falls back to stripping a bare leading "+" when the value does not start with the given dial code', () => {
    // Shouldn't happen in practice (dialCode always comes from the same
    // PhoneInput onChange call as value), but stays a plain digit string
    // rather than leaking a stray "+" into the phoneNumber field either way.
    expect(splitE164Phone('+19876543210', '91')).toBe('19876543210');
  });
});
