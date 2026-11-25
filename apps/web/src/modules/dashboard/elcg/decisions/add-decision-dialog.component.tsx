import type { LcgDecisionEditor, LcgDecisionKind } from '../elcg.types';
import type { ObsChange } from './decision.rows';
import { IvFluidDecisionDialogComponent } from './iv-fluid-decision-dialog.component';
import { MedicationDecisionDialogComponent } from './medication-decision-dialog.component';
import { NoteDecisionDialogComponent } from './note-decision-dialog.component';
import { OxytocinDecisionDialogComponent } from './oxytocin-decision-dialog.component';

interface AddDecisionDialogComponentProps {
  kind: LcgDecisionKind;
  decisions: LcgDecisionEditor;
  viewerUuid: string | null;
  isSaving: boolean;
  onSave: (changes: ObsChange[]) => void;
  onClose: () => void;
}

/**
 * The dialog behind each "Add" of the Shared Decision Making card —
 * CoreService's openAddAssessmentModal / openPrescribePlanModal /
 * openPrescribeMedicationModal / openPrescribeOxytocinModal /
 * openPrescribeIVFluidModal.
 */
export function AddDecisionDialogComponent({
  kind,
  decisions,
  ...props
}: AddDecisionDialogComponentProps) {
  switch (kind) {
    case 'assessment':
    case 'plan':
      return (
        <NoteDecisionDialogComponent
          kind={kind}
          source={decisions[kind]}
          {...props}
        />
      );
    case 'medication':
      return (
        <MedicationDecisionDialogComponent
          source={decisions.medication}
          {...props}
        />
      );
    case 'oxytocin':
      return (
        <OxytocinDecisionDialogComponent
          source={decisions.oxytocin}
          {...props}
        />
      );
    case 'ivFluids':
      return (
        <IvFluidDecisionDialogComponent
          source={decisions.ivFluids}
          {...props}
        />
      );
  }
}
