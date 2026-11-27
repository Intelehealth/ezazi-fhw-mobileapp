import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INTEL_CARD_CLASS } from '../../../components/elcg/lcg-card.component';
import { DeliveryOutcomeComponent } from '../../../components/postpartum-report/delivery-outcome.component';
import { PostpartumDecisionsComponent } from '../../../components/postpartum-report/postpartum-decisions.component';
import { PostpartumMonitoringTableComponent } from '../../../components/postpartum-report/postpartum-monitoring-table.component';
import { usePostpartumReport } from '../../../hooks/queries/usePostpartumReport';
import { ROUTES } from '../../../routes/paths';
import { showToast } from '../../../services/toast';
import { useAppSelector } from '../../../store/hooks';
import { getApiErrorMessage } from '../../../utils/error-message';
import type { ObsChange } from '../elcg/decisions/decision.rows';
import { NoteDecisionDialogComponent } from '../elcg/decisions/note-decision-dialog.component';
import {
  latestEncounterColumn,
  postpartumDecisionSource,
  type PostpartumDecisionTarget,
} from './postpartum-report.decisions';
import type { PostpartumReportView } from './postpartum-report.types';

/* The decision being added, and the patient and encounter it records on. */
interface OpenDecision {
  target: PostpartumDecisionTarget;
  patientUuid: string;
  encounterUuid: string;
}

const SAVE_FAILED_MESSAGE =
  'Some changes could not be saved. Please check the report and try again.';

interface PostpartumReportComponentProps {
  visitUuid: string;
}

/*
 * The Postpartum Report — ports the reference app's stage3.component
 * (Early PostPartum Monitoring Report) for the Stage 3 (postpartum)
 * monitoring recorded after delivery: the delivery outcome, the maternal /
 * newborn monitoring grid and the mother / newborn decision history, with
 * "View eLCG" back to the guide. Each decision panel's "Add" opens the LCG's
 * own assessment / plan dialog, recording on the latest encounter
 * (addAssessment() / prescribePlan()).
 */
export function PostpartumReportComponent({
  visitUuid,
}: PostpartumReportComponentProps) {
  const navigate = useNavigate();
  const { report, saveDecision, isSavingDecision } =
    usePostpartumReport(visitUuid);
  const viewerUuid = useAppSelector(state => state.auth.user?.uuid ?? null);
  const [openDecision, setOpenDecision] = useState<OpenDecision | null>(null);

  function addDecision(
    report: PostpartumReportView,
    target: PostpartumDecisionTarget
  ) {
    const column = latestEncounterColumn(report);
    const encounterUuid =
      column === -1 ? null : report.columns[column].encounterUuid;
    if (!encounterUuid) {
      /* stage3.component.ts's ensureLatestEncounter() warning. */
      showToast(
        'No reading recorded yet',
        'No Stage 3 encounter found to save data.',
        'warning'
      );
      return;
    }
    setOpenDecision({ target, patientUuid: report.patientUuid, encounterUuid });
  }

  function saveOpenDecision({
    target,
    patientUuid,
    encounterUuid,
  }: OpenDecision) {
    return (changes: ObsChange[]) => {
      if (changes.length === 0) {
        setOpenDecision(null);
        return;
      }
      saveDecision(
        { target, patientUuid, encounterUuid, changes },
        {
          onSuccess: () => setOpenDecision(null),
          /* Closed either way: what did save is already on the refreshed report. */
          onError: error => {
            setOpenDecision(null);
            showToast(
              'Could not save',
              getApiErrorMessage(error, SAVE_FAILED_MESSAGE),
              'error'
            );
          },
        }
      );
    };
  }

  return (
    <div className={`${INTEL_CARD_CLASS} p-6`}>
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => navigate(`${ROUTES.DASHBOARD_ELCG}/${visitUuid}`)}
          className="cursor-pointer rounded-lg bg-[#2E1E91] p-2.5 text-sm font-bold text-white"
        >
          View eLCG
        </button>
      </div>

      {report ? (
        <>
          <DeliveryOutcomeComponent
            patient={report.patient}
            outcome={report.deliveryOutcome}
          />
          <PostpartumMonitoringTableComponent
            columns={report.columns}
            maternal={report.maternal}
            newborn={report.newborn}
          />
          <PostpartumDecisionsComponent
            report={report}
            onAdd={target => addDecision(report, target)}
          />

          {openDecision && (
            <NoteDecisionDialogComponent
              /* A fresh form for every opening. */
              key={`${openDecision.target.patient}-${openDecision.target.kind}`}
              kind={openDecision.target.kind}
              source={postpartumDecisionSource(report, openDecision.target)}
              viewerUuid={viewerUuid}
              isSaving={isSavingDecision}
              onSave={saveOpenDecision(openDecision)}
              onClose={() => setOpenDecision(null)}
            />
          )}
        </>
      ) : (
        <p
          role="status"
          className="m-0 py-16 text-center text-sm text-[#7F7B92]"
        >
          No postpartum monitoring has been recorded for this visit yet.
        </p>
      )}
    </div>
  );
}
