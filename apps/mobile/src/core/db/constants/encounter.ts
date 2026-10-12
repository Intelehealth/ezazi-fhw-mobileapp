/**
 * Encounter type uuids — THE single source. Every value written to or matched
 * against `tbl_encounter.encounter_type_uuid` is here, with the name it is
 * known by. There is no `tbl_uuid_dictionary` any more: it held exactly this
 * mapping, and keeping both meant keeping them in step. Concepts: `obs.ts`.
 *
 * The NAME is a structured code, not a label — `Stage1_Hour1_1` is stage 1,
 * hour 1, card 1. Callers split it or prefix-match it, which is why the
 * stage groupings below are derived from the names rather than hand-listed.
 */

// The clinical encounters a visit is made of.
export const ENCOUNTER_ADULTINITIAL = '8d5b27bc-c2cc-11de-8d13-0010c6dffd0f';
export const ENCOUNTER_VITALS = '67a71486-1a54-468f-ac3e-7091a9a79584';
export const ENCOUNTER_VISIT_NOTE = 'd7151f82-c1f3-4152-a605-2f9ea7414a79';

// Bookkeeping encounters. Excluded from "the latest real clinical encounter".
export const ENCOUNTER_VISIT_COMPLETE = 'bd1fbfaa-f5fb-4ebd-b75c-564506fc309e';
export const ENCOUNTER_PATIENT_EXIT_SURVEY = '629a9d0b-48eb-405e-953d-a5964c88dc30';
export const ENCOUNTER_ADMISSION = 'e22e39fd-7db2-45e7-80f1-60fa0d5a4378';
export const LCG_SOS = '6ce3e2eb-35d4-4aa2-aa77-6d1d3b3f524a';

// Labour-stage markers. Filed among concepts in the Java, matched on encounter_type_uuid.
export const STAGE1_HOUR1_1 = 'ee560d18-34a1-4ad8-87c8-98aed99c663d';
export const STAGE3_HOUR1_1 = 'e58b22d1-b09e-4cda-b05c-a45d1e63d390';
export const DELIVERY_OUTCOME_STAGE3 = 'c5f95c0f-a499-4792-9ee0-ff138d8df425';

/**
 * Every encounter type, uuid to name. The 57 rows with no constant above are
 * the stage/hour grid and `EMERGENCY`: nothing writes or matches them by name,
 * so they need no identifier — but they DO need a name, because the risk read
 * and the timeline both group by stage.
 */
