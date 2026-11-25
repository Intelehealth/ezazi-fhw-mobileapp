# ADR-0006: An edited card's rows are rewritten in place, as Android

- **Status:** Accepted
- **Date:** 2026-10-31
- **Decided by:** Module owner
- **Supersedes:** the Stage 1 plan's rule "edits never overwrite: an edit writes new obs, newest wins" (2026-10-22)

## Context
The Stage 1 plan first chose write-new for edits, keeping the old row as history. Android's edit path
(`ObsDAO.updateObs`) rewrites the existing rows in place, and the server and legacy app expect one live row per
concept per card.

## Options considered
- **Write new rows, newest wins (the plan's first rule).** Keeps history; reads must pick the newest; differs from
  Android on the server.
- **Void the old row and write a new one.** Keeps history; still differs from Android.
- **Rewrite in place, as Android.** Same rows as Android; no edit history.

## Decision
Rewrite in place, as Android: an edited value keeps its row uuid; `created_date` is kept per row; notes are rewritten
as they are, new ones added, none removed (2026-11-18). Doctor-written rows are left out of an edit (2026-11-18).

## Consequences
- No edit history on the device.
- Android's medicine behaviour is copied too: an edited medicine is a new row and the old one stays live (open
  point 2, suspected Android bug). Open points 1 and 2 remain open for a rethink.

## Evidence
`a52bb95`, `6217309` · LABOUR_OPEN_POINTS points 1–3 and Settled 2026-10-31, 2026-11-18 · `saveCard` in
`data/labourRepository.ts`.
