import { clientConfig } from '@/core/config/clients';
import en from '@/core/i18n/locales/en.json';
import {
  createAddressInfoFormSchema,
  POSTAL_CODE_LENGTH,
} from '../addressInfoForm.schema';

/**
 * Numbering restarts at 1 in every test file.
 *
 * The translator returns the key it was handed, so every assertion below reads
 * as the key the rule emits rather than as English copy — copy can be edited,
 * and a test that breaks on a reworded message is a test nobody keeps. It is a
 * `jest.fn`, so the interpolation values are recorded too (see "the postal
 * code message").
 */
const t = jest.fn((key: string, _vars?: Record<string, unknown>) => key);

const NAMESPACE = 'patient.errors';
const key = (name: string) => `${NAMESPACE}.${name}`;

/**
 * Postal codes are DERIVED, not written as six digits.
 *
 * The whole point of the rule is that one config value drives the length, the
 * message and the input's `maxLength`; a test that hardcoded 6 would pass on
 * the India build and fail on the Nepal one for a reason that is not a bug.
 * On the India build these read '444444', '44444' and '4444AB'.
 */
const VALID_POSTAL = '4'.repeat(POSTAL_CODE_LENGTH);
const TOO_SHORT_POSTAL = VALID_POSTAL.slice(1);
const NON_NUMERIC_POSTAL = `${VALID_POSTAL.slice(0, -2)}AB`;

const VALID = {
  state: 'Maharashtra',
  district: 'Pune',
  village: 'Sinnar',
  addressLine1: '12 Market Road',
  addressLine2: 'Near the clinic',
  postalCode: VALID_POSTAL,
};

function parse(overrides: Partial<typeof VALID> = {}) {
  return createAddressInfoFormSchema(t).safeParse({ ...VALID, ...overrides });
}

type ParseResult = ReturnType<typeof parse>;

const messagesOf = (result: ParseResult): string[] =>
  result.success ? [] : result.error.issues.map((issue) => issue.message);

const pathsOf = (result: ParseResult): string[] =>
  result.success ? [] : result.error.issues.map((issue) => String(issue.path[0]));

beforeEach(() => {
  t.mockClear();
});

describe('a valid address', () => {

  // 1 -------------------------------------------------------------------------

  it('accepts a complete one', () => {
    expect(parse().success).toBe(true);
  });

  // 2 -------------------------------------------------------------------------

  it('accepts one with both address lines and the postal code empty', () => {
    // Four of the seven fields on this screen are optional. Only
    // state / district / village are required.
    const result = parse({ addressLine1: '', addressLine2: '', postalCode: '' });

    expect(result.success).toBe(true);
  });
});

describe('province / state', () => {

  // 3 -------------------------------------------------------------------------

  it('reports provinceRequired when it is empty', () => {
    // District is cleared too, so this isolates the state rule: a district
    // left set under an empty state is its own case, below.
    const result = parse({ state: '', district: '' });

    expect(messagesOf(result)).toEqual([key('provinceRequired')]);
  });

  it('reports provinceRequired for a whitespace-only value', () => {
    const result = parse({ state: '   ', district: '' });

    expect(messagesOf(result)).toEqual([key('provinceRequired')]);
  });

  // 4 -------------------------------------------------------------------------

  it('reports provinceInvalid for a name that is not in the asset', () => {
    const result = parse({ state: 'Atlantis', district: '' });

    expect(messagesOf(result)).toContain(key('provinceInvalid'));
  });

  // 5 -------------------------------------------------------------------------

  it('rejects the literal "Select"', () => {
    // The exact value the legacy wrote into `state_province`:
    // `areValidFields()` computed the membership check and threw the result
    // away, so the placeholder row passed the submit gate.
    const result = parse({ state: 'Select', district: '' });

    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain(key('provinceInvalid'));
  });

  it('accepts a name that differs only by case or surrounding spaces', () => {
    // A restored draft or a server row need not carry the asset's own casing.
    expect(parse({ state: '  maharashtra  ' }).success).toBe(true);
  });
});

describe('district', () => {

  // 6 -------------------------------------------------------------------------

  it('reports districtRequired when the chosen state lists districts', () => {
    const result = parse({ district: '' });

    expect(messagesOf(result)).toEqual([key('districtRequired')]);
  });

  it('reports districtRequired for a whitespace-only value', () => {
    const result = parse({ district: '   ' });

    expect(messagesOf(result)).toEqual([key('districtRequired')]);
  });

  // 7 -------------------------------------------------------------------------

  it('reports districtInvalid for a real district of the wrong state', () => {
    // Chennai is a district — of Tamil Nadu. The rule takes both values for
    // exactly this reason.
    const result = parse({ district: 'Chennai' });

    expect(messagesOf(result)).toEqual([key('districtInvalid')]);
  });

  it('reports districtInvalid for a district under a state that lists none', () => {
    // Unreachable through the UI: the field is not rendered and the cascade
    // clears the value when the state changes. A draft can still produce it,
    // and writing it would encode a district the row does not have.
    const result = parse({ state: 'Atlantis', district: 'Pune' });

    expect(messagesOf(result)).toContain(key('districtInvalid'));
  });

  it('is not required at all when no state has been picked', () => {
    // The same condition gates the rule and the field's render, so "no state
    // yet" cannot produce an error for a field that is not on screen.
    const result = parse({ state: '', district: '' });

    expect(messagesOf(result)).not.toContain(key('districtRequired'));
  });
});

