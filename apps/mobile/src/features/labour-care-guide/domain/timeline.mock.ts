import type { PatientSummary, TimelineCheckpoint } from './timeline.types';

/**
 * Sample data for previewing TimelineScreen before the real patient/
 * checkpoint repository exists (no Drizzle table or sync payload for this
 * yet — see MOBILE_STACK.md §9 step 3). TimelineScreen falls back to this
 * only when it isn't given route params; swap for a live query once
 * `core/db/schema` grows a labour-monitoring table.
 */
export const MOCK_PATIENT: PatientSummary = {
  id: 'ez-10517',
  name: 'Priya Jadhav',
  ezId: 'EZ-10517',
  ageYears: 28,
  gravidaLabel: 'G1',
};

// Relative to "now" (not a fixed past date) so the preview always reads
// sensibly — a hardcoded date reads fine on the day it's written and shows
// a nonsensical "(in 0 min)" countdown on every day after.
const now = Date.now();
const MINUTE = 60_000;

export const MOCK_CHECKPOINTS: TimelineCheckpoint[] = [
  {
    id: 'cp-1',
    scheduledAt: new Date(now - 90 * MINUTE).toISOString(),
    status: 'completed',
    recordedAt: new Date(now - 88 * MINUTE).toISOString(),
  },
  { id: 'cp-2', scheduledAt: new Date(now - 60 * MINUTE).toISOString(), status: 'missed' },
  { id: 'cp-3', scheduledAt: new Date(now - 30 * MINUTE).toISOString(), status: 'dueNow' },
  { id: 'cp-4', scheduledAt: new Date(now + 30 * MINUTE).toISOString(), status: 'upcoming' },
];
