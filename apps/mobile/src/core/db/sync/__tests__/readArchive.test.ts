import { strToU8, zipSync } from 'fflate';

import { APP_STATE_ID } from '@/core/db/init';
import { appStateRepo } from '@/core/db/repositories';
import { appState, location, patient, provider } from '@/core/db/schema';
import type { DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import { ARCHIVE_CHUNK_BYTES, readArchive } from '../readArchive';

/**
 * The first-sync archive. What matters is that entries route by filename, that
 * the cursor commits LAST and only once everything landed, and that an entry
 * bigger than one read still arrives whole.
 */

let mockBytes: Uint8Array = new Uint8Array(0);
let mockReads = 0;

jest.mock('expo-file-system', () => ({
  FileMode: { ReadOnly: 'r' },
  File: class {
    open() {
      let offset = 0;
      return {
        get offset() {
          return offset;
        },
        set offset(next: number) {
          offset = next;
        },
        readBytes(length: number) {
          mockReads += 1;
          const slice = mockBytes.subarray(offset, offset + length);
          offset += slice.length;
          return slice;
        },
        close() {
          /* nothing to release in the fake */
        },
      };
    }
  },
}));

/** The real entry order, measured from the 2026-11-11 archive. Contents are not. */
const ENTRY_ORDER = [
  'patientlist.json',
  'patientAttributesList.json',
  'visitlist.json',
  'visitAttributeList.json',
  'encounterlist.json',
  'obslist.json',
  'locationlist.json',
  'patientAttributeTypeListMaster.json',
  'visitAttributeTypeList.json',
  'providerlist.json',
  'providerAttributeTypeList.json',
  'providerAttributeList.json',
  'conceptAttributeTypeList.json',
  'conceptAttributeList.json',
  'pullexecutedtime.json',
];

const CURSOR = '2026-11-11 06:37:48';
const EPOCH = '2006-08-22 22:21:48 ';

function buildArchive(overrides: Record<string, unknown> = {}): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  for (const name of ENTRY_ORDER) {
    const fallback: unknown = name === 'pullexecutedtime.json' ? CURSOR : [];
    const value = name in overrides ? overrides[name] : fallback;
    files[name] = strToU8(JSON.stringify(value));
  }

  return zipSync(files, { level: 6 });
}

/** xorshift32, base36. Deterministic, and compresses poorly enough to be useful. */
function noise(seed: number): string {
  let value = seed + 1;
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    value ^= value << 13;
    value >>>= 0;
    value ^= value >> 17;
    value ^= value << 5;
    value >>>= 0;
    out += value.toString(36).padStart(7, '0');
  }
  return out;
}

/**
 * Grows against the ZIPPED size, not the row count — how well the fixture
 * compresses is not something a test should have to predict.
 */
function archiveSpanningReads(): { bytes: Uint8Array; rows: Row[] } {
  const rows: Row[] = [];
  let bytes = buildArchive({ 'locationlist.json': rows });

  while (bytes.length < ARCHIVE_CHUNK_BYTES + 8 * 1024) {
    const target = Math.max(800, Math.round(rows.length * 1.5));
    while (rows.length < target) {
      rows.push({ locationuuid: `loc-${String(rows.length)}`, name: noise(rows.length) });
    }
    bytes = buildArchive({ 'locationlist.json': rows });
  }

  return { bytes, rows };
}

interface Row {
  locationuuid: string;
  name: string;
}

describe('readArchive', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db as unknown as DbHandle;
    db.insert(appState).values({ id: APP_STATE_ID }).run();
    mockReads = 0;
  });

  afterEach(() => {
    ctx.close();
  });

  it('routes each entry onto its table by filename', async () => {
    mockBytes = buildArchive({
      'locationlist.json': [{ locationuuid: 'loc-1', name: 'Ward A' }],
      'providerlist.json': [{ uuid: 'prov-1', given_name: 'Provider', family_name: 'One' }],
      'patientlist.json': [{ uuid: 'pat-1', openmrs_id: 'ID-1' }],
    });

    const result = await readArchive('archive.zip', db);

    expect(ctx.db.select().from(location).all()).toHaveLength(1);
    expect(ctx.db.select().from(provider).all()).toHaveLength(1);
    expect(ctx.db.select().from(patient).all()).toHaveLength(1);
    expect(result).toEqual({ entries: 15, rows: 3, cursor: CURSOR });
  });

  it('commits the cursor the archive carried, not the device clock', async () => {
    mockBytes = buildArchive();

    await readArchive('archive.zip', db);

    expect(appStateRepo.getPullCursor(db)).toBe(CURSOR);
  });

  it('carries an entry that spans more than one read', async () => {
    const { bytes, rows } = archiveSpanningReads();
    mockBytes = bytes;

    const result = await readArchive('archive.zip', db);

    // Guards the fixture itself: compression must not shrink it back to one read.
    expect(mockBytes.length).toBeGreaterThan(ARCHIVE_CHUNK_BYTES);
    expect(mockReads).toBeGreaterThan(1);
    expect(result.rows).toBe(rows.length);
    expect(ctx.db.select().from(location).all()).toHaveLength(rows.length);
    // Builds a zip past one read and inserts every row, so it is the one test
    // here that is genuinely heavy. Explicit beats flaky under worker load.
  }, 30_000);

  it('drains the entries we model no table for', async () => {
    mockBytes = buildArchive({
      'conceptAttributeList.json': [{ uuid: 'c-1' }],
      'visitAttributeTypeList.json': [{ uuid: 't-1' }],
    });

    await expect(readArchive('archive.zip', db)).resolves.toMatchObject({ entries: 15, rows: 0 });
  });

  it('refuses a file that is not a zip, before writing anything', async () => {
    mockBytes = strToU8('<html>504 Gateway Timeout</html>');

    await expect(readArchive('archive.zip', db)).rejects.toThrow(/not a zip/);
    expect(appStateRepo.getPullCursor(db)).toBe(EPOCH);
  });

  it('leaves the cursor alone when the archive carries no watermark', async () => {
    // The rows still land. The cursor NOT moving is what makes the next launch
    // redo the zip rather than skip the records it never applied.
    mockBytes = buildArchive({
      'pullexecutedtime.json': '',
      'locationlist.json': [{ locationuuid: 'loc-1', name: 'Ward A' }],
    });

    await expect(readArchive('archive.zip', db)).rejects.toThrow(/pullexecutedtime/);
    expect(ctx.db.select().from(location).all()).toHaveLength(1);
    expect(appStateRepo.getPullCursor(db)).toBe(EPOCH);
  });
});
