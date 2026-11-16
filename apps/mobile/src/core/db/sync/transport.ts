import type { ApiResult } from '@ezazi/api-client';

/**
 * The seams between the sync code and the network.
 *
 * Nothing under `core/db/sync` makes a network call: every piece is handed a
 * function matching one of these. This file declares the shapes so both sides
 * are written against the same contract instead of meeting at run time.
 * `pullAllPages.ts` already does it this way with its own `FetchPullPage`.
 *
 * They return `ApiResult`, not a bare promise and not a throw. That is the
 * contract every api module in this app already returns, and it keeps
 * `mapAxiosError`'s network/timeout/unauthorized/server tiers intact at the
 * seam — a bare throw flattens them into one failure the caller cannot act on.
 */

/**
 * Fetches the first-sync archive and returns WHERE IT LANDED, never its bytes.
 *
 * A `Uint8Array` would be the whole archive in memory, which is the thing
 * `readArchive` exists to avoid. A path is also the archive's durable
 * identity: if the apply crashes part-way the zip is still on disk, and the
 * next launch has a file to find rather than a handle it no longer holds.
 *
 * The caller owns the destination, so the fresh-download and crash-resume
 * paths look at the same place. AMC does the same — `DownloadMindMaps` takes
 * its destination as an argument and rebuilds the same constant to delete it.
 *
 * `cursor` is the watermark, passed in rather than read here, so the transport
 * needs no database handle. On a first sync it is `PULL_EPOCH` — the legacy
 * sends exactly that, because `SessionManager.getPullExcutedTime()` defaults
 * to the same string rather than to an empty segment.
 */
export type DownloadArchive = (cursor: string) => Promise<ApiResult<string>>;
