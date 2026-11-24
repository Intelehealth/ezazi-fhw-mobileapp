# Labour decision records (ADRs)

An ADR records one decision that shapes the labour module: its context, the options weighed, what was decided and
what it costs. ADRs are never edited to change their meaning. A new decision that replaces an old one is a new ADR
marked **Supersedes**, and the old one is marked **Superseded by**. So the history reads in order, and nobody
re-litigates a decision without seeing why it was taken.

Small settled details (a label, one behaviour) stay as Settled rows in `apps/mobile/LABOUR_OPEN_POINTS.md`. Open
questions stay there too. See `../LABOUR_CONVENTIONS.md` §7 for which goes where.

## Index

| # | Decision | Date | Status |
|---|---|---|---|
| [0001](0001-android-is-the-specification.md) | Android is the functional specification; deviations are decided, scoped and recorded | 2026-10-09 | Accepted |
| [0002](0002-mvvm-layers.md) | MVVM layers; the UI never touches the database | 2026-10-23 | Accepted |
| [0003](0003-clinical-rules-in-a-shared-package.md) | Clinical rules live in `@ezazi/clinical-rules`, pure, shared with web | 2026-10-15 | Accepted |
| [0004](0004-card-engine-writes-cards-and-missed-markers.md) | The card engine writes every due card and every missed marker, through one card writer | 2026-10-23 | Accepted |
| [0005](0005-due-time-alarms-and-a-short-scan-service.md) | Cards come from due-time alarm clocks and a short scan service | 2026-11-06 | Accepted |
| [0006](0006-edits-rewrite-rows-in-place.md) | An edited card's rows are rewritten in place, as Android | 2026-10-31 | Accepted |
| [0007](0007-no-draft-always-ask-on-leaving.md) | No stored draft; leaving a card always asks, with Save & Exit | 2026-10-23 | Accepted |
| [0008](0008-end-stage-as-android-with-bugs-fixed.md) | End Stage 1 and 2 as Android, with Android's bugs fixed | 2026-11-06 | Accepted |
| [0009](0009-alerts-and-live-range-errors.md) | Android's alert codes kept, the amniotic-fluid alert fixed, range errors live | 2026-10-23 | Accepted |
| [0010](0010-dates.md) | Dates: stored as today, shown per client, all through the two date helpers | 2026-10-28 | Accepted |
| [0011](0011-code-rules-for-text-time-and-constants.md) | Text in `en.json`, time through `nowMs`, constants from the package | 2026-11-18 | Accepted |

## Template

```markdown
# ADR-NNNN: <the decision, as a sentence>

- **Status:** Proposed | Accepted | Superseded by ADR-XXXX
- **Date:** YYYY-MM-DD
- **Decided by:** <role>
- **Supersedes:** ADR-XXXX (if any)

## Context
What forced a decision: the problem, the Android behaviour, the constraint. Facts, with sources.

## Options considered
Each option in a line or two, with what it would cost.

## Decision
What was decided, precisely enough to test.

## Consequences
What gets better, what gets worse, what is now harder to change, what must be watched.

## Evidence
Commits, plan docs, open-point rows, device results, tests that pin it.
```
