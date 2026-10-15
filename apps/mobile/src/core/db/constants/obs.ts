/**
 * Concept uuids — every value here is written to `tbl_obs.conceptuuid`.
 * Ported verbatim from the legacy `UuidDictionary.java`; never re-derive a uuid
 * by hand. Grouped by where the obs is captured, because the Java file's own
 * sections do not match actual usage. Encounter types live in `encounter.ts`.
 */

// Captured on the general clinical screens, outside the labour timeline.
export const CURRENT_COMPLAINT = '3edb0e09-9135-481e-b8f0-07a26fa9a5ce';
export const PHYSICAL_EXAMINATION = 'e1761e85-9b50-48ae-8c4d-e6b7eeeba084';
export const WEIGHT = '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const RESPIRATORY = '5242AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const SPO2 = '5092AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const RHK_MEDICAL_HISTORY_BLURB = '62bff84b-795a-45ad-aae1-80e7f5163a82';
export const RHK_FAMILY_HISTORY_BLURB = 'd63ae965-47fb-40e8-8f08-1f46a8a60b2b';
export const FOLLOW_UP_VISIT = 'e8caffd6-5d22-41c4-8d6a-bc31a44d0c86';
export const OCCUPATION = '5fe2ef6f-bbf7-45df-a6ea-a284aee82ddc';

// Written by the doctor on the telemedicine/consultation path.
export const TELEMEDICINE_DIAGNOSIS = '537bb20d-d09d-4f88-930b-cc45c7d662df';
export const COMPLEX_IMAGE_AD = '07a816ce-ffc0-49b9-ad92-a1bf9bf5e2ba';
export const COMPLEX_IMAGE_PE = '200b7a45-77bc-4986-b879-cc727f5f7d5b';

// Timeline — supportive care offered to the woman during labour.
export const COMPANION = '5090AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const PAIN_RELIEF = '9d313f72-538f-11e6-9cfe-86f436325720';
export const ORAL_FLUID = '9d31451b-538f-11e6-9cfe-86f436325720';
export const POSTURE = '9d3148b1-538f-11e6-9cfe-86f436325720';

// Timeline — fetal observations.
export const BASELINE_FHR = '9d315400-538f-11e6-9cfe-86f436325720';
export const FHR_DECELERATION = '9d31573c-538f-11e6-9cfe-86f436325720';
export const AMNIOTIC_FLUID = '9d3160a6-538f-11e6-9cfe-86f436325720';
export const FETAL_POSITION = '9d316387-538f-11e6-9cfe-86f436325720';
export const CAPUT = '9d316761-538f-11e6-9cfe-86f436325720';
export const MOULDING = '9d316823-538f-11e6-9cfe-86f436325720';

// Timeline — maternal vitals.
export const PULSE = '5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const SYSTOLIC_BP = '5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const DIASTOLIC_BP = '5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const TEMPERATURE = '5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const URINE_PROTEIN = '9d3168a7-538f-11e6-9cfe-86f436325720';
// Not in UuidDictionary.java: the legacy wrote it inline (PartogramConstants.java:75, 287).
export const URINE_ACETONE = '968f9bc2-b33d-4daf-b59f-79d9a899e018';

// Timeline — labour progress, the partogram plot inputs.
export const CONTRACTIONS_PER_10MIN = '9d316929-538f-11e6-9cfe-86f436325720';
export const DURATION_OF_CONTRACTION = '9d3169af-538f-11e6-9cfe-86f436325720';
export const CERVIX_PLOT_X = '9d316ab5-538f-11e6-9cfe-86f436325720';
export const DESCENT_PLOT_0 = '9d316d41-538f-11e6-9cfe-86f436325720';

// Timeline — medication administered.
export const OXYTOCIN_UL_DROPS_MIN = '9d316d82-538f-11e6-9cfe-86f436325720';
export const MEDICINE = 'c38c0c50-2fd2-4ae3-b7ba-7dd25adca4ca';
export const IV_FLUIDS = '98c5881f-b214-4597-83d4-509666e9a7c9';

// Timeline — shared decision making, and the missed-checkpoint marker.
export const ASSESSMENT = '67a050c1-35e5-451c-a4ab-fff9d57b0db1';
export const PLAN = '162169AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
// Not in UuidDictionary.java: the legacy wrote it inline (PartogramConstants.java:84, 448).
export const SUPERVISOR_DOCTOR = '7a9cb7bc-9ab9-4ff0-ae82-7a1bd2cca93e';
export const MISSED_ENCOUNTER = '35c3afdd-bb96-4b61-afb9-22a5fc2d088e';

// Referral out to another facility.
export const REFER_TYPE = '9414cc17-1f97-4a27-8066-17591c11e513';
export const REFER_HOSPITAL = '0092c193-8025-4ede-8aab-8a2db731da51';
export const REFER_DR_NAME = 'd9625aed-c5ee-4d5c-92b1-ee3782e31ef3';
export const REFER_NOTE = '9965063f-ec0c-4a58-bfba-5ca4ac53129c';

