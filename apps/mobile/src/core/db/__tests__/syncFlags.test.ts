import { is } from 'drizzle-orm';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';

import { schema } from '../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO, VOIDED_YES } from '../syncFlags';

/**
 * Guards the schema ↔ constants contract. Nothing here asserts a literal against
 * itself; every case fails only if someone changes the schema and not the
 * constants, or adds a table with flags shaped differently from the other ten.
 */

const tables = Object.values(schema)
  .filter((t) => is(t, SQLiteTable))
  .map((t) => getTableConfig(t));

const having = (column: string) =>
  tables.flatMap((table) => {
    const found = table.columns.find((c) => c.name === column);
    return found ? [{ table, column: found }] : [];
  });

const syncColumns = having('sync');
const voidedColumns = having('voided');

describe('sync column', () => {
  it.each(syncColumns.map((e) => [e.table.name, e]))('%s is a non-null boolean', (_name, entry) => {
    const { column } = entry as (typeof syncColumns)[number];

    expect(column.columnType).toBe('SQLiteBoolean');
    expect(column.getSQLType()).toBe('integer');
    expect(column.notNull).toBe(true);
  });

  it.each(syncColumns.map((e) => [e.table.name, e]))('%s defaults to SYNC_DIRTY', (_name, entry) => {
    const { column } = entry as (typeof syncColumns)[number];

    // A row must start owed to the server, never silently already-clean.
    expect(column.hasDefault).toBe(true);
    expect(column.default).toBe(SYNC_DIRTY);
  });

  it.each(syncColumns.map((e) => [e.table.name, e]))('%s is indexed', (_name, entry) => {
    const { table } = entry as (typeof syncColumns)[number];

    // The push engine scans for dirty rows; an unindexed flag means a table scan.
    const indexed = table.indexes.some((i) =>
      i.config.columns.some((c) => 'name' in c && c.name === 'sync'),
    );
    expect(indexed).toBe(true);
  });
});

describe('voided column', () => {
  it.each(voidedColumns.map((e) => [e.table.name, e]))('%s is a non-null number', (_name, entry) => {
    const { column } = entry as (typeof voidedColumns)[number];

    // Must stay numeric: it is serialised onto the push body as a JSON number.
    expect(column.columnType).toBe('SQLiteInteger');
    expect(column.getSQLType()).toBe('integer');
    expect(column.notNull).toBe(true);
  });

  it.each(voidedColumns.map((e) => [e.table.name, e]))('%s defaults to VOIDED_NO', (_name, entry) => {
    const { column } = entry as (typeof voidedColumns)[number];

    expect(column.hasDefault).toBe(true);
    expect(column.default).toBe(VOIDED_NO);
  });
});

describe('constants match the column types they are written into', () => {
  it('sync constants are booleans and distinct', () => {
    expect(typeof SYNC_DIRTY).toBe('boolean');
    expect(typeof SYNC_CLEAN).toBe('boolean');
    expect(SYNC_CLEAN).not.toBe(SYNC_DIRTY);
  });

  it('voided constants are numbers and distinct', () => {
    // Catches a well-meaning '1' — a string would break the wire contract.
    expect(typeof VOIDED_NO).toBe('number');
    expect(typeof VOIDED_YES).toBe('number');
    expect(VOIDED_YES).not.toBe(VOIDED_NO);
  });
});

describe('coverage canary', () => {
  it('still covers 10 sync and 12 voided columns', () => {
    // Deliberately brittle: a changed count means a table gained or lost a flag.
    expect({ sync: syncColumns.length, voided: voidedColumns.length }).toEqual({
      sync: 10,
      voided: 12,
    });
  });
});
