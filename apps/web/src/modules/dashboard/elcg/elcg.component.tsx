import { useEffect, useState } from 'react';
import { CLIENT_ID } from '../../../config/clients';
import { INTEL_CARD_CLASS } from '../../../components/elcg/lcg-card.component';
import { LcgTableComponent } from '../../../components/elcg/lcg-table.component';
import { LcgToolbarComponent } from '../../../components/elcg/lcg-toolbar.component';
import { LcgViewportComponent } from '../../../components/elcg/lcg-viewport.component';
import { SharedDecisionMakingComponent } from '../../../components/elcg/shared-decision-making.component';
import { VisitCompleteDetailsComponent } from '../../../components/elcg/visit-complete-details.component';
import { WebrtcControlsComponent } from '../../../components/elcg/webrtc-controls.component';
import { useElcgVisit } from '../../../hooks/queries/useElcgVisit';
import { getApiErrorMessage } from '../../../utils/error-message';
import type { ElcgView } from './elcg.types';

/**
 * ngx-panzoom's levels as partogram.component.ts configures it — 1.5× per
 * step, five steps, starting on the middle one (actual size).
 */
export const ZOOM_LEVELS = [1 / 2.25, 1 / 1.5, 1, 1.5, 2.25];
const DEFAULT_ZOOM_INDEX = 2;

function guideTitle(): string {
  return CLIENT_ID === 'nepal'
    ? 'Labour Care Guide Nepal'
    : 'WHO LABOUR CARE GUIDE VIEW';
}

/** partogram.component.ts's shareOnWhatsApp(): a wa.me link to this page. */
function shareOnWhatsApp(view: ElcgView) {
  const patientName = view.patient.name || 'Unknown patient';
  const patientId = view.patient.openMrsId || 'NA';
  const message = `Partogram details for ${patientName} (ID: ${patientId}).\n${window.location.href}`;
  window.open(
    `https://wa.me/?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

const LOAD_FAILED_MESSAGE = 'Could not load this visit. Please try again.';

/**
 * Loading / failure placeholder in place of the guide. `role` makes screen
 * readers announce it: "status" politely, "alert" at once.
 */
function GuideMessage({
  message,
  isError = false,
  onRetry,
}: {
  message: string;
  isError?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex flex-col items-center gap-3 py-16 text-center text-sm ${
        isError ? 'text-red-600' : 'text-[#7F7B92]'
      }`}
    >
      <p className="m-0">{message}</p>
      {isError && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-md border border-[#2E1E91] px-4 py-1.5 font-bold text-[#2E1E91]"
        >
          Retry
        </button>
      )}
    </div>
  );
}

interface ElcgComponentProps {
  visitUuid: string;
}

/**
 * Ports partogram.component.html — the WHO Labour Care Guide for one visit:
 * the toolbar, the zoomable guide, the Shared Decision Making history and,
 * once the visit is complete, its completion details.
 *
 * The visit comes from OpenMRS (see hooks/queries/useElcgVisit.ts). The
 * actions that need a modal or screen not yet ported — past visits, print,
 * adding/viewing decisions, Stage 3, video call and chat — get no handler,
 * so their components show them disabled with a "Coming soon" tooltip.
 * Zoom and WhatsApp sharing work as in Angular.
 */
export function ElcgComponent({ visitUuid }: ElcgComponentProps) {
  const { view, isLoading, error, retry } = useElcgVisit(visitUuid);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  /* Bumped by Reset: remounting the viewport drops its pan, like pan-zoom's resetView(). */
  const [viewResets, setViewResets] = useState(0);

  /*
   * A completed visit opens on its completion details, as Angular scrolls to
   * `#vcd` once it has read the Visit Complete encounter.
   */
  const hasCompletionReason = Boolean(view?.completion?.reason);
  useEffect(() => {
    if (!hasCompletionReason) return;
    document.getElementById('vcd')?.scrollIntoView?.();
  }, [hasCompletionReason]);

  if (!view) {
    return (
      <div className={`${INTEL_CARD_CLASS} p-6`}>
        {isLoading || !error ? (
          <GuideMessage message="Loading visit…" />
        ) : (
          <GuideMessage
            message={getApiErrorMessage(error, LOAD_FAILED_MESSAGE)}
            isError
            onRetry={retry}
          />
        )}
      </div>
    );
  }

  return (
    /* partogram.component.html's outer `.intel-card` > `.card-body`. */
    <div className={`${INTEL_CARD_CLASS} p-6`}>
      <LcgToolbarComponent
        pastVisitsCount={view.pastVisitsCount}
        canZoomIn={zoomIndex < ZOOM_LEVELS.length - 1}
        canZoomOut={zoomIndex > 0}
        onZoomIn={() =>
          setZoomIndex(index => Math.min(index + 1, ZOOM_LEVELS.length - 1))
        }
        onZoomOut={() => setZoomIndex(index => Math.max(index - 1, 0))}
        onZoomReset={() => {
          setZoomIndex(DEFAULT_ZOOM_INDEX);
          setViewResets(count => count + 1);
        }}
        onShareOnWhatsApp={() => shareOnWhatsApp(view)}
      />

      <LcgViewportComponent key={viewResets} zoom={ZOOM_LEVELS[zoomIndex]}>
        <LcgTableComponent title={guideTitle()} view={view} />
      </LcgViewportComponent>

      <SharedDecisionMakingComponent
        history={view.history}
        canAdd={view.completion === null}
      />

      {view.completion && (
        <VisitCompleteDetailsComponent completion={view.completion} />
      )}

      <WebrtcControlsComponent />
    </div>
  );
}