// Birth outcome, recorded when the second stage ends.
export const BIRTH_OUTCOME = '23601d71-50e6-483f-968d-aeef3031346d';
export const BIRTH_WEIGHT = 'debdcf33-e565-466a-aca1-6d98a8441553';
export const APGAR_1_MIN = '8f218b75-2576-45a3-b6e6-1429dede71bd';
export const APGAR_5_MIN = 'f3925225-f792-4a6e-b890-5f6fb3941c1d';
export const SEX = '7f6ceddb-3a9b-4917-b783-c174b95ea7d4';
export const BABY_STATUS = '4a1edd41-ffda-4da8-93e0-cc7af502b80e';
export const MOTHER_STATUS = '69a33fc0-8bc2-4828-80d2-7e55dedd89f3';
export const MOTHER_DECEASED = '91c94e0b-b967-4dd0-9eec-75d770af7f5b';
export const MOTHER_DECEASED_FLAG = '0a3d26ec-bdb8-4a27-badb-937f730bf89d';
export const NEONATAL_DEATH = 'dfa09987-96f2-46ae-846b-972f88b898a2';
export const NEWBORN_DISCHARGE_TYPE = '6f461764-e68b-47c0-9459-6f5c13292551';

// Free-text and bookkeeping written alongside the end-of-stage-2 capture.
export const ENCOUNTER_TYPE = 'd1fb190a-9ebb-448f-8d61-dfeeb20fd931';
export const OUT_OF_TIME = '893b3d20-171b-4023-a6f5-3d3bdf81a094';
export const LABOUR_OTHER = 'ac99754c-d3a9-4736-a8b8-276c78953315';
export const END_2ND_STAGE_OTHER = 'd319ebbc-5260-4eff-aa3f-2af11b177ec4';
export const SOS_STAGE_HOUR = '2c3fb8df-b844-4e4c-8852-40917a98eef8';

// Prescriptions captured at the end of the second stage.
export const MEDICINE_PRESCRIBED = 'ce75ed49-0eac-44f0-ac91-bcf9c5d1d700';
export const OXYTOCIN_PRESCRIBED = '6eef8ae6-e6b3-46f1-a58c-393bd6d0e8c8';
export const IV_FLUID_PRESCRIBED = '0c21f925-d225-48ce-9e98-bb1cc5638e04';

// Ongoing complications, read by the ward filter.
export const ONGOING_COMPLICATIONS_MOTHER = 'caa174fc-5889-443e-b53d-701fb2e85c23';
export const ONGOING_COMPLICATIONS_NEWBORN = '820ae093-d3ab-402a-9a81-279963cf9dc8';

// Patient exit survey answers.
export const RATING = '78284507-fb71-4354-9b34-046ab205e18f';
export const COMMENTS = '36d207d6-bee7-4b3e-9196-7d053c6eddce';

/**
 * Admission — the 15 values this module records as obs under ENCOUNTER_ADMISSION.
 * They were patient attributes before the multi-visit migration. Written here only;
 * there is no attribute fallback on read. See ROADMAP "Admission data lives in OBS".
 */
export const OBS_GRAVIDA = 'd970452f-eb7a-47c7-b011-ba9af33b3f9d';
export const OBS_PARITY = 'cc09f7b9-fcb4-4b5f-8e71-c7c0e0e4e0f4';
export const OBS_LMP = '8ef57af0-9ca2-44e9-b4b3-f990fe28c456';
export const OBS_EDD = 'ebe6635d-8bae-4f3c-b40a-f9dddb7ebe49';
export const OBS_ADMISSION_DATE = '5a30d1f7-75b2-4bac-87c2-7da0aab70a88';
export const OBS_ADMISSION_TIME = 'b05023c9-00d0-465d-b665-d62833689f75';
export const OBS_PRIMARY_DOCTOR = 'f62de70b-15ae-42e7-b653-2c7f23cd2317';
export const OBS_SECONDARY_DOCTOR = '5ae1ae98-6733-4c0d-b1bc-398ae5fea0ac';
export const OBS_HOSPITAL_ID = '88a3aff6-93a7-4772-916e-e42d86840770';
export const OBS_BED_NUMBER = 'ca48020c-e459-4523-8a89-72c6e2db713f';
export const OBS_HOSPITAL_MATERNITY = '0d2aac3a-4358-4987-b653-85536d83d723';
export const OBS_RISK_FACTORS = '2b09cbf9-dbba-4b4e-a442-411841dc1fd3';
export const OBS_ACTIVE_LABOR_DIAGNOSED = '43069207-3e32-4e18-920f-2a33e7a83fda';
export const OBS_MEMBRANE_RUPTURED_TIMESTAMP = 'fad90749-ed23-4efb-b6ed-f1b68a60ba2a';
export const OBS_LABOR_ONSET = '8b54e92e-2213-4b3e-8dd3-a8bc57141e25';

/** The 15 above, in the order the Admission screen captures them. */
export const ADMISSION_CONCEPTS = [
  OBS_ADMISSION_DATE,
  OBS_ADMISSION_TIME,
  OBS_GRAVIDA,
  OBS_PARITY,
  OBS_LMP,
  OBS_EDD,
  OBS_LABOR_ONSET,
  OBS_ACTIVE_LABOR_DIAGNOSED,
  OBS_MEMBRANE_RUPTURED_TIMESTAMP,
  OBS_RISK_FACTORS,
  OBS_HOSPITAL_MATERNITY,
  OBS_HOSPITAL_ID,
  OBS_BED_NUMBER,
  OBS_PRIMARY_DOCTOR,
  OBS_SECONDARY_DOCTOR,
] as const;
