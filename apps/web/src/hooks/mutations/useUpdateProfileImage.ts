import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import { profileService } from '../../services/profile.service';
import type { ProviderProfileData } from '../queries/useProviderProfile';
import { showToast } from '../../services/toast';

export interface UpdateProfileImageInput {
  personUuid: string;
  file: File;
}

/** Reads the image as a full `data:image/...;base64,` URL (the preview); the upload payload strips the prefix. */
function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.85;

/**
 * Camera photos are several MB, and base64 adds ~33% — enough for the
 * server in front of OpenMRS to reject the POST with 413. Avatars render at
 * ~80px, so downscale to MAX_DIMENSION before encoding. Falls back to the
 * original file when the browser can't decode/resize it.
 */
async function downscaleImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Resolves to the data URL that was uploaded, so the UI can show it right away. */
async function performUpdate({
  personUuid,
  file,
}: UpdateProfileImageInput): Promise<string> {
  const dataUrl = await readFileAsDataUrl(await downscaleImage(file));
  const result = await profileService.updateProfileImage({
    person: personUuid,
    base64EncodedImage: dataUrl.slice(dataUrl.indexOf(',') + 1),
  });
  if (!result.ok) throw result.error;
  return dataUrl;
}

/**
 * Ports profile.component.ts's preview()/ProfileService.updateProfileImage.
 * Like the Angular source (and hw-profile.component.ts), the uploaded image
 * itself becomes the displayed photo (`profilePicUrl = reader.result`) rather
 * than re-requesting `/personimage/<uuid>`, whose URL never changes and so
 * stays cached by the browser. It is written into the shared
 * ['provider-profile'] query, so the profile page and the header avatar both
 * update together.
 */
export function useUpdateProfileImage() {
  const queryClient = useQueryClient();

  return useMutation<string, Error | ApiError, UpdateProfileImageInput>({
    mutationFn: performUpdate,
    onSuccess: dataUrl => {
      showToast(
        'Photo Updated',
        'Your profile photo has been saved.',
        'success'
      );
      queryClient.setQueriesData<ProviderProfileData>(
        { queryKey: ['provider-profile'] },
        previous =>
          previous && {
            ...previous,
            profile: { ...previous.profile, photoUrl: dataUrl },
          }
      );
    },
    onError: error => {
      showToast('Upload Failed', error.message, 'error');
    },
  });
}
