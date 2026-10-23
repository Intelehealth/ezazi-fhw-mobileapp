/** What a timeline card is, as Android's `TimelineAdapter.onBindViewHolder` decides it. */
export type CardState = 'pending' | 'submitted' | 'missed';

/** How a tap opens the card: Android's `AccessMode`, or `none` when the card cannot be opened. */
export type CardAccess = 'write' | 'edit' | 'read' | 'none';

/** One card's stored facts. "Real" obs are all obs except the card marker, SOS label and missed marker. */
export interface TimelineCardFacts {
  readonly isNewest: boolean; // first in the newest-first timeline, SOS cards included
  readonly hasRealObs: boolean;
  readonly hasMissedMarker: boolean;
}

export interface TimelineVisitFacts {
  readonly decisionPending: boolean;
  readonly visitComplete: boolean;
  readonly isVisitHolder: boolean; // the logged-in provider holds the visit
}

export interface CardStatus {
  readonly state: CardState;
  readonly access: CardAccess;
  readonly showEditIcon: boolean;
  readonly writeMissedMarker: boolean; // the card engine writes it (decided 2026-10-23)
}

/**
 * A card's state and access. Only the newest card is open for writing or editing, and not
 * during Decision Pending; any other empty card is missed. Android's `isNewEncounterCreated`
 * screen flag is not ported (README deviations).
 */
export function getCardStatus(card: TimelineCardFacts, visit: TimelineVisitFacts): CardStatus {
  const open = card.isNewest && !visit.decisionPending;
  const state: CardState = card.hasRealObs ? 'submitted' : open ? 'pending' : 'missed';

  let access: CardAccess = 'none';
  if (state === 'pending') access = 'write';
  else if (state === 'submitted') access = open ? 'edit' : 'read';

  const canOpen = visit.isVisitHolder && !visit.visitComplete;
  return {
    state,
    access: canOpen ? access : 'none',
    showEditIcon: canOpen && access === 'edit',
    writeMissedMarker: state === 'missed' && !card.hasMissedMarker,
  };
}
