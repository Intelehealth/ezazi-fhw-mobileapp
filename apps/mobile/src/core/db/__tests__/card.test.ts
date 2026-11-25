import { NORMAL_CARD_MARKER, PRIVACY_NOTICE_VALUE } from '@ezazi/clinical-rules';

import { writeCard } from '../card';
import { encounterTypeUuid } from '../constants/encounter';
import { ENCOUNTER_TYPE } from '../constants/obs';
import { encounter, obs } from '../schema';
import { SYNC_DIRTY, VOIDED_NO } from '../syncFlags';
import { transact, type DbHandle } from '../tx';
import { createTestDb, type TestDb } from './helpers/testDb';

/** Every card writer goes through writeCard: one encounter and its marker, in one transaction. */

const WRITER = { providerUuid: 'provider-1', creatorUuid: 'user-1' };
const CARD = {
  visitUuid: 'visit-1',
  cardName: 'Stage1_Hour1_2',
  encounterTime: '2026-10-27 10:07:32',
  privacyNoticeValue: PRIVACY_NOTICE_VALUE,
  marker: NORMAL_CARD_MARKER,
};

describe('writeCard', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  it('writes the card as the provider, and its marker as the user, both unsynced', () => {
    const uuid = transact((tx) => writeCard(CARD, WRITER, tx), db);

    expect(db.select().from(encounter).all()).toEqual([
      expect.objectContaining({
        uuid,
        visituuid: CARD.visitUuid,
        encounter_type_uuid: encounterTypeUuid(CARD.cardName),
        encounter_time: CARD.encounterTime,
        provider_uuid: WRITER.providerUuid,
        privacynotice_value: PRIVACY_NOTICE_VALUE,
        voided: VOIDED_NO,
        sync: SYNC_DIRTY,
      }),
    ]);
    expect(db.select().from(obs).all()).toEqual([
      expect.objectContaining({
        encounteruuid: uuid,
        conceptuuid: ENCOUNTER_TYPE,
        value: NORMAL_CARD_MARKER,
        comment: null,
        creator: WRITER.creatorUuid,
        creatoruuid: WRITER.creatorUuid,
        voided: VOIDED_NO,
        sync: SYNC_DIRTY,
      }),
    ]);
  });

  it('writes neither row for an unknown card name', () => {
    expect(() => transact((tx) => writeCard({ ...CARD, cardName: 'Stage9_Hour1_1' }, WRITER, tx), db)).toThrow();

    expect(db.select().from(encounter).all()).toEqual([]);
    expect(db.select().from(obs).all()).toEqual([]);
  });
});
