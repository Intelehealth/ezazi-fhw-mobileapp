# ADR-0008: End Stage 1 and 2 as Android, with Android's bugs fixed

- **Status:** Accepted
- **Date:** 2026-11-06
- **Decided by:** Module owner

## Context
Android's End Stage dialogs (`CompleteVisitOnEndStage1Dialog`, `CompleteVisitOnEnd2StageDialog`) decide how a labour
ends: move to Stage 2, refer, self discharge, C-section, ICU, mother death, the Stage-3 delivery path, other. The 6 Nov
audit found bugs in them that write wrong or duplicate data.

## Options considered
- **Copy Android exactly, bugs included.** Parity; known wrong data.
- **Android's options, texts and writes, with the data bugs fixed.** Each fix a recorded deviation.

## Decision
Android's options, order, texts and stored values, on one shared completion writer, with these fixes:
- Stage-3 and Mother Death cannot both be ticked.
- No stray second "Self discharge" row.
- The dialogs stay open with their message when nothing is chosen.
- A visit is completed only once (`alreadyCompleted`).
- One transaction per action.
- `REFER_TYPE` always stored in English.

End Stage is hidden on a completed visit (its outcome line shows instead, as Android), disabled for a nurse who does
not hold the visit, and leads back to Home after a completion. Move to Stage 2 starts Stage 2 after its confirm.

## Consequences
- Six recorded deviations from Android, each pinned by a test.
- The Stage-3 path waits for the Women Delivery Details form (not built yet).
- Not yet checked on a device (as of 2026-11-24).

## Evidence
`96dc10b`, `7adafe1` · LABOUR_OPEN_POINTS Settled 2026-11-06 · `decideEndStage1`, `decideEndStage2` in the package ·
`endStage1`, `endStage2` in `data/labourRepository.ts`.
