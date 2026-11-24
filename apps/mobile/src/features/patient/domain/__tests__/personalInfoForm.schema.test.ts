import {
  createPersonalInfoFormSchema,
  type PersonalInfoFormValues,
} from '../personalInfoForm.schema';

/**
 * `t` returns the key, so these pin WHICH message fires rather than the English
 * wording — the copy is a translation away from changing and the rule is not.
 */
const t = (key: string) => key;

const schema = createPersonalInfoFormSchema(t);

/** Every field at its default. Each test overrides only what it is about. */
const EMPTY: PersonalInfoFormValues = {
  photoPath: null,
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  age: '',
  mobileNumber: '',
  alternateMobileNumber: '',
};

const VALID: PersonalInfoFormValues = {
  photoPath: null,
  firstName: 'Asha',
  middleName: '',
  lastName: 'Patil',
  dateOfBirth: '1998-04-28',
  age: '28',
  mobileNumber: '9876543210',
  alternateMobileNumber: '',
};

const parse = (overrides: Partial<PersonalInfoFormValues> = {}) =>
  schema.safeParse({ ...VALID, ...overrides });

/** Which fields failed, as a set — order out of zod is not a contract. */
const failedFields = (result: ReturnType<typeof parse>) =>
  result.success ? [] : result.error.issues.map(issue => issue.path.join('.')).sort();

const messageFor = (result: ReturnType<typeof parse>, field: string) =>
  result.success
    ? undefined
    : result.error.issues.find(issue => issue.path.join('.') === field)?.message;

describe('createPersonalInfoFormSchema', () => {

  it('fails an empty form on exactly the four required fields', () => {
    const result = schema.safeParse(EMPTY);

    expect(result.success).toBe(false);
    expect(failedFields(result)).toEqual(['age', 'dateOfBirth', 'firstName', 'lastName']);
    expect(messageFor(result, 'firstName')).toBe('patient.errors.firstNameRequired');
    expect(messageFor(result, 'lastName')).toBe('patient.errors.lastNameRequired');
    expect(messageFor(result, 'dateOfBirth')).toBe('patient.errors.dobRequired');
    expect(messageFor(result, 'age')).toBe('patient.errors.ageMinimum');
  });

  // The deliberate fix over the legacy, which gates on TextUtils.isEmpty and
  // lets a field of spaces through into first_name.
  it('rejects a name that is only spaces', () => {
    const result = parse({ firstName: '   ', lastName: '  ' });

    expect(result.success).toBe(false);
    expect(failedFields(result)).toEqual(['firstName', 'lastName']);
  });

  it('accepts an empty middle name', () => {
    expect(parse({ middleName: '' }).success).toBe(true);
  });

  // 13 PASSES. The legacy's message says "greater than 13" and its check is
  // < 13; both are carried as they are.
  it('takes 13 but not 12, and not an empty age', () => {
    expect(parse({ age: '12' }).success).toBe(false);
    expect(parse({ age: '13' }).success).toBe(true);
    expect(parse({ age: '' }).success).toBe(false);
  });

  it('fails a non-numeric age rather than throwing', () => {
    const result = parse({ age: 'ab' });

    expect(result.success).toBe(false);
    expect(messageFor(result, 'age')).toBe('patient.errors.ageMinimum');
  });

  it('takes a mobile number that is empty or exactly ten digits', () => {
    expect(parse({ mobileNumber: '' }).success).toBe(true);
    expect(parse({ mobileNumber: '1234567890' }).success).toBe(true);

    const short = parse({ mobileNumber: '12345' });
    expect(short.success).toBe(false);
    expect(messageFor(short, 'mobileNumber')).toBe('patient.errors.mobileLength');
  });

  it('applies the same rule and the same message to the alternate number', () => {
    expect(parse({ alternateMobileNumber: '' }).success).toBe(true);
    expect(parse({ alternateMobileNumber: '1234567890' }).success).toBe(true);

    const short = parse({ alternateMobileNumber: '12345' });
    expect(short.success).toBe(false);
    expect(messageFor(short, 'alternateMobileNumber')).toBe('patient.errors.mobileLength');
  });

  it('parses a filled form back out unchanged', () => {
    const filled: PersonalInfoFormValues = {
      ...VALID,
      middleName: 'Rani',
      alternateMobileNumber: '9123456780',
      photoPath: 'file:///document/patient-photos/x.jpg',
    };
    const result = schema.safeParse(filled);

    expect(result.success).toBe(true);
    if (result.success) {
      // Typed, not just deep-equal: this is what pins the inferred shape.
      const parsed: PersonalInfoFormValues = result.data;
      expect(parsed).toEqual(filled);
    }
  });

});
