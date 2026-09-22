import { PASSWORD_REGEX, createForgotPasswordResetFormSchema } from '../forgotPasswordResetForm.schema';

const t = (key: string) => key;
const NAMESPACE = 'forgotPassword.reset.errors';

describe('PASSWORD_REGEX', () => {

  it('accepts a password with a digit, lower, upper, symbol and 8+ chars', () => {
    expect(PASSWORD_REGEX.test('Nurse@1245')).toBe(true);
  });

  it('rejects a password under 8 characters', () => {
    expect(PASSWORD_REGEX.test('Nur@12')).toBe(false);
  });

  it('rejects a password with no digit', () => {
    expect(PASSWORD_REGEX.test('Nurse@Name')).toBe(false);
  });

  it('rejects a password with no lowercase letter', () => {
    expect(PASSWORD_REGEX.test('NURSE@1245')).toBe(false);
  });

  it('rejects a password with no uppercase letter', () => {
    expect(PASSWORD_REGEX.test('nurse@1245')).toBe(false);
  });

  it('rejects a password with no symbol from @*#$%^&+=', () => {
    expect(PASSWORD_REGEX.test('Nurse12345')).toBe(false);
  });

  it('rejects a password containing a space', () => {
    expect(PASSWORD_REGEX.test('Nurse@12 45')).toBe(false);
  });

});

describe('createForgotPasswordResetFormSchema', () => {

  it('accepts matching, valid new/confirm passwords', () => {
    const schema = createForgotPasswordResetFormSchema(t);
    const result = schema.safeParse({ newPassword: 'Nurse@1245', confirmPassword: 'Nurse@1245' });
    expect(result.success).toBe(true);
  });

  it('reports newPasswordRequired for an empty new password', () => {
    const schema = createForgotPasswordResetFormSchema(t);
    const result = schema.safeParse({ newPassword: '', confirmPassword: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const newPasswordIssue = result.error.issues.find(i => i.path[0] === 'newPassword');
      expect(newPasswordIssue?.message).toBe(`${NAMESPACE}.newPasswordRequired`);
    }
  });

  it('reports passwordInvalid for a non-empty password that fails the regex', () => {
    const schema = createForgotPasswordResetFormSchema(t);
    const result = schema.safeParse({ newPassword: 'weakpass', confirmPassword: 'weakpass' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const newPasswordIssue = result.error.issues.find(i => i.path[0] === 'newPassword');
      expect(newPasswordIssue?.message).toBe(`${NAMESPACE}.passwordInvalid`);
    }
  });

  it('reports confirmRequired for an empty confirm field', () => {
    const schema = createForgotPasswordResetFormSchema(t);
    const result = schema.safeParse({ newPassword: 'Nurse@1245', confirmPassword: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmIssue = result.error.issues.find(i => i.path[0] === 'confirmPassword');
      expect(confirmIssue?.message).toBe(`${NAMESPACE}.confirmRequired`);
    }
  });

  it('reports noMatch when confirm differs from the new password', () => {
    const schema = createForgotPasswordResetFormSchema(t);
    const result = schema.safeParse({ newPassword: 'Nurse@1245', confirmPassword: 'Nurse@9999' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmIssue = result.error.issues.find(i => i.path[0] === 'confirmPassword');
      expect(confirmIssue?.message).toBe(`${NAMESPACE}.noMatch`);
    }
  });

});
