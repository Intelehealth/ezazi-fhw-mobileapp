import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import { profileService } from '../../services/profile.service';
import { showToast } from '../../services/toast';

export interface UpdateProfileImageInput {
  personUuid: string;
  file: File;
}

/** ProfileService.updateProfileImage expects raw base64, without the `data:image/...;base64,` prefix FileReader adds. */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

async function performUpdate({
  personUuid,
  file,
}: UpdateProfileImageInput): Promise<void> {
  const base64EncodedImage = await readFileAsBase64(file);
  const result = await profileService.updateProfileImage({
    person: personUuid,
    base64EncodedImage,
  });
  if (!result.ok) throw result.error;
}

/** Ports profile.component.ts's preview()/ProfileService.updateProfileImage — reads the chosen file as base64 and uploads it. */
export function useUpdateProfileImage() {
  const queryClient = useQueryClient();

  return useMutation<void, Error | ApiError, UpdateProfileImageInput>({
    mutationFn: performUpdate,
    onSuccess: () => {
      showToast(
        'Photo Updated',
        'Your profile photo has been saved.',
        'success'
      );
      void queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
    },
    onError: error => {
      showToast('Upload Failed', error.message, 'error');
    },
  });
}