describe('village / town / city', () => {

  // 8 -------------------------------------------------------------------------

  it('reports cityVillageRequired when empty or whitespace-only', () => {
    expect(messagesOf(parse({ village: '' }))).toEqual([key('cityVillageRequired')]);
    expect(messagesOf(parse({ village: '   ' }))).toEqual([key('cityVillageRequired')]);
  });

  // 9 -------------------------------------------------------------------------

  it('accepts a name with a space', () => {
    // "Navi Mumbai" could not be TYPED in the legacy: `android:digits`
    // restricted the field to the 52 ASCII letters.
    expect(parse({ village: 'Navi Mumbai' }).success).toBe(true);
  });

  // 10 ------------------------------------------------------------------------

  it('accepts apostrophes and hyphens', () => {
    expect(parse({ village: "O'Brien-pur" }).success).toBe(true);
  });

  it('accepts a Devanagari name, vowel signs included', () => {
    // The rule is \p{L}\p{M}, not A-Za-z and not \p{L} alone. `पुणे` is
    // प + ु + ण + े: the two vowel signs are combining marks, category Mn.
    // Letters-only would reject almost every real Devanagari place name while
    // accepting the few written without one — which looks like it works.
    expect(parse({ village: 'पुणे' }).success).toBe(true);
    expect(parse({ village: 'नवी मुंबई' }).success).toBe(true);
  });

  it('still rejects a mark in first position', () => {
    // Marks are allowed only after a letter, so a value cannot open with a
    // dangling vowel sign.
    expect(messagesOf(parse({ village: 'ु' }))).toEqual([key('cityVillageInvalid')]);
  });

  // 11 ------------------------------------------------------------------------

  it('rejects a colon, which is what protects the encoding', () => {
    // `city_village` stores `District:Village`. A colon typed into the village
    // is a value `decodeCityVillage` cannot split back correctly — this rule
    // is why our own writes can never carry two colons.
    const result = parse({ village: 'Navi:Mumbai' });

    expect(messagesOf(result)).toEqual([key('cityVillageInvalid')]);
  });

  it('rejects digits and a leading non-letter', () => {
    expect(messagesOf(parse({ village: 'Sector 12' }))).toEqual([key('cityVillageInvalid')]);
    expect(messagesOf(parse({ village: '-Sinnar' }))).toEqual([key('cityVillageInvalid')]);
  });
});

describe('the postal code', () => {

  // 12 ------------------------------------------------------------------------

  it('passes when empty — it is optional', () => {
    expect(parse({ postalCode: '' }).success).toBe(true);
  });

  it('passes at exactly the configured length', () => {
    expect(parse({ postalCode: VALID_POSTAL }).success).toBe(true);
  });

  it('reports postalCodeLength when too short or not all digits', () => {
    expect(messagesOf(parse({ postalCode: TOO_SHORT_POSTAL }))).toEqual([
      key('postalCodeLength'),
    ]);
    expect(messagesOf(parse({ postalCode: NON_NUMERIC_POSTAL }))).toEqual([
      key('postalCodeLength'),
    ]);
  });

  // 13 ------------------------------------------------------------------------

  it('builds the message from the configured length, not a literal', () => {
    parse({ postalCode: TOO_SHORT_POSTAL });

    // The legacy's bug was precisely this drift: the number lived in code and
    // the wording in a string resource, and `strings.xml` carried two
    // `enter_postal_limit` entries where the later one won for every flavour.
    expect(t).toHaveBeenCalledWith(key('postalCodeLength'), {
      length: clientConfig.postalCodeLength,
    });
  });

  it('has somewhere for that length to land in the copy', () => {
    // Catches a copy edit that drops the placeholder and leaves the user with
    // "Please enter digits valid postal code".
    expect(en.patient.errors.postalCodeLength).toContain('{{length}}');
  });
});

describe('the issues the schema emits', () => {

  // 14 ------------------------------------------------------------------------

  /**
   * Every branch, one parse each. `saveFailed` is deliberately absent — it is
   * the screen's key for a failed write, not a validation rule.
   */
  const everyBranch: Array<[string, Partial<typeof VALID>]> = [
    ['provinceRequired', { state: '', district: '' }],
    ['provinceInvalid', { state: 'Atlantis', district: '' }],
    ['districtRequired', { district: '' }],
    ['districtInvalid', { district: 'Chennai' }],
    ['cityVillageRequired', { village: '' }],
    ['cityVillageInvalid', { village: 'Navi:Mumbai' }],
    ['postalCodeLength', { postalCode: TOO_SHORT_POSTAL }],
  ];

  it('emits only keys that exist in en.json', () => {
    const table: Record<string, string> = en.patient.errors;

    for (const [name, overrides] of everyBranch) {
      const messages = messagesOf(parse(overrides));

      expect(messages).toContain(key(name));

      for (const message of messages) {
        expect(table[message.slice(`${NAMESPACE}.`.length)]).toBeTruthy();
      }
    }
  });

  it('attaches every issue to its own field', () => {
    // Without a path RHF has nothing to hang the error on, and the field shows
    // no caption however correct the message is. The top-level superRefine
    // sets these by hand, so they are worth pinning.
    expect(pathsOf(parse({ state: '', district: '' }))).toEqual(['state']);
    expect(pathsOf(parse({ district: 'Chennai' }))).toEqual(['district']);
    expect(pathsOf(parse({ village: '' }))).toEqual(['village']);
    expect(pathsOf(parse({ postalCode: TOO_SHORT_POSTAL }))).toEqual(['postalCode']);
  });

  it('reports at most one issue per field', () => {
    // Required OR invalid, never both — which is why the rules read as
    // if/else rather than as independent guards.
    const result = parse({ state: '', district: '', village: '', postalCode: '' });

    expect(pathsOf(result)).toEqual(['state', 'village']);
  });
});
