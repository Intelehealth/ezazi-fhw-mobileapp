import { sql } from 'drizzle-orm';

import { getDb } from '../index';
import { uuidDictionary } from '../schema';

import {
  DELIVERY_OUTCOME_STAGE3,
  ENCOUNTER_ADMISSION,
  ENCOUNTER_ADULTINITIAL,
  ENCOUNTER_PATIENT_EXIT_SURVEY,
  ENCOUNTER_VISIT_COMPLETE,
  ENCOUNTER_VISIT_NOTE,
  ENCOUNTER_VITALS,
  LCG_SOS,
  STAGE1_HOUR1_1,
  STAGE3_HOUR1_1,
} from '../constants/encounter';

import {
  VISIT_TELEMEDICINE,
} from '../constants/visit';

/**
 * Seed rows for `tbl_uuid_dictionary`, ported from
 * `InteleHealthDatabaseHelper.uuidInsert()`. The table answers ONE question:
 * what is this encounter type called? It is keyed on uuid, so it holds exactly
 * one name per uuid and cannot carry the app's full vocabulary — see below.
 *
 * SCOPE, set 2026-10-12: this table holds ENCOUNTER TYPES AND NOTHING ELSE.
 * Every read of it in the Android app is keyed on an encounter type - the two
 * that look like exceptions are not (`PatientsDAO.checkStage` takes an
 * encounter type uuid, and `EncounterDAO:699` is commented "this returns
 * Stagex_Hrx_x format encounter"). Android also seeded 23 obs concepts and 8
 * patient attribute types; nothing ever looked them up, and they are dropped
 * here. The obs concepts live in `constants/obs.ts`, the attribute types in
 * `constants/patient.ts`, and the server sends its own attribute-type list on
 * the pull.
 *
 * SHARED UUIDS IMPORT THEIR CONSTANT rather than repeating the literal, so each
 * one is written in exactly one place. The 56 `Stage*_Hour*_*` rows stay literal:
 * nothing else references them.
 *
 * SIX NAMES WERE CHANGED from the Android seed (2026-10-12, Arpan). Those uuids
 * are declared twice in `UuidDictionary.java` — once under a generic name
 * inherited from the project this was forked from, once under the labour-care
 * name. Every generic name has ZERO usages in the Android app; only the labour
 * name is live. We seed the live one: HEIGHT -> COMPANION,
 * JSV_MEDICATIONS -> MEDICINE, MEDICAL_ADVICE -> ASSESSMENT,
 * REQUESTED_TESTS -> BIRTH_OUTCOME, ADDITIONAL_COMMENTS -> PLAN,
 * SON_WIFE_DAUGHTER -> MISSED_ENCOUNTER.
 *
 * `EMERGENCY` keeps its name and stays a LITERAL, because it is the one row
 * here with no constant: nothing in this app writes or matches that uuid.
 * Android declares it twice (`EMERGENCY`, `EMERGENCY_OBS`) but never inserts
 * either — its only live use is a push-path guard, and its one insert path,
 * `EncounterDAO.setEmergency`, has zero callers. The row stays so the seed
 * still mirrors Android's 96 exactly.
 */
