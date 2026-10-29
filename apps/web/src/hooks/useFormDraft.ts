import { useEffect } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { useAppSelector } from '../store/hooks';
import { registerFormDraft, takeFormDraft } from '../utils/session-snapshot';

interface UseFormDraftOptions<T extends FieldValues> extends Pick<
  UseFormReturn<T>,
  'getValues' | 'reset'
> {
  /** Turn on while the form holds unsaved edits (e.g. edit mode), so a read-only view isn't snapshotted. */
  enabled: boolean;
  /** Called after a saved draft was put back into the form (e.g. to switch to edit mode). */
  onRestore?: () => void;
}

/**
 * Form-state preservation across a hard session expiry. While `enabled`, the
 * form is registered so its values are captured the moment the session
 * expires; on mount, a draft saved for this user under `key` is restored
 * into the form once. Never use this for password fields — drafts sit in
 * sessionStorage.
 */
export function useFormDraft<T extends FieldValues>(
  key: string,
  { enabled, getValues, reset, onRestore }: UseFormDraftOptions<T>
): void {
  const userUuid = useAppSelector(state => state.auth.user?.uuid);

  useEffect(() => {
    if (!userUuid) return;
    const draft = takeFormDraft(key, userUuid);
    if (draft) {
      reset(draft as T);
      onRestore?.();
    }
    /* Restores once, when the form first mounts for this user. */
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [key, userUuid]);

  useEffect(() => {
    if (!enabled) return;
    return registerFormDraft(key, () => getValues());
  }, [key, enabled, getValues]);
}
