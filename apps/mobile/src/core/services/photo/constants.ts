// One flat directory under Paths.document, one file per patient named by the
// patient uuid. The legacy made a DIRECTORY per patient (IMAGE_PATH/<uuid>/)
// and then wrote a single file into it — the port does not carry that, because
// a patient structurally cannot have two profile photos and tbl_image_records
// keys on the patient uuid for the same reason.
//
// Paths.document is app-private and survives eviction, unlike Paths.cache —
// the same reasoning as the sync archive (core/api/archive.api.ts). A photo
// the system deleted would leave patient_photo pointing at nothing.
export const PHOTO_DIRECTORY = 'patient-photos';
export const PHOTO_EXTENSION = 'jpg';

// expo-image-picker takes 0..1; the legacy captured at quality 100.
//
// NOTE: ROADMAP_NEXT records a "two-quality split" in the legacy capture that
// is deliberate and must not be lost by defaulting. That split belongs to the
// capture screen and nothing here has the detail of it, so this is the single
// quality the registration photo uses. Revisit when the split is specified.
export const PHOTO_QUALITY = 1;