export const UUID_ENTRIES = [
  { uuid: 'ca5f5dc3-4f0b-4097-9cae-5cf2eb44a09c', name: 'EMERGENCY' },
  { uuid: ENCOUNTER_ADULTINITIAL, name: 'ENCOUNTER_ADULTINITIAL' },
  { uuid: ENCOUNTER_VITALS, name: 'ENCOUNTER_VITALS' },
  { uuid: ENCOUNTER_VISIT_NOTE, name: 'ENCOUNTER_VISIT_NOTE' },
  { uuid: ENCOUNTER_PATIENT_EXIT_SURVEY, name: 'ENCOUNTER_PATIENT_EXIT_SURVEY' },
  { uuid: VISIT_TELEMEDICINE, name: 'VISIT_TELEMEDICINE' },
  { uuid: STAGE1_HOUR1_1, name: 'Stage1_Hour1_1' },
  { uuid: 'a367b296-601f-474b-afa4-c6989ef43f77', name: 'Stage1_Hour1_2' },
  { uuid: 'f540fdfb-9ad5-4b44-ae35-b941863b3439', name: 'Stage1_Hour2_1' },
  { uuid: 'ae69e6f0-7bf4-4981-8742-c59ad0040630', name: 'Stage1_Hour2_2' },
  { uuid: 'b89a6a89-a61d-4416-ae3e-ec527db3607a', name: 'Stage1_Hour3_1' },
  { uuid: 'ec2a1d58-c6f8-4aca-a182-e986d1cf6f15', name: 'Stage1_Hour3_2' },
  { uuid: '62bc5735-ea58-4a6d-b818-11de18134f55', name: 'Stage1_Hour4_1' },
  { uuid: 'c20ab5de-b694-483b-bd31-2a0d84ffe32d', name: 'Stage1_Hour4_2' },
  { uuid: '0b52a5ba-63dd-432f-9dec-856e4bb1e2f8', name: 'Stage1_Hour5_1' },
  { uuid: '6be7c08e-1c99-4c25-826e-ce0fd4819b25', name: 'Stage1_Hour5_2' },
  { uuid: '6730fd1e-82d7-4d2f-98c7-c5798edfd20e', name: 'Stage1_Hour6_1' },
  { uuid: 'ea1bbd4a-5e59-4124-bd0f-aefe7095abaf', name: 'Stage1_Hour6_2' },
  { uuid: '769c612f-88d7-4d23-8288-4c8bb107cbd1', name: 'Stage1_Hour7_1' },
  { uuid: '9e3b1576-726f-4963-9d7e-9a8b543273c1', name: 'Stage1_Hour7_2' },
  { uuid: '4e947877-1dde-4c5e-bf0b-7c26995a7966', name: 'Stage1_Hour8_1' },
  { uuid: '92d6cc84-a720-4106-8519-f474c4a7cca9', name: 'Stage1_Hour8_2' },
  { uuid: 'f3641f3f-a83e-47c7-b734-e11be3998836', name: 'Stage1_Hour9_1' },
  { uuid: 'b8611dbb-5ea4-4839-a6a4-d33e5866d087', name: 'Stage1_Hour9_2' },
  { uuid: 'e91e88fe-6282-42c5-93fe-2646b995983d', name: 'Stage1_Hour10_1' },
  { uuid: '596207d9-0d7a-4835-bdd2-3f2c9f8c34be', name: 'Stage1_Hour10_2' },
  { uuid: 'dd9612ad-6781-41ee-8579-180b99be87dd', name: 'Stage1_Hour11_1' },
  { uuid: '736ec5de-d780-4e34-a1cb-2de28702b0de', name: 'Stage1_Hour11_2' },
  { uuid: '03ecf7c8-0750-4916-9c2d-466509ae28e7', name: 'Stage1_Hour12_1' },
  { uuid: '9d83f930-6d7f-4cbb-8bfc-b5ef34b2f584', name: 'Stage1_Hour12_2' },
  { uuid: '4084c5f1-09e8-403f-b09c-7b2fe99b23e7', name: 'Stage1_Hour13_1' },
  { uuid: '2cf6fe27-1ee1-4ecd-bf88-fff8c4aeda68', name: 'Stage1_Hour13_2' },
  { uuid: 'c6d5a64a-14df-4566-9af1-183f6631b5ef', name: 'Stage1_Hour14_1' },
  { uuid: '1acfc60a-8051-4849-aa89-e0a432b56189', name: 'Stage1_Hour14_2' },
  { uuid: 'e9da98fd-6348-4cb3-8a8e-b7c2c17296ef', name: 'Stage1_Hour15_1' },
  { uuid: 'bee652b3-432a-4488-a34e-00e09d6f6103', name: 'Stage1_Hour15_2' },
  { uuid: '558cc1b8-c352-4b27-9ec2-131fc19c26f0', name: 'Stage2_Hour1_1' },
  { uuid: '91a68b35-fc73-455d-9841-e0d2d726a973', name: 'Stage2_Hour1_2' },
  { uuid: '49cb3bd8-26b3-47f8-b6da-743dbbf1a2db', name: 'Stage2_Hour1_3' },
  { uuid: '4911f731-0c60-406a-bad5-d76f133ad535', name: 'Stage2_Hour1_4' },
  { uuid: '402ab3f5-9e79-4e1c-bb51-4126cc3d10c0', name: 'Stage2_Hour2_1' },
  { uuid: '93d8e600-1bd4-4ab4-a57b-b615eb96f05e', name: 'Stage2_Hour2_2' },
  { uuid: '79d6bb12-e6d7-4d26-9641-405a88fbf57a', name: 'Stage2_Hour2_3' },
  { uuid: '88e2c40f-996b-4031-8550-ad59f192ffee', name: 'Stage2_Hour2_4' },
  { uuid: '0f4249c5-aa59-4d16-8b94-9b6ecf8dcbf7', name: 'Stage2_Hour3_1' },
  { uuid: '76bdffcb-fd80-486c-9295-9dd874e88512', name: 'Stage2_Hour3_2' },
  { uuid: '8800c3d1-7213-4498-87df-a8cb857a4064', name: 'Stage2_Hour3_3' },
  { uuid: 'd623832d-ea49-42e3-a33d-223407cfc1ce', name: 'Stage2_Hour3_4' },
  { uuid: 'b78b613b-daee-4ae6-92b0-cb1951afffe8', name: 'Stage2_Hour4_1' },
  { uuid: '19365146-6bcd-4c79-9ebe-b12395d3e34c', name: 'Stage2_Hour4_2' },
  { uuid: 'c1ee353f-80ff-4e7b-a1d0-6b0fbed2bea9', name: 'Stage2_Hour4_3' },
  { uuid: 'f5900299-989c-450c-8b7f-7ce8dc213210', name: 'Stage2_Hour4_4' },
  { uuid: 'c9f20f1c-bf9f-4dd4-a009-bac9efffd5b4', name: 'Stage2_Hour5_1' },
  { uuid: 'ada81344-4a25-4b9b-9f63-7602673194e4', name: 'Stage2_Hour5_2' },
  { uuid: '5a58c6dc-f009-4adc-a650-5a435799bc84', name: 'Stage2_Hour5_3' },
  { uuid: '081e0959-ce88-414d-b4be-f6c1593395aa', name: 'Stage2_Hour5_4' },
  { uuid: LCG_SOS, name: 'LCG_SOS' },
  { uuid: STAGE3_HOUR1_1, name: 'Stage3_Hour1_1' },
  { uuid: '2c112cc2-3922-400e-9dd9-11b27fc76404', name: 'Stage3_Hour1_2' },
  { uuid: '83ddb485-4d99-4efa-b7c9-8a2aab14c868', name: 'Stage3_Hour1_3' },
  { uuid: '45d3680e-b368-4a05-8ae5-e0baa31b1973', name: 'Stage3_Hour1_4' },
  { uuid: '3d71ad42-7b6e-4687-b096-f0dd89e84647', name: 'Stage3_Hour2_1' },
  { uuid: '3b3960f4-c9d2-4d41-aed9-f376312fc33e', name: 'Stage3_Hour2_2' },
  { uuid: '0ca40a73-3581-47ae-9cb2-0c6cde17158e', name: 'Stage3_Hour3_1' },
  { uuid: '746e8cc9-e8e8-4055-87a2-2687888c7f88', name: 'Stage3_Hour4_1' },
  { uuid: DELIVERY_OUTCOME_STAGE3, name: 'DELIVERY_OUTCOME_STAGE3' },
  { uuid: ENCOUNTER_ADMISSION, name: 'ENCOUNTER_ADMISSION' },
  { uuid: ENCOUNTER_VISIT_COMPLETE, name: 'ENCOUNTER_VISIT_COMPLETE' },
];

export async function seedUuidDictionary(): Promise<void> {
  // INSERT OR REPLACE on the uuid PK, as Android does. IGNORE would leave an
  // install that seeded before the rename above stuck with the dead name.
  await getDb()
    .insert(uuidDictionary)
    .values(UUID_ENTRIES)
    .onConflictDoUpdate({ target: uuidDictionary.uuid, set: { name: sql`excluded.name` } });
}
