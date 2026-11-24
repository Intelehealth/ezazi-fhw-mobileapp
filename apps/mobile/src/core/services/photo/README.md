# `core/services/photo` — patient profile photo capture

Two functions. Opens the camera or the gallery, copies what comes back to a file
named after the patient, and deletes that file again when a registration is
abandoned.

## Public surface

```ts
capturePhoto(source: 'camera' | 'gallery', patientUuid: string): Promise<string | null>
deletePatientPhoto(patientUuid: string): Promise<void>
```

Import from `@/core/services/photo`, never from `./photo` or `./constants`.

## Files

| File | Role |
|---|---|
| `constants.ts` | the directory name, the extension, the capture quality |
| `photo.ts` | both functions, and `photoFile()` — the one place the on-disk name is decided |
| `index.ts` | the public surface |
| `__tests__/photo.test.ts` | 12 tests over an in-memory filesystem |

## Why it is built this way

**The service owns the path.** No caller ever builds `patient-photos/<uuid>.jpg`.
If they did, capture and delete could drift apart and the discard would
silently leave the file behind. It is also why `capturePhoto` takes the patient
uuid rather than returning a path the caller must remember — the uuid is enough
to find the file later, which is what the discard path has.

**One flat directory, one file per patient.** The legacy made a *directory* per
patient (`IMAGE_PATH/<uuid>/`) and wrote one file into it. Not carried: a
patient structurally cannot have two profile photos, which is the same reason
`tbl_image_records` keys on the patient uuid.

**`Paths.document`, not `Paths.cache`.** App-private and survives eviction —
the same reasoning as the sync archive in `core/api/archive.api.ts`. A photo the
system deleted would leave `patient_photo` pointing at nothing.

**A retake deletes before it copies.** `copy` onto an existing file is not
defined to replace it, so without the delete the first photo survives and the
field points at the old one.

**`deletePatientPhoto` is best effort and never throws.** Its only caller is the
discard path. A failed delete must not stop a registration being abandoned —
the alternative is a user trapped on a form they asked to leave because a file
was locked. It logs and resolves.

**Cancel is not an error.** `capturePhoto` returns `null`, and the caller leaves
any existing photo untouched. No toast, no error state.

## What is NOT here

**No UI.** eslint forbids a service importing `core/ui`. The Camera / Gallery
chooser is `core/ui/PhotoSourceDialog.tsx`, rendered by the screen; this module
only acts on a choice already made.

**No permission flow.** `CAMERA`, `READ_MEDIA_IMAGES` and the storage
permissions are declared in `app.config.js` and requested up front by
`SplashScreen` through `core/utils/permissions.ts`, before any screen renders.

**No `use<Name>(enabled)` hook**, unlike `monitor/` and `batteryGuard/`. This
service is not long-lived and has nothing to start or stop at the composition
root — it is two functions called in response to a tap.

**No database write.** Capture returns a path and nothing else. Writing
`patient_photo` and the `tbl_image_records` row belongs to the save path, work
item 6.

## Known gap

`ROADMAP_NEXT` records a deliberate **two-quality split** in the legacy capture
that "would be lost by default". Nothing available specifies what the split is,
so `PHOTO_QUALITY` is a single value (1, the legacy's 100). Revisit when the
split is specified; it belongs here rather than at a call site.

## Tests

`npx jest src/core/services/photo`

The native modules are mocked at the top of the test file in the house style.
`expo-file-system` is replaced with an in-memory filesystem — a `Set` of
existing uris that the tests drive — so the copy target, the directory creation
and the retake delete can all be asserted without touching disk.
