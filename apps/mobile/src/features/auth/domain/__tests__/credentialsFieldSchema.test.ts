import { z } from 'zod';
import { credentialsFieldShape } from '../credentialsFieldSchema';

const t = (key: string) => key;
const NAMESPACE = 'setup.errors';

const schema = z.object(credentialsFieldShape(t, NAMESPACE));

describe('credentialsFieldShape', () => {

  it('accepts a non-empty username and an 8+ char password', () => {
    const result = schema.safeParse({ username: 'nurse1', password: 'password123' });
    expect(result.success).toBe(true);
  });

  it('reports usernameRequired for an empty username', () => {
    const result = schema.safeParse({ username: '', password: 'password123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(`${NAMESPACE}.usernameRequired`);
    }
  });

  it('reports usernameRequired for a whitespace-only username', () => {
    const result = schema.safeParse({ username: '   ', password: 'password123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(`${NAMESPACE}.usernameRequired`);
    }
  });

  it('reports passwordRequired for an empty password (not passwordTooShort)', () => {
    const result = schema.safeParse({ username: 'nurse1', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(`${NAMESPACE}.passwordRequired`);
    }
  });

  it('reports passwordTooShort for a non-empty password of 7 characters or fewer', () => {
    const result = schema.safeParse({ username: 'nurse1', password: '1234567' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(`${NAMESPACE}.passwordTooShort`);
    }
  });

  it('accepts a password of exactly 8 characters (the boundary)', () => {
    const result = schema.safeParse({ username: 'nurse1', password: '12345678' });
    expect(result.success).toBe(true);
  });

});
