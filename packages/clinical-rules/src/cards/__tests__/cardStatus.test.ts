import { describe, expect, it } from 'vitest';

import { getCardStatus } from '../cardStatus';

// A literal port of Android TimelineAdapter.onBindViewHolder (whitelabel-master b3ddd15) with
// ObsDAO.checkObsAddedOrNt / checkObsAndCreateMissedObs, kept independent of the package.
interface AndroidFacts {
  position: number;
  isNewEncounterCreated: boolean;
  isDecisionPending: boolean;
  isVCEPresent: boolean;
  nurseHasEditAccess: boolean;
  realObs: boolean; // checkObsAddedOrNt: obs other than MISSED, ENCOUNTER_TYPE, SOS_STAGE_HOUR
  missedMarker: boolean;
}

function androidBind(f: AndroidFacts) {
  let tag: string | null = null;
  let clickable = false;
  let enabled = false;
  let summary = '';
  let ivEditVisible = false;
  let markerWritten = false;
  const submitted = f.realObs ? 'SUBMITTED' : 'MISSED';

  if (f.position === 0 && !f.isDecisionPending) {
    clickable = true;
    tag = 'WRITE';
    enabled = true;
    summary = 'pending';
    ivEditVisible = false;
  } else {
    clickable = false;
    enabled = false;
    let status = 'PENDING';
    if (!f.realObs && !f.missedMarker) {
      status = 'MISSED';
      markerWritten = true;
    } else {
      status = f.realObs ? 'SUBMITTED' : 'MISSED';
    }
    if (status === 'MISSED') {
      summary = 'missed';
      ivEditVisible = false;
    } else {
      enabled = true;
      tag = 'EDIT';
      summary = 'submitted';
      ivEditVisible = true;
    }
  }
  if (submitted === 'SUBMITTED') {
    clickable = false;
    enabled = false;
    summary = 'submitted';
    ivEditVisible = true;
    if (!f.isNewEncounterCreated && f.position === 0 && !f.isDecisionPending) {
      tag = 'EDIT';
      ivEditVisible = true;
    } else {
      tag = 'READ';
      ivEditVisible = false;
      clickable = true;
      enabled = true;
    }
  }
  if (f.isVCEPresent) {
    clickable = false;
    enabled = false;
  }
  if (!f.nurseHasEditAccess) ivEditVisible = false;
  else if (f.isVCEPresent) ivEditVisible = false;
  const opens = (clickable && enabled && f.nurseHasEditAccess) || (ivEditVisible && tag === 'EDIT');

  return {
    state: summary,
    access: opens && tag ? tag.toLowerCase() : 'none',
    showEditIcon: ivEditVisible,
    writeMissedMarker: markerWritten,
  };
}

const booleans = [false, true];
const combos = booleans.flatMap((isNewest) =>
  booleans.flatMap((decisionPending) =>
    booleans.flatMap((visitComplete) =>
      booleans.flatMap((isVisitHolder) =>
        booleans.flatMap((hasRealObs) =>
          booleans.map((hasMissedMarker) => ({
            card: { isNewest, hasRealObs, hasMissedMarker },
            visit: { decisionPending, visitComplete, isVisitHolder },
          })),
        ),
      ),
    ),
  ),
);

const android = ({ card, visit }: (typeof combos)[number], isNewEncounterCreated = false) =>
  androidBind({
    position: card.isNewest ? 0 : 3,
    isNewEncounterCreated,
    isDecisionPending: visit.decisionPending,
    isVCEPresent: visit.visitComplete,
    nurseHasEditAccess: visit.isVisitHolder,
    realObs: card.hasRealObs,
    missedMarker: card.hasMissedMarker,
  });

describe('getCardStatus', () => {
  it('matches Android for every combination of card and visit facts', () => {
    expect(combos).toHaveLength(64);
    for (const combo of combos) {
      expect([combo, getCardStatus(combo.card, combo.visit)]).toEqual([combo, android(combo)]);
    }
  });

  it('opens only the newest card for writing, and only while Decision Pending is clear', () => {
    const visit = { decisionPending: false, visitComplete: false, isVisitHolder: true };
    const empty = { hasRealObs: false, hasMissedMarker: false };

    expect(getCardStatus({ ...empty, isNewest: true }, visit)).toEqual({
      state: 'pending', access: 'write', showEditIcon: false, writeMissedMarker: false,
    });
    expect(getCardStatus({ ...empty, isNewest: true }, { ...visit, decisionPending: true })).toEqual({
      state: 'missed', access: 'none', showEditIcon: false, writeMissedMarker: true,
    });
  });

  it('lets only the newest submitted card be edited; older ones are read-only', () => {
    const visit = { decisionPending: false, visitComplete: false, isVisitHolder: true };
    const filled = { hasRealObs: true, hasMissedMarker: false };

    expect(getCardStatus({ ...filled, isNewest: true }, visit).access).toBe('edit');
    expect(getCardStatus({ ...filled, isNewest: false }, visit).access).toBe('read');
  });

  it('writes the missed marker once: never when the card already has one', () => {
    const visit = { decisionPending: false, visitComplete: false, isVisitHolder: true };
    expect(getCardStatus({ isNewest: false, hasRealObs: false, hasMissedMarker: false }, visit).writeMissedMarker).toBe(true);
    expect(getCardStatus({ isNewest: false, hasRealObs: false, hasMissedMarker: true }, visit).writeMissedMarker).toBe(false);
  });

  describe('deviations (README)', () => {
    it("ignores Android's isNewEncounterCreated screen flag, which makes the newest filled card read-only", () => {
      const combo = combos.find(
        (c) => c.card.isNewest && c.card.hasRealObs && !c.visit.decisionPending && !c.visit.visitComplete && c.visit.isVisitHolder,
      )!;
      expect(android(combo, true).access).toBe('read');
      expect(getCardStatus(combo.card, combo.visit).access).toBe('edit');
    });
  });
});
