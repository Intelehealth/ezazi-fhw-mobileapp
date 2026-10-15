import { STAGE1_AND_2_FIELDS } from '@ezazi/clinical-rules';
import * as obsConcepts from '@/core/db/constants/obs';

describe('@ezazi/clinical-rules concept keys resolve to mobile constants', () => {
  const keys = STAGE1_AND_2_FIELDS.map((field) => field.conceptKey);

  it('resolves every Stage 1/2 field concept', () => {
    expect(keys.filter((key) => !(key in obsConcepts))).toEqual([]);
  });

  it('resolves each key to a uuid-shaped constant', () => {
    for (const key of keys) {
      expect((obsConcepts as Record<string, unknown>)[key]).toMatch(/^[0-9a-zA-Z-]{36}$/);
    }
  });
});
