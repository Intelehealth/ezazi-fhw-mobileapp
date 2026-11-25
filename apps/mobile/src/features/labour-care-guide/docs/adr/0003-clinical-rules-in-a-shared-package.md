# ADR-0003: Clinical rules live in `@ezazi/clinical-rules`, pure, shared with web

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decided by:** Module owner

## Context
The card schedule, fields, ranges, alert codes, save rows, SOS and End Stage rules are the clinical heart of labour
monitoring. The web app will need the same rules. In Android they are spread across activities, adapters and DAOs.

## Options considered
- **Rules inside the mobile feature.** Quick; web would re-implement them and drift.
- **A shared, pure package.** One implementation, testable without a device; every change is a change for web too.

## Decision
- Every clinical rule is a pure function in `packages/clinical-rules`: no database, network, storage, UI or clock.
  `now` is a parameter. A rule returns a decision as plain data; the app performs it.
- Inputs are stored values (names, times, obs values); the app maps them to uuids from `core/db/constants`.
- Each rule cites its Android source; a difference is a deviation row plus a test.
- The package changes only additively without a team decision (it is shared with web).

## Consequences
- Labour code contains no clinical `if`; reviewing a clinical change means reviewing the package.
- Mobile and web can adopt the same rules; web has no card engine yet.
- Adding a rule means a package change, a test and an export, even when only mobile uses it today.

## Evidence
`3083a9e` (package added), `18a402e` (mobile uses it, with the client's range profile) ·
`packages/clinical-rules/CLINICAL_RULES_CONVENTIONS.md` · `packages/clinical-rules/README.md`.
