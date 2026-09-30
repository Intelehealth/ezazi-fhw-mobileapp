import { clientConfig } from '@/core/config/clients';
import { PHONE_REGEX, createForgotPasswordRequestFormSchema } from '../forgotPasswordRequestForm.schema';

const t = (key: string) => key;
const NAMESPACE = 'forgotPassword.request.errors';
const validNumber = '9'.repeat(clientConfig.phone.numberLength);

describe('PHONE_REGEX', () => {

  it("matches exactly the active client's digit count", () => {
    expect(PHONE_REGEX.test(validNumber)).toBe(true);
  });

  it('rejects one digit short', () => {
    expect(PHONE_REGEX.test(validNumber.slice(1))).toBe(false);
  });

  it('rejects one digit too many', () => {
    expect(PHONE_REGEX.test(`${validNumber}9`)).toBe(false);
  });

  it('rejects non-digit characters', () => {
    expect(PHONE_REGEX.test(`${validNumber.slice(1)}a`)).toBe(false);
  });

});

describe('createForgotPasswordRequestFormSchema', () => {

  it('accepts a phone number of the correct length', () => {
    const schema = createForgotPasswordRequestFormSchema(t);
    const result = schema.safeParse({ phoneNumber: validNumber });
    expect(result.success).toBe(true);
  });

  it('reports phoneRequired for an empty/whitespace-only number', () => {
    const schema = createForgotPasswordRequestFormSchema(t);
    const result = schema.safeParse({ phoneNumber: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(`${NAMESPACE}.phoneRequired`);
    }
  });

  it('reports phoneInvalid for a non-empty number of the wrong length', () => {
    const schema = createForgotPasswordRequestFormSchema(t);
    const result = schema.safeParse({ phoneNumber: '123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(`${NAMESPACE}.phoneInvalid`);
    }
  });

});
