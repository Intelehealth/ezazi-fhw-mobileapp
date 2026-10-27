import { getCardLayout } from '@ezazi/clinical-rules';

import { initialCaptureValues } from '../captureForm';
import { createCaptureFormSchema } from '../captureForm.schema';

const LAYOUT = getCardLayout('Stage1_Hour1_1')!;
const t = (key: string, options?: Record<string, unknown>) => `${key} ${JSON.stringify(options ?? {})}`;
const schema = createCaptureFormSchema(LAYOUT, 'default', t);

describe('createCaptureFormSchema', () => {
  it('accepts an empty card: every field is optional', () => {
    expect(schema.safeParse(initialCaptureValues(LAYOUT)).success).toBe(true);
  });

  it('reports an out-of-range value on its field, with the range in the message', () => {
    const form = initialCaptureValues(LAYOUT);
    form.values.pulse = '20';
    const result = schema.safeParse(form);

    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.path).toEqual(['values', 'pulse']);
    expect(issue?.message).toContain('partogram.validation.pulse.outOfRange');
    expect(issue?.message).toContain('"min":30');
  });

  it('reports an Oxytocin Yes without its inputs on the Oxytocin answer', () => {
    const form = initialCaptureValues(LAYOUT);
    form.oxytocin = { answer: 'yes', entry: {} };
    expect(schema.safeParse(form).error?.issues[0].path).toEqual(['oxytocin']);
  });
});
