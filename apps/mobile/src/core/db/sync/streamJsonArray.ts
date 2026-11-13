import { JSONParser } from '@streamparser/json';

/**
 * Streams ONE top-level JSON array: feed it bytes as they arrive, get rows in
 * batches, flat memory whatever the file's size.
 *
 * Arrays only. `pullexecutedtime.json` is a bare JSON string, and `$.*` emits
 * nothing for a root with no children — the caller parses that one directly.
 */

/** Rows per batch. Nothing measured it; small enough to keep a write cheap. */
export const DEFAULT_BATCH_ROWS = 500;

export interface JsonArrayStream {
  /** Bytes straight off the unzip stream. UTF-8, and may split a character. */
  write(chunk: Uint8Array): void;
  /** Flushes the last partial batch. Returns the rows emitted in total. */
  end(): number;
}

/**
 * `onBatch` runs INSIDE `write`, synchronously, as soon as a batch fills — that
 * is what bounds memory when one chunk carries thousands of rows. It must stay
 * synchronous for the same reason `transact` must.
 */
export function streamJsonArray<T>(
  label: string,
  onBatch: (rows: T[]) => void,
  batchSize: number = DEFAULT_BATCH_ROWS,
): JsonArrayStream {
  // keepStack:false drops each element from the root array once it is emitted.
  // Without it the "stream" has accumulated the whole file by the last row.
  const parser = new JSONParser({ paths: ['$.*'], keepStack: false });

  let batch: T[] = [];
  let total = 0;

  const flush = (): void => {
    if (batch.length === 0) return;
    const rows = batch;
    batch = [];
    onBatch(rows);
  };

  parser.onValue = ({ value }) => {
    // The parser validates shape no more than `PullPayload` does — `T` is the
    // caller's claim about the wire, and is unchecked here on purpose.
    batch.push(value as T);
    total += 1;
    if (batch.length >= batchSize) flush();
  };

  return {
    write(chunk) {
      labelled(label, () => parser.write(chunk));
    },
    end() {
      // The parser ends itself when the root array closes. Ending it twice
      // throws "Tokenizer ended in the middle of a token", which points nowhere.
      if (!parser.isEnded) labelled(label, () => parser.end());
      flush();
      return total;
    },
  };
}

/** One bad byte somewhere in fifteen files — the message has to say which. */
function labelled(label: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`[sync] ${label}: ${detail}`);
  }
}
