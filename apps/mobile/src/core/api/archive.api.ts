import { ApiError, failure, success } from '@ezazi/api-client';
import { File, Paths } from 'expo-file-system';

import { env } from '@/core/config/env';
import type { DownloadArchive } from '@/core/db/sync/transport';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { logger } from '@/core/utils/logger';

/**
 * The first-sync archive download.
 *
 * It does NOT use `core/api/client.ts`. That instance is a JWT bearer against
 * the auth gateway; this is Basic auth against the clinical server, which is a
 * different host. It does not use axios at all — `File.downloadFileAsync` is a
 * native download that streams to disk, which is the whole point: the archive
 * is never held in memory, here or in `readArchive`.
 *
 * The route is the legacy's, built the same way at `SyncDAO.java:106`. elcg
 * gets JSON from it; this deployment answers with a zip.
 */

/**
 * Fixed, so a crash mid-apply leaves a file the next launch can find without
 * having to remember anything. `Paths.document` is app-private and survives
 * eviction, unlike `Paths.cache` — a half-applied archive the system deleted
 * would strand the import.
 */
export const ARCHIVE_FILENAME = 'pulldata.zip';

export function archiveFile(): File {
  return new File(Paths.document, ARCHIVE_FILENAME);
}

/** The path of an archive left behind by an interrupted run, if there is one. */
export function existingArchive(): string | null {
  const file = archiveFile();
  return file.exists ? file.uri : null;
}

/**
 * Only safe once the cursor has moved — `readArchive` commits it last, so a
 * cursor past the epoch means every row landed. Delete before that and a crash
 * loses records the server will never resend.
 */
export function deleteArchive(): void {
  const file = archiveFile();
  if (file.exists) file.delete();
}

function pullUrl(locationUuid: string, cursor: string): string {
  // encodeURI, not encodeURIComponent: the cursor carries spaces AND colons,
  // and the legacy hands the raw string to Retrofit, whose HttpUrl escapes the
  // spaces but leaves colons alone. encodeURIComponent would escape both and
  // change the path the server sees.
  return `${env.SERVER_URL}/EMR-Middleware/webapi/pull/pulldata/${locationUuid}/${encodeURI(cursor)}`;
}

export const downloadArchive: DownloadArchive = async (cursor) => {
  const [locationUuid, credential] = await Promise.all([
    secureStorage.get('locationUuid'),
    secureStorage.get('basicCredential'),
  ]);

  // Both are written together at login. Missing means this device never
  // finished Setup, which is a bug in the caller, not a server failure.
  if (!locationUuid || !credential) {
    return failure(
      new ApiError('api', 'Cannot download the archive before setup has stored a location', {
        code: 'SETUP_INCOMPLETE',
      }),
    );
  }

  try {
    const file = await File.downloadFileAsync(pullUrl(locationUuid, cursor), archiveFile(), {
      headers: { Authorization: credential },
      // A zip from an interrupted run is replaced rather than throwing. The
      // caller decides whether to download at all — see existingArchive().
      idempotent: true,
    });

    logger.info('[sync] archive downloaded', { bytes: file.size });
    return success(file.uri);
  } catch (error: unknown) {
    // Not an axios error, so mapAxiosError does not apply. The native module
    // throws one opaque error for every failure, so this cannot honestly claim
    // a tier it has not established.
    logger.info('[sync] archive download failed', error);
    return failure(
      new ApiError('network', 'The archive download did not complete', {
        code: 'ARCHIVE_DOWNLOAD_FAILED',
        cause: error,
      }),
    );
  }
};
