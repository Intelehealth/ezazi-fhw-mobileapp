import { env } from '../config/env';
import { ROUTES } from '../routes/paths';

/**
 * What survives a hard session expiry so the user can pick up where they
 * left off after logging in again: the page they were on and the unsaved
 * contents of any form that registered itself. Kept in sessionStorage (gone
 * when the tab closes, never shared across tabs) and tagged with the user it
 * belongs to — a different person logging in on the same tab must never see
 * the previous user's drafts or be sent to their page.
 */
const SNAPSHOT_KEY = 'ezazi_web_session_snapshot';

interface SessionSnapshot {
  userUuid: string;
  returnTo: string | null;
  drafts: Record<string, unknown>;
}

type DraftReader = () => unknown;

const draftReaders = new Map<string, DraftReader>();

/** Lets a form hand over its unsaved values when the session expires; returns the unregister function. */
export function registerFormDraft(key: string, read: DraftReader): () => void {
  draftReaders.set(key, read);
  return () => {
    if (draftReaders.get(key) === read) draftReaders.delete(key);
  };
}

/** The in-app path (without the deployment base path) to return to, or null for anything unsafe or pointless. */
function currentReturnPath(): string | null {
  const { pathname, search, hash } = window.location;
  const path =
    env.BASE_PATH && pathname.startsWith(env.BASE_PATH)
      ? pathname.slice(env.BASE_PATH.length) || '/'
      : pathname;

  const authBase = ROUTES.AUTH.BASE;
  const isAuthPage = path === authBase || path.startsWith(`${authBase}/`);
  if (!path.startsWith('/') || path.startsWith('//') || isAuthPage) return null;
  return `${path}${search}${hash}`;
}

function readSnapshot(): SessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as SessionSnapshot) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: SessionSnapshot | null): void {
  try {
    if (snapshot)
      sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    else sessionStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* Storage full or blocked: the user just logs in without the restore. */
  }
}

/** Captures the current page and every registered form's values, to be restored after the next login. */
export function saveSessionSnapshot(userUuid: string): void {
  const drafts: Record<string, unknown> = {};
  draftReaders.forEach((read, key) => {
    drafts[key] = read();
  });
  writeSnapshot({ userUuid, returnTo: currentReturnPath(), drafts });
}

/** The saved draft for `key`, once — only if it belongs to `userUuid`. */
export function takeFormDraft(key: string, userUuid: string): unknown {
  const snapshot = readSnapshot();
  if (
    !snapshot ||
    snapshot.userUuid !== userUuid ||
    !(key in snapshot.drafts)
  ) {
    return null;
  }
  const draft = snapshot.drafts[key];
  delete snapshot.drafts[key];
  writeSnapshot(snapshot);
  return draft;
}

/**
 * The page to send the user back to after login — only if the same user is
 * logging back in. A different user gets nothing, and the previous user's
 * snapshot is discarded outright.
 */
export function takeReturnPath(userUuid: string): string | null {
  const snapshot = readSnapshot();
  if (!snapshot) return null;
  if (snapshot.userUuid !== userUuid) {
    writeSnapshot(null);
    return null;
  }
  const { returnTo } = snapshot;
  snapshot.returnTo = null;
  writeSnapshot(snapshot);
  return returnTo;
}

export function clearSessionSnapshot(): void {
  writeSnapshot(null);
}
