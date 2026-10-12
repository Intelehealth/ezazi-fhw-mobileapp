import { describe, expect, it } from 'vitest';
import { profileSchema } from '../../../../modules/dashboard/profile/profile.validation';

function validValues(overrides: Partial<Record<string, string>> = {}) {
  return {
    givenName: 'Demo',
    middleName: 'Male',
    familyName: 'Doctor',
    gender: 'M',
    birthdate: '1988-04-12',
    phoneNumber: '9999999999',
    whatsapp: '9999999999',
    emailId: 'demo@example.com',
    visitState: '',
    qualification: 'MBBS',
    otherQualification: '',
    specialization: 'General',
    registrationNumber: 'REG123',
    facilityName: 'Demo Facility',
    providerWard: 'Ward 1',
    textOfSign: 'Demo Doctor',
    fontOfSign: 'Arty',
    ...overrides,
  };
}

describe('profileSchema birthdate/age', () => {
  it('accepts a birthdate at least 18 years in the past', () => {
    const result = profileSchema.safeParse(validValues());
    expect(result.success).toBe(true);
  });

  it("rejects a birthdate less than 18 years ago, matching profile.component.ts's age min(18)", () => {
    const under18 = new Date();
    under18.setFullYear(under18.getFullYear() - 10);
    const result = profileSchema.safeParse(
      validValues({ birthdate: under18.toISOString().slice(0, 10) })
    );
    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
      'Age should be greater than or equal to 18'
    );
  });

  it('rejects a missing birthdate with the required message, not the age message', () => {
    const result = profileSchema.safeParse(validValues({ birthdate: '' }));
    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
      'Enter DOB'
    );
  });

  it('accepts a malformed birthdate (format errors are for another validator to catch)', () => {
    const result = profileSchema.safeParse(
      validValues({ birthdate: 'not-a-date' })
    );
    expect(result.success).toBe(true);
  });
});

describe('profileSchema gender', () => {
  it('accepts M, F, and U', () => {
    for (const gender of ['M', 'F', 'U']) {
      expect(profileSchema.safeParse(validValues({ gender })).success).toBe(
        true
      );
    }
  });

  it('rejects any other value with "Select gender", via the enum errorMap', () => {
    const result = profileSchema.safeParse(validValues({ gender: 'X' }));
    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
      'Select gender'
    );
  });
});

describe('profileSchema otherQualification', () => {
  it('is not required when qualification is not "Other"', () => {
    const result = profileSchema.safeParse(
      validValues({ qualification: 'MBBS', otherQualification: '' })
    );
    expect(result.success).toBe(true);
  });

  it('requires otherQualification when qualification is "Other"', () => {
    const result = profileSchema.safeParse(
      validValues({ qualification: 'Other', otherQualification: '' })
    );
    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
      'Enter other qualification'
    );
  });

  it('rejects a non-alphabetic otherQualification when qualification is "Other"', () => {
    const result = profileSchema.safeParse(
      validValues({ qualification: 'Other', otherQualification: 'MD123' })
    );
    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
      'Other qualification should contain alphabates only'
    );
  });

  it('accepts a valid otherQualification when qualification is "Other"', () => {
    const result = profileSchema.safeParse(
      validValues({ qualification: 'Other', otherQualification: 'MD, DGO' })
    );
    expect(result.success).toBe(true);
  });
});
