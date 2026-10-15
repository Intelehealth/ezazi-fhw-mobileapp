import { STAGE1_AND_2_FIELDS } from '@ezazi/clinical-rules';
import * as obsConcepts from '@/core/db/constants/obs';

// Not yet in core/db/constants/obs.ts. Remove a key here once its constant is added.
const KNOWN_MISSING = ['URINE_ACETONE', 'SUPERVISOR_DOCTOR'];

describe('@ezazi/clinical-rules concept keys resolve to mobile constants', () => {
  const keys = STAGE1_AND_2_FIELDS.map((field) => field.conceptKey);

  it('resolves every Stage 1/2 field concept, except the known missing ones', () => {
    const missing = keys.filter((key) => !(key in obsConcepts));
    expect(missing).toEqual(KNOWN_MISSING);
  });

  it('resolves each key to a uuid-shaped constant', () => {
    for (const key of keys.filter((k) => !KNOWN_MISSING.includes(k))) {
      expect((obsConcepts as Record<string, unknown>)[key]).toMatch(/^[0-9a-zA-Z-]{36}$/);
    }
  });
});
