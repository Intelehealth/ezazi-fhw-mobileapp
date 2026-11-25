# ADR-0007: No stored draft; leaving a card always asks, with Save & Exit

- **Status:** Accepted
- **Date:** 2026-10-23 (confirmed 2026-11-18)
- **Decided by:** Module owner

## Context
A capture card has up to six tabs of input. Android asks nothing when the nurse leaves a card and discards the input.
Keeping a draft across an app kill means storing clinical input outside the saved rows.

## Options considered
- **Store a draft.** Survives an app kill; a second copy of clinical data with its own rules for when it is used.
- **Copy Android: leave silently and discard.** One accidental Back loses a whole card.
- **No draft, but always ask on leaving.** Input lives only in the form; leaving asks first.

## Decision
No stored draft. Input stays in the form until the last Next (Save / Update) writes it. Back (device or app bar) always
opens "Are you sure you want to close patient observation?": **Save & Exit** saves, **Continue** stays. A read-only card
leaves without asking.

## Consequences
- An app killed mid-capture loses that card's input (as Android).
- A deviation from Android (which discards silently), recorded and tested.

## Evidence
Stage 1 Development Plan, Phase 0 decision D-d · `6d0156f` · LABOUR_OPEN_POINTS Settled 2026-11-18 ("Leaving a capture
card") · `CardCaptureScreen.tsx`.
