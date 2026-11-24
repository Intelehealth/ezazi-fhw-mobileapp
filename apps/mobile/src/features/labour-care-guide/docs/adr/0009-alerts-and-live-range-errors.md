# ADR-0009: Android's alert codes kept, the amniotic-fluid alert fixed, range errors shown live

- **Status:** Accepted
- **Date:** 2026-10-23 (range errors revised 2026-10-29)
- **Decided by:** Module owner

## Context
Android stores an alert code (R or G) with each observation. Two of its behaviours are broken: the amniotic-fluid
alert never fires because of a field-name mismatch, and its range-hint toasts check nothing.

## Options considered
- **Copy both as they are.** Parity; a missing red alert on meconium-stained or bloody fluid.
- **Fix the alert, drop the toasts, show range errors in the Figma error style.**

## Decision
- Alert codes stay exactly as Android computes them (`whitelabel-master`), in the package.
- The amniotic-fluid alert is fixed (D-b): `M+++` or `B` → R; `I`, `C`, `M+`, `M++` → G.
- Range-hint toasts are dropped (D-c). Range errors show while typing, in the Figma error style (2026-10-29; the
  first decision showed them when the field lost focus). Android's infusion-rate check runs on leaving the box.
- An alert value keeps the normal selected look; its R is still stored (2026-11-05).

## Consequences
- One recorded clinical deviation (amniotic fluid); shared with the team.
- Errors appear earlier than in Android.

## Evidence
Stage 1 Development Plan, Phase 0 decisions D-b, D-c · `56cff3f` (alert codes) · `ea509f6` (live errors) · `6185ddc` ·
LABOUR_OPEN_POINTS Settled 2026-10-29.
