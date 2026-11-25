import type { LcgDecisionSource } from '../elcg.types';
import type { ObsChange } from './decision.rows';

/** What every Shared Decision Making dialog is opened with. */
export interface DecisionDialogProps<TEntry> {
  source: LcgDecisionSource<TEntry>;
  /** The signed-in OpenMRS user — their own entries on the latest encounter are editable. */
  viewerUuid: string | null;
  isSaving: boolean;
  /** A valid Save: the obs to create, update and void (possibly none). */
  onSave: (changes: ObsChange[]) => void;
  onClose: () => void;
}
