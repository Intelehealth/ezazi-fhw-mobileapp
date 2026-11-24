import { Directory, File, Paths } from 'expo-file-system';
import { launchCameraAsync, launchImageLibraryAsync } from 'expo-image-picker';

import { logger } from '@/core/utils/logger';

import { PHOTO_DIRECTORY, PHOTO_EXTENSION, PHOTO_QUALITY } from './constants';

/**
 * Patient profile photo capture and deletion.
 *
 * THE SERVICE OWNS THE PATH. Neither caller ever builds
 * `patient-photos/<uuid>.jpg` itself — if they did, capture and delete could
 * drift apart and the discard would silently leave the file behind. That is
 * also why `capturePhoto` takes the patient uuid rather than returning a path
 * the caller then has to remember: the uuid is enough to name the file, so the
 * discard path can find it later knowing only the uuid.
 *
 * No UI in here. eslint forbids a service importing core/ui, and the
 * Camera/Gallery chooser is `core/ui/PhotoSourceDialog.tsx`, rendered by the
 * screen. This module only acts on a choice already made.
 *
 * No permission flow either. CAMERA, READ_MEDIA_IMAGES and the storage
 * permissions are declared in app.config.js and requested up front by
 * SplashScreen via core/utils/permissions.ts, before any screen renders.
 */

export type PhotoSource = 'camera' | 'gallery';

/** The one place the on-disk name is decided. */
function photoFile(patientUuid: string): File {
  return new File(Paths.document, PHOTO_DIRECTORY, `${patientUuid}.${PHOTO_EXTENSION}`);
}

/**
 * Opens the camera or the gallery and copies what comes back to the patient's
 * own file, returning its uri.
 *
 * Returns `null` when the user cancels — which is NOT an error and must not be
 * surfaced as one. A cancelled capture leaves any existing photo untouched.
 */
export async function capturePhoto(
  source: PhotoSource,
  patientUuid: string,
): Promise<string | null> {
  const result =
    source === 'camera'
      ? await launchCameraAsync({ quality: PHOTO_QUALITY })
      : await launchImageLibraryAsync({ quality: PHOTO_QUALITY });

  if (result.canceled) return null;

  const picked = result.assets[0];
  if (!picked) return null;

  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  if (!directory.exists) directory.create();

  const target = photoFile(patientUuid);

  // Retaking overwrites. `copy` onto an existing file is not defined to
  // replace it, so the old one goes first — otherwise a retake could leave
  // the first photo in place and the field pointing at it.
  if (target.exists) target.delete();

  new File(picked.uri).copy(target);

  return target.uri;
}

/**
 * Deletes the patient's photo, if there is one.
 *
 * BEST EFFORT, BY DESIGN: it swallows its own errors and always resolves. The
 * only caller is the discard path, where a failed delete must not stop the
 * registration being abandoned — the alternative is a user trapped on a form
 * they asked to leave because a file was locked.
 */
export async function deletePatientPhoto(patientUuid: string): Promise<void> {
  try {
    const file = photoFile(patientUuid);
    if (file.exists) file.delete();
  } catch (error) {
    logger.info('[photo] could not delete the patient photo', error);
  }
}
