import { describe, expect, it } from 'vitest';
import { maskContact } from '../../utils/mask-contact';

describe('maskContact', () => {
  it('masks the middle of a phone number, keeping the last 2 digits visible', () => {
    expect(maskContact('9876543210', 'phone')).toBe('98765*****10');
  });

  it('masks the middle of an email, keeping the last 4 characters visible', () => {
    expect(maskContact('nurse1@example.com', 'email')).toBe('nurse*****.com');
  });
});
