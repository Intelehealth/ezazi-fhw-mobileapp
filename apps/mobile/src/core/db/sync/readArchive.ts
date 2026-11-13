import { File, FileMode, type FileHandle } from 'expo-file-system';
import { Unzip, UnzipInflate } from 'fflate';

import { appStateRepo } from '@/core/db/repositories';
import { transact, type DbHandle } from '@/core/db/tx';
import { logger } from '@/core/utils/logger';

import { applyPull, PULL_LIST_KEYS, type PullPayload } from './applyPull';
import { streamJsonArray } from './streamJsonArray';

/**
 * The first sync. The server answers the 2006 cursor with a zip of one file
 * per list, and this walks it front to back without ever holding the file.
 *
 * The cursor moves LAST, inside its own transaction. Until it does, a failure
 * anywhere just means the next launch re-applies the same zip — every write is
 * an upsert keyed by uuid, so redoing it converges.
 */

/** Bytes per read. Big enough to be few syscalls, small enough to yield often. */
export const ARCHIVE_CHUNK_BYTES = 64 * 1024;

/** A bare JSON string, not a list, and always the last entry. */
const CURSOR_ENTRY = 'pullexecutedtime';

/** `PK\x03\x04`. Catches a truncated download or an error page in microseconds. */
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

/** Roughly one frame. The read loop is synchronous and would otherwise hold it. */
const YIELD_AFTER_MS = 16;

export interface ArchiveResult {
  entries: number;
  rows: number;
  /** The watermark the first incremental pull asks from. Already committed. */
  cursor: string;
}

export async function readArchive(path: string, on?: DbHandle): Promise<ArchiveResult> {
  const reader = new File(path).open(FileMode.ReadOnly);
  const cursorBytes: number[] = [];
  let entries = 0;
  let rows = 0;

  try {
    assertZip(reader);

    const unzip = new Unzip();
    // Mandatory. fflate pre-registers stored entries only, and every entry
    // the server writes is deflated.
    unzip.register(UnzipInflate);

    unzip.onfile = (entry) => {
      entries += 1;
      const key = entry.name.replace(/\.json$/, '');
      logger.debug('[sync] archive entry', entry.name, entry.originalSize ?? 'size unknown');

      if (key === CURSOR_ENTRY) {
        entry.ondata = collect(cursorBytes);
      } else if (isListKey(key)) {
        const sink = streamJsonArray(entry.name, (batch: unknown[]) => {
          applyPull({ [key]: batch } as PullPayload, null, on);
        });

        entry.ondata = (error, data, final) => {
          if (error) throw error;
          if (data.length > 0) sink.write(data);
          if (final) rows += sink.end();
        };
      } else {
        // Drained, not skipped: an entry never started keeps its compressed
        // bytes in fflate's buffer for the whole run.
        entry.ondata = (error) => {
          if (error) throw error;
        };
      }

      // Synchronously, here. Deferring it makes fflate buffer the whole entry.
      entry.start();
    };

    await pump(reader, unzip);
  } finally {
    reader.close();
  }

  const cursor = readCursor(cursorBytes);
  transact((tx) => appStateRepo.setPullCursor(cursor, tx), on);
  logger.info('[sync] archive applied', { entries, rows, cursor });

  return { entries, rows, cursor };
}

/** Reads the file into the unzip stream, pausing often enough to draw a frame. */
async function pump(reader: FileHandle, unzip: Unzip): Promise<void> {
  let lastYield = Date.now();

  for (;;) {
    const chunk = reader.readBytes(ARCHIVE_CHUNK_BYTES);
    if (chunk.length === 0) break;

    unzip.push(chunk, false);

    if (Date.now() - lastYield >= YIELD_AFTER_MS) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYield = Date.now();
    }
  }

  unzip.push(new Uint8Array(0), true);
}

function assertZip(reader: FileHandle): void {
  const head = reader.readBytes(ZIP_SIGNATURE.length);
  reader.offset = 0;

  if (ZIP_SIGNATURE.some((byte, index) => head[index] !== byte)) {
    throw new Error('[sync] archive is not a zip — a truncated download or an error page');
  }
}

function isListKey(key: string): key is (typeof PULL_LIST_KEYS)[number] {
  return (PULL_LIST_KEYS as readonly string[]).includes(key);
}

function collect(into: number[]) {
  return (error: unknown, data: Uint8Array): void => {
    if (error) throw error;
    for (const byte of data) into.push(byte);
  };
}

/**
 * 21 bytes, so parsing it whole is not the thing this file exists to avoid.
 * A missing cursor is fatal BEFORE anything commits it — the rows stay, the
 * cursor does not move, and the next launch redoes the zip.
 */
function readCursor(bytes: number[]): string {
  if (bytes.length === 0) {
    throw new Error(`[sync] archive carried no ${CURSOR_ENTRY}.json`);
  }

  const value: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(bytes)));
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`[sync] ${CURSOR_ENTRY}.json was not a string`);
  }

  return value;
}
