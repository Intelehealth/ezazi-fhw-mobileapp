import { createLoginFormSchema } from '../loginForm.schema';

const t = (key: string) => key;

describe('createLoginFormSchema', () => {

  it('accepts valid username/password', () => {
    const schema = createLoginFormSchema(t);
    const result = schema.safeParse({ username: 'nurse1', password: 'password123' });
    expect(result.success).toBe(true);
  });

  it('namespaces its error messages under login.errors', () => {
    const schema = createLoginFormSchema(t);
    const result = schema.safeParse({ username: '', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message);
      expect(messages).toContain('login.errors.usernameRequired');
      expect(messages).toContain('login.errors.passwordRequired');
    }
  });

});
