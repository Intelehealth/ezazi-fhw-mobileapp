# ADR-0002: MVVM layers; the UI never touches the database

- **Status:** Accepted
- **Date:** 2026-10-23
- **Decided by:** Module owner

## Context
Android's capture and Timeline activities read the database, decide clinical rules and draw in the same class
(`TimelineVisitSummaryActivity`, `PartogramDataCaptureActivity`), which made them hard to test and let behaviour
differ between screens. The app-wide stack (`MOBILE_STACK.md`) already separates features into layers.

## Options considered
- **Screens read and write through hooks of their own.** Little structure; every screen re-implements its reads.
- **MVVM:** View draws, ViewModel prepares and acts, Model reads, writes and decides.

## Decision
- **View** (`screens/`, `components/`) draws what a ViewModel gives it.
- **ViewModel** (`stores/use…ViewModel`) reads through `data/`, re-reads when tables change, calls `data/` to write.
- **Model**: `data/` is the only labour code touching `core/db`; `domain/` is pure mapping; clinical decisions come
  from `@ezazi/clinical-rules` (ADR-0003).
- Clinical data lives in SQLite, form input in react-hook-form, never in zustand (CLAUDE.md tripwire 9).

## Consequences
- Screens are tested with a mocked ViewModel; `data/` against a real in-memory database.
- The boundaries are enforced by eslint (the feature-isolation rule was fixed to actually fire in `d9f6282`).
- A new screen costs one more file (its ViewModel) than a screen that reads directly.

## Evidence
Stage 1 Development Plan, "Implementation" and "Rules the code follows" · `../../README.md` layer table ·
`.eslintrc.cjs` boundaries.
