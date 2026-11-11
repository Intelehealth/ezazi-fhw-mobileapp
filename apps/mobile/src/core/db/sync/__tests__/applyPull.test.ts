import { eq } from 'drizzle-orm';

import { VISIT_HOLDER } from '@/core/db/constants/visit';
import { APP_STATE_ID } from '@/core/db/init';
import { appStateRepo } from '@/core/db/repositories';
import {
  appState,
  encounter,
  location,
  obs,
  patient,
  provider,
  visit,
  visitAttribute,
} from '@/core/db/schema';
import { SYNC_CLEAN } from '@/core/db/syncFlags';
import { transact, type DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import { applyPull, type PullPayload } from '../applyPull';

/**
 * The pull apply. Two things matter more than the field mapping: everything
 * lands in one transaction, and the cursor can never outrun the rows.
 */

const EPOCH = '2006-08-22 22:21:48 ';
const RETURNED = '2026-11-10 06:30:00 ';

const FULL: PullPayload = {
  pullexecutedtime: RETURNED,
  patientlist: [
    {
      uuid: 'p1',
      firstname: 'Asha',
      lastname: 'Devi',
      dateofbirth: '1996-04-02',
      address1: 'House 4',
      address2: 'Near the well',
      dateCreated: '2026-10-02 08:15:00',
    },
  ],
  patientAttributeTypeListMaster: [{ uuid: 't1', name: 'Bed Number' }],
  patientAttributesList: [
    { uuid: 'a1', patientuuid: 'p1', person_attribute_type_uuid: 't1', value: '7' },
  ],
  locationlist: [{ locationuuid: 'loc1', name: 'Ward A', retired: 0 }],
  providerlist: [{ uuid: 'dr1', given_name: 'R', family_name: 'K', role: 'nurse' }],
  providerAttributeList: [
    { uuid: 'pa1', provideruuid: 'dr1', attributetypeuuid: 'at1', value: 'x', voided: 0 },
  ],
  visitlist: [{ uuid: 'v1', patientuuid: 'p1', locationuuid: 'loc1', creator_uuid: 'dr1' }],
  encounterlist: [{ uuid: 'e1', visituuid: 'v1', encounter_type_uuid: 'type1', provider_uuid: 'dr1' }],
  obslist: [
    {
      uuid: 'o1',
      encounteruuid: 'e1',
      conceptuuid: 'c1',
      value: '120',
      obsDatetime: '2026-11-09 10:00:00',
      obsServerModifiedDate: '2026-11-09 10:05:00',
    },
  ],
  // A REAL type. With an unwhitelisted one the row is skipped and the old
  // assertion of 1 passed on the input count while nothing was written.
  visitAttributeList: [
    {
      uuid: 'va1',
      visit_uuid: 'v1',
      visit_attribute_type_uuid: VISIT_HOLDER,
      value: 'y',
      voided: 0,
    },
  ],
};

describe('applyPull', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    db.insert(appState).values({ id: APP_STATE_ID }).run();
  });

  afterEach(() => ctx.close());

  it('writes every table from one payload', () => {
    const result = applyPull(FULL, db);

    expect(result).toMatchObject({
      patients: 1,
      patientAttributes: 1,
      attributeTypes: 1,
      visits: 1,
      encounters: 1,
      observations: 1,
      locations: 1,
      providers: 1,
      providerAttributes: 1,
      visitAttributes: 1,
      cursor: RETURNED,
    });
  });

  it('lands server rows CLEAN, so the push does not send them straight back', () => {
    applyPull(FULL, db);

    expect(ctx.db.select().from(patient).where(eq(patient.uuid, 'p1')).get()?.sync).toBe(SYNC_CLEAN);
    expect(ctx.db.select().from(visit).where(eq(visit.uuid, 'v1')).get()?.sync).toBe(SYNC_CLEAN);
    expect(ctx.db.select().from(encounter).where(eq(encounter.uuid, 'e1')).get()?.sync).toBe(
      SYNC_CLEAN,
    );
    expect(ctx.db.select().from(obs).where(eq(obs.uuid, 'o1')).get()?.sync).toBe(SYNC_CLEAN);
  });

  it('maps the names that differ between the wire and our columns', () => {
    applyPull(FULL, db);

    expect(ctx.db.select().from(patient).where(eq(patient.uuid, 'p1')).get()).toMatchObject({
      first_name: 'Asha',
      last_name: 'Devi',
      date_of_birth: '1996-04-02',
      address1: 'House 4',
      address2: 'Near the well',
      // Patient lists order by this, and nothing local ever writes it.
      dateCreated: '2026-10-02 08:15:00',
    });
    // creator_uuid on the wire, creator in the column.
    expect(ctx.db.select().from(visit).where(eq(visit.uuid, 'v1')).get()?.creator).toBe('dr1');
    // obsDatetime on the wire, created_date in the column.
    expect(ctx.db.select().from(obs).where(eq(obs.uuid, 'o1')).get()).toMatchObject({
      created_date: '2026-11-09 10:00:00',
      obsservermodifieddate: '2026-11-09 10:05:00',
    });
    expect(ctx.db.select().from(location).where(eq(location.locationuuid, 'loc1')).get()?.name).toBe(
      'Ward A',
    );
    expect(ctx.db.select().from(provider).where(eq(provider.uuid, 'dr1')).get()?.role).toBe('nurse');
  });

  it('keeps every column a real providerlist row carries', () => {
    // Verbatim from the 2026-11-11 archive. 14 keys; imagePath is not one of
    // them, so it must stay NULL — it is a device-local path.
    applyPull(
      {
        providerlist: [
          {
            role: 'Organizational: Doctor',
            useruuid: 'a4ac4fee-538f-11e6-9cfe-86f436325720',
            emailId: 'NA',
            telephoneNumber: 'NA',
            providerId: '3',
            given_name: 'Super',
            family_name: 'User',
            voided: 0,
            gender: 'M',
            dateofbirth: '2000-07-06',
            uuid: 'f9badd80-ab76-11e2-9e96-0800200c9a66',
            identifier: 'UNKNOWN',
            middle_name: 'v',
            countryCode: 'NA',
          },
        ],
      },
      db,
    );

    const row = ctx.db
      .select()
      .from(provider)
      .where(eq(provider.uuid, 'f9badd80-ab76-11e2-9e96-0800200c9a66'))
      .get();

    expect(row).toMatchObject({
      identifier: 'UNKNOWN',
      given_name: 'Super',
      middle_name: 'v',
      family_name: 'User',
      gender: 'M',
      dateofbirth: '2000-07-06',
      emailId: 'NA',
      telephoneNumber: 'NA',
      countryCode: 'NA',
      role: 'Organizational: Doctor',
      useruuid: 'a4ac4fee-538f-11e6-9cfe-86f436325720',
      providerId: '3',
      voided: 0,
    });
    expect(row?.imagePath).toBeNull();
  });

  it('moves the cursor to what the server returned', () => {
    expect(appStateRepo.getPullCursor(db)).toBe(EPOCH);

    applyPull(FULL, db);

    expect(appStateRepo.getPullCursor(db)).toBe(RETURNED);
  });

  it('rolls the CURSOR back with the rows when anything later throws', () => {
    // The legacy writes the cursor first and separately. That is how records
    // get skipped permanently.
    expect(() =>
      transact((tx) => {
        applyPull(FULL, tx);
        throw new Error('later failure');
      }, db),
    ).toThrow('later failure');

    expect(appStateRepo.getPullCursor(db)).toBe(EPOCH);
    expect(ctx.db.select().from(patient).all()).toEqual([]);
    expect(ctx.db.select().from(obs).all()).toEqual([]);
  });

  it('leaves the cursor alone when the response carries no watermark', () => {
    applyPull({ patientlist: [{ uuid: 'p1', firstname: 'Asha' }] }, db);

    expect(appStateRepo.getPullCursor(db)).toBe(EPOCH);
  });

  it('is a no-op on an empty payload', () => {
    const result = applyPull({}, db);

    expect(result.patients).toBe(0);
    expect(result.cursor).toBeNull();
    expect(appStateRepo.getPullCursor(db)).toBe(EPOCH);
  });

  it('warns about keys it does not know instead of dropping them silently', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    applyPull({ ...FULL, somethingNew: [1, 2] } as PullPayload, db);

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('counts visit attributes WRITTEN, not received, and says what it skipped', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = applyPull(
      {
        ...FULL,
        visitAttributeList: [
          { uuid: 'va9', visit_uuid: 'v1', visit_attribute_type_uuid: 'vt1', value: 'y', voided: 0 },
        ],
      },
      db,
    );

    expect(result.visitAttributes).toBe(0);
    expect(ctx.db.select().from(visitAttribute).all()).toEqual([]);
    // The logger prefixes a timestamp, so the message is the SECOND argument.
    expect(warn).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('skipped'), [
      'vt1',
    ]);
    warn.mockRestore();
  });

  it('does NOT write the two arrays we drop on purpose', () => {
    // providerAttributeTypeList and visitAttributeTypeList map to no table.
    const result = applyPull(
      { ...FULL, providerAttributeTypeList: [{}], visitAttributeTypeList: [{}] } as PullPayload,
      db,
    );

    expect(result.providerAttributes).toBe(1);
    expect(result.visitAttributes).toBe(1);
  });
});
