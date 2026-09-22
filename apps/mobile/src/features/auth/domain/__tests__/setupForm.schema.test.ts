import { createSetupFormSchema } from '../setupForm.schema';

const t = (key: string) => key;

describe('createSetupFormSchema', () => {

  it('accepts a valid location/username/password', () => {
    const schema = createSetupFormSchema(t);
    const result = schema.safeParse({
      location: 'Civil Hospital',
      username: 'nurse1',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('reports locationRequired for an empty location, namespaced under setup.errors', () => {
    const schema = createSetupFormSchema(t);
    const result = schema.safeParse({ location: '', username: 'nurse1', password: 'password123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('setup.errors.locationRequired');
    }
  });

  it('still applies the shared username/password rules, namespaced under setup.errors', () => {
    const schema = createSetupFormSchema(t);
    const result = schema.safeParse({ location: 'Civil Hospital', username: '', password: '1234567' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message);
      expect(messages).toContain('setup.errors.usernameRequired');
      expect(messages).toContain('setup.errors.passwordTooShort');
    }
  });

});