export const ENCOUNTER_TYPE_NAMES: Readonly<Record<string, string>> = {
  "ca5f5dc3-4f0b-4097-9cae-5cf2eb44a09c": "EMERGENCY",
  [ENCOUNTER_ADULTINITIAL]: "ENCOUNTER_ADULTINITIAL",
  [ENCOUNTER_VITALS]: "ENCOUNTER_VITALS",
  [ENCOUNTER_VISIT_NOTE]: "ENCOUNTER_VISIT_NOTE",
  [ENCOUNTER_PATIENT_EXIT_SURVEY]: "ENCOUNTER_PATIENT_EXIT_SURVEY",
  [STAGE1_HOUR1_1]: "Stage1_Hour1_1",
  "a367b296-601f-474b-afa4-c6989ef43f77": "Stage1_Hour1_2",
  "f540fdfb-9ad5-4b44-ae35-b941863b3439": "Stage1_Hour2_1",
  "ae69e6f0-7bf4-4981-8742-c59ad0040630": "Stage1_Hour2_2",
  "b89a6a89-a61d-4416-ae3e-ec527db3607a": "Stage1_Hour3_1",
  "ec2a1d58-c6f8-4aca-a182-e986d1cf6f15": "Stage1_Hour3_2",
  "62bc5735-ea58-4a6d-b818-11de18134f55": "Stage1_Hour4_1",
  "c20ab5de-b694-483b-bd31-2a0d84ffe32d": "Stage1_Hour4_2",
  "0b52a5ba-63dd-432f-9dec-856e4bb1e2f8": "Stage1_Hour5_1",
  "6be7c08e-1c99-4c25-826e-ce0fd4819b25": "Stage1_Hour5_2",
  "6730fd1e-82d7-4d2f-98c7-c5798edfd20e": "Stage1_Hour6_1",
  "ea1bbd4a-5e59-4124-bd0f-aefe7095abaf": "Stage1_Hour6_2",
  "769c612f-88d7-4d23-8288-4c8bb107cbd1": "Stage1_Hour7_1",
  "9e3b1576-726f-4963-9d7e-9a8b543273c1": "Stage1_Hour7_2",
  "4e947877-1dde-4c5e-bf0b-7c26995a7966": "Stage1_Hour8_1",
  "92d6cc84-a720-4106-8519-f474c4a7cca9": "Stage1_Hour8_2",
  "f3641f3f-a83e-47c7-b734-e11be3998836": "Stage1_Hour9_1",
  "b8611dbb-5ea4-4839-a6a4-d33e5866d087": "Stage1_Hour9_2",
  "e91e88fe-6282-42c5-93fe-2646b995983d": "Stage1_Hour10_1",
  "596207d9-0d7a-4835-bdd2-3f2c9f8c34be": "Stage1_Hour10_2",
  "dd9612ad-6781-41ee-8579-180b99be87dd": "Stage1_Hour11_1",
  "736ec5de-d780-4e34-a1cb-2de28702b0de": "Stage1_Hour11_2",
  "03ecf7c8-0750-4916-9c2d-466509ae28e7": "Stage1_Hour12_1",
  "9d83f930-6d7f-4cbb-8bfc-b5ef34b2f584": "Stage1_Hour12_2",
  "4084c5f1-09e8-403f-b09c-7b2fe99b23e7": "Stage1_Hour13_1",
  "2cf6fe27-1ee1-4ecd-bf88-fff8c4aeda68": "Stage1_Hour13_2",
  "c6d5a64a-14df-4566-9af1-183f6631b5ef": "Stage1_Hour14_1",
  "1acfc60a-8051-4849-aa89-e0a432b56189": "Stage1_Hour14_2",
  "e9da98fd-6348-4cb3-8a8e-b7c2c17296ef": "Stage1_Hour15_1",
  "bee652b3-432a-4488-a34e-00e09d6f6103": "Stage1_Hour15_2",
  "558cc1b8-c352-4b27-9ec2-131fc19c26f0": "Stage2_Hour1_1",
  "91a68b35-fc73-455d-9841-e0d2d726a973": "Stage2_Hour1_2",
  "49cb3bd8-26b3-47f8-b6da-743dbbf1a2db": "Stage2_Hour1_3",
  "4911f731-0c60-406a-bad5-d76f133ad535": "Stage2_Hour1_4",
  "402ab3f5-9e79-4e1c-bb51-4126cc3d10c0": "Stage2_Hour2_1",
  "93d8e600-1bd4-4ab4-a57b-b615eb96f05e": "Stage2_Hour2_2",
  "79d6bb12-e6d7-4d26-9641-405a88fbf57a": "Stage2_Hour2_3",
  "88e2c40f-996b-4031-8550-ad59f192ffee": "Stage2_Hour2_4",
  "0f4249c5-aa59-4d16-8b94-9b6ecf8dcbf7": "Stage2_Hour3_1",
  "76bdffcb-fd80-486c-9295-9dd874e88512": "Stage2_Hour3_2",
  "8800c3d1-7213-4498-87df-a8cb857a4064": "Stage2_Hour3_3",
  "d623832d-ea49-42e3-a33d-223407cfc1ce": "Stage2_Hour3_4",
  "b78b613b-daee-4ae6-92b0-cb1951afffe8": "Stage2_Hour4_1",
  "19365146-6bcd-4c79-9ebe-b12395d3e34c": "Stage2_Hour4_2",
  "c1ee353f-80ff-4e7b-a1d0-6b0fbed2bea9": "Stage2_Hour4_3",
  "f5900299-989c-450c-8b7f-7ce8dc213210": "Stage2_Hour4_4",
  "c9f20f1c-bf9f-4dd4-a009-bac9efffd5b4": "Stage2_Hour5_1",
  "ada81344-4a25-4b9b-9f63-7602673194e4": "Stage2_Hour5_2",
  "5a58c6dc-f009-4adc-a650-5a435799bc84": "Stage2_Hour5_3",
  "081e0959-ce88-414d-b4be-f6c1593395aa": "Stage2_Hour5_4",
  [LCG_SOS]: "LCG_SOS",
  [STAGE3_HOUR1_1]: "Stage3_Hour1_1",
  "2c112cc2-3922-400e-9dd9-11b27fc76404": "Stage3_Hour1_2",
  "83ddb485-4d99-4efa-b7c9-8a2aab14c868": "Stage3_Hour1_3",
  "45d3680e-b368-4a05-8ae5-e0baa31b1973": "Stage3_Hour1_4",
  "3d71ad42-7b6e-4687-b096-f0dd89e84647": "Stage3_Hour2_1",
  "3b3960f4-c9d2-4d41-aed9-f376312fc33e": "Stage3_Hour2_2",
  "0ca40a73-3581-47ae-9cb2-0c6cde17158e": "Stage3_Hour3_1",
  "746e8cc9-e8e8-4055-87a2-2687888c7f88": "Stage3_Hour4_1",
  [DELIVERY_OUTCOME_STAGE3]: "DELIVERY_OUTCOME_STAGE3",
  [ENCOUNTER_ADMISSION]: "ENCOUNTER_ADMISSION",
  [ENCOUNTER_VISIT_COMPLETE]: "ENCOUNTER_VISIT_COMPLETE",
};

/** The name for one encounter type, or null. Pure — no database involved. */
export function encounterTypeName(typeUuid: string): string | null {
  return ENCOUNTER_TYPE_NAMES[typeUuid] ?? null;
}

const typesNamed = (matches: (name: string) => boolean): readonly string[] =>
  Object.entries(ENCOUNTER_TYPE_NAMES)
    .filter(([, name]) => matches(name))
    .map(([uuid]) => uuid);

/**
 * Stage groupings for the risk read, which used to ask SQL for
 * `ud.name LIKE 'Stage3_%'` against the dictionary. Same sets, resolved here
 * instead, so the query can filter on `encounter_type_uuid` directly.
 */
export const STAGE_TYPES = typesNamed((name) => name.startsWith('Stage'));
export const STAGE_3_TYPES = typesNamed((name) => name.startsWith('Stage3_'));
export const STAGE_1_2_TYPES = typesNamed(
  (name) => name.startsWith('Stage1_') || name.startsWith('Stage2_'),
);

/**
 * Excluded when asking for the latest real clinical encounter on a visit.
 * One list rather than three literals repeated at each call site. Note the
 * timeline read excludes only the first TWO of these — it still shows SOS.
 */
export const NON_CLINICAL_ENCOUNTER_TYPES = [
  ENCOUNTER_VISIT_COMPLETE,
  ENCOUNTER_ADMISSION,
  LCG_SOS,
] as const;
