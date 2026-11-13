import { streamJsonArray } from '../streamJsonArray';

/**
 * The JSON array reader behind the archive. Two things matter more than the
 * parsing itself: a row must never depend on where a chunk boundary fell, and
 * the last partial batch must not be dropped on the floor.
 */

const encode = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));

/** Devanagari consonants, 3 bytes each in UTF-8. The alphabet, not a word. */
const MULTIBYTE = 'कखग';

describe('streamJsonArray', () => {
  it('emits every element of a top-level array', () => {
    const batches: unknown[][] = [];
    const stream = streamJsonArray('t.json', (rows) => batches.push(rows));

    stream.write(encode([{ id: 'row-1' }, { id: 'row-2' }]));

    expect(stream.end()).toBe(2);
    expect(batches).toEqual([[{ id: 'row-1' }, { id: 'row-2' }]]);
  });

  it('does not care where the chunk boundaries fall', () => {
    // One byte at a time is the strongest form of this: it splits EVERY
    // multi-byte character, so passing here covers any chunk the unzip picks.
    const rows = [
      { id: 'row-1', label: MULTIBYTE },
      { id: 'row-2', label: 'ascii' },
    ];
    const batches: unknown[][] = [];
    const stream = streamJsonArray('t.json', (batch) => batches.push(batch));

    for (const byte of encode(rows)) stream.write(Uint8Array.of(byte));
    stream.end();

    expect(batches.flat()).toEqual(rows);
  });

  it('flushes a full batch mid-chunk and the remainder on end', () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({ id: `row-${String(index)}` }));
    const sizes: number[] = [];
    const stream = streamJsonArray('t.json', (batch) => sizes.push(batch.length), 2);

    stream.write(encode(rows));

    expect(stream.end()).toBe(5);
    expect(sizes).toEqual([2, 2, 1]);
  });

  it('emits nothing for an empty array', () => {
    // Six of the archive's fifteen files are exactly `[]` on a quiet site.
    const onBatch = jest.fn();
    const stream = streamJsonArray('t.json', onBatch);

    stream.write(encode([]));

    expect(stream.end()).toBe(0);
    expect(onBatch).not.toHaveBeenCalled();
  });

  it('survives end() after the parser has already ended itself', () => {
    // It self-ends when the root array closes, and a second end throws
    // "Tokenizer ended in the middle of a token" — which points nowhere.
    const stream = streamJsonArray('t.json', jest.fn());
    stream.write(encode([{ id: 'row-1' }]));

    expect(() => stream.end()).not.toThrow();
  });

  it('names the file when the bytes stop early', () => {
    const stream = streamJsonArray('patientlist.json', jest.fn());

    stream.write(new TextEncoder().encode('[{"id":"row-1"'));

    expect(() => stream.end()).toThrow(/patientlist\.json/);
  });

  it('names the file when the bytes are not JSON at all', () => {
    const stream = streamJsonArray('locationlist.json', jest.fn());

    expect(() => stream.write(new TextEncoder().encode('<html>'))).toThrow(
      /locationlist\.json/,
    );
  });
});
