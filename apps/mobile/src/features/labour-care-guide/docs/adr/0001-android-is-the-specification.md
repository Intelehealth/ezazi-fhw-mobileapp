# ADR-0001: Android is the functional specification; deviations are decided, scoped and recorded

- **Status:** Accepted
- **Date:** 2026-10-09 (refined 2026-10-23 and 2026-10-26)
- **Decided by:** Module owner

## Context
The React Native app replaces a live Android app. Both talk to the same server and write the same encounter types,
concepts, uuids, values and time formats. Any silent difference in behaviour becomes a difference in clinical data
that the server, the web app and the legacy app read.

## Options considered
- **Redesign behaviour as the RN app is built.** Faster per screen; every difference is invisible until data diverges.
- **Mirror Android exactly, and change it only by recorded decision.** Slower to decide; every difference is visible.

## Decision
- Android (`whitelabel-master`) decides **what** the app does: fields, options and order, start values, required
  inputs, timings, flows, stored values. Figma decides **how it looks**. The mobile docs decide **how the code is built**.
- A deviation from Android needs a decision **before** code, with a date and who decided (a role), and applies **only** where it
  was named (2026-10-27: the NORMAL marker went on Stage 1's first card only).
- Clinical rules stay exactly as Android unless the module owner asks (2026-10-23).
- Values in Figma frames are samples; where no frame exists, a style is proposed from theme tokens (2026-10-26).

## Consequences
- Android's bugs are copied until someone decides to fix them (example: open point 2, a medicine edited on an edited
  card leaves the old row live).
- Each fixed bug is a recorded deviation with a test (ADR-0008, ADR-0009).
- Work needs the Android source at hand; its head is checked before relying on it.

## Evidence
Stage 1 Development Plan, "Sources of truth" and Phase 0 decisions · `apps/mobile/LABOUR_OPEN_POINTS.md` header ·
`packages/clinical-rules/CLINICAL_RULES_CONVENTIONS.md` §2.
