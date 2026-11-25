# ADR-0004: The card engine writes every due card and every missed marker, through one card writer

- **Status:** Accepted
- **Date:** 2026-10-23 (extended 2026-10-27)
- **Decided by:** Module owner

## Context
Android's `CardGenerationEngine` creates due cards, but its `TimelineAdapter` writes the Missed marker while drawing
the list, so a card is only marked missed if someone opens the Timeline. Android's missed marker also has a NULL
creator and created date, and one failing visit aborts the whole tick, so no visit gets a card that minute.

## Options considered
- **Copy Android:** missed markers written while drawing. A screen that writes data; markers depend on who looks.
- **The engine writes them:** every card state is decided and written in the background, the same for every stage.

## Decision
- The card engine writes each due card, each missed marker and Decision Pending, in one transaction per visit (D-a).
- Every timer and stage-start card goes through one writer, `writeCard` (`core/db/card.ts`), which writes the
  encounter and its marker obs; Stage 1's first card is marked NORMAL too (2026-10-27).
- The missed marker is written through the same obs writer as every obs, so its creator and created date are filled.
- A visit that fails during a scan is logged and skipped; the others still get their cards.
- A card name is never written twice for a visit (Android's `isEncounterAlreadyAvailable`, plus a voided filter).

## Consequences
- The Timeline only reads; card states are the same whether or not anyone looked.
- Three recorded deviations from Android (README of `core/services/cardGeneration`).
- A new card writer must reuse `writeCard`, or the two drift.

## Evidence
Stage 1 Development Plan, Phase 0 decision D-a · `03d5f33` (cards on the engine) · `d4c12d7` (one card writer, NORMAL
marker) · `src/core/services/cardGeneration/README.md` deviation table.
