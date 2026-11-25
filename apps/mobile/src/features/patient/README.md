# patient registration

Ported from `elcg-fhw-mobileapp`'s `activities/addNewPatient` package. Built, not
stubbed — a completed registration writes a `tbl_patient` row, its attributes
and its profile-image record.

| Ticket | Screen | File | Legacy |
|---|---|---|---|
| — | Personal details | `screens/PatientPersonalInfoScreen.tsx` | `PatientPersonalInfoFragment` |
| — | Address details | `screens/PatientAddressInfoScreen.tsx` | `PatientAddressInfoFragment` |
| — | the chrome both sit in | `components/RegistrationStepLayout.tsx` | `AddNewPatientActivity` |

*(No ticket numbers: this port was planned in `.notes/PATIENT_REGISTRATION_PORT.md`
rather than against a sprint ticket. Fill the column in if one is raised.)*

## The shape, and why it is not the legacy's

`AddNewPatientActivity` is **one** Activity holding **one** `FrameLayout`. It
swaps the two fragments with `.replace()` and no back stack, and both fragments
mutate the **same** `PatientDTO` held in `PatientRegistrationDraft.kt` — so
anything a step forgot to copy back before navigating was lost.

Here the two halves are named and separate:

```
domain/        personalInfoForm.schema.ts   AddressInfoForm.schema.ts
               addressMaster.ts  +  state_district_tehsil.json
stores/        registrationDraft.store.ts   { mode, patientUuid, startedAt, personal, address, isSaving }
data/          registration.repository.ts   the mapper — the ONE place a field becomes a column
components/    the chrome, shared by both screens
screens/       one file per step, plus addressLayoutSeam.ts
```

Each screen owns only its own half; the store parks both; the repository turns
the pair into a row. "Which column does this field become" lives in one file.

## The seam

```
screen → registrationDraft.store → registration.repository → core/useCases/patientWrites → SQLite
```

A screen **cannot** import `features/*/data` — eslint blocks presentation from
reaching the data layer, which is why the store sits in the middle rather than
the button calling the repository. The store is also where the in-flight guard
lives: `patientUuid` is a fixed primary key, so a double tap is a collision, not
a second patient.

## Deliberate deviations from the legacy

| The legacy | Here | Why |
|---|---|---|
| Mints the patient uuid lazily, inside `resolveUuid()` | Minted on entry, in `startRegistration` | The Activity had no entry hook that owned the draft; a store does. Removes every "does a uuid exist yet" check |
| Validates on every keystroke, with rules that disagree with its own submit rules | `reValidateMode: 'onSubmit'` plus `clearErrors` on type | The house pattern. The legacy's live and submit rules genuinely differed — a field of spaces passed submit |
| Writes attribute rows BEFORE the patient row they point at | Parent first, one `transact()` | Only safe there because `PRAGMA foreign_keys` is off. Enabling it would fail every legacy registration |
| Writes an attribute with `''` as its type uuid when the lookup misses | Skips the row and logs | Those rows resolve to nothing on read-back and ship an empty type on push |
| Hardware back abandons from either step | Guarded on step 1 only | The legacy had no back stack, so system back could only mean "leave". Here step 2 sits on step 1, and the Back button already means "step back" |
| Village restricted to 52 ASCII letters | Spaces, hyphens and apostrophes allowed | "Navi Mumbai" could not be typed |
| Three steps on one build flavour | Two | The obstetric step is visit/encounter/obs data now, collected on its own screen |

## What is NOT here

- **Edit mode.** The store, schemas and repository all take a `mode` flag, and
  `decodeCityVillage` exists for it, but nothing reaches edit yet — there is no
  patient detail or search screen to enter from.
- **Any push.** A saved patient sits `SYNC_DIRTY`. The sync module still has no
  production caller and `PushContext.locationUuid` has no producer.
- **The Privacy Notice step.** Skipped for now; Home's Add Patient button goes
  straight to step 1. Restoring it is that one destination changing back.
- **Gender and country as form fields.** Gender is a write-side `'F'` constant in
  `createPatient`; country comes from `clientConfig.countryName`. Both render as
  disabled fields and neither is in a schema.

## Where the detail lives

`.notes/PATIENT_REGISTRATION_PORT.md` is the plan and the settled decisions —
read its "Conflicts between the two design docs" section before changing
anything shared. `.notes/PATIENT_PERSONAL_INFO_PLAN.md` and
`.notes/PATIENT_ADDRESS_INFO_PLAN.md` hold the field-level design per screen.

## Tests

```
npx jest src/features/patient src/core/services/photo
```

`data/__tests__/registration.repository.test.ts` is the one that matters: it
drives a filled draft into a real in-memory SQLite built from the shipped
`drizzle/` journal, so it fails if the migrations drift from `schema.ts`.
