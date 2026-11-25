# ADR-0010: Dates are stored as today, shown per client, and all go through the two date helpers

- **Status:** Accepted (storage formats under review, open points 4–5)
- **Date:** 2026-10-28
- **Decided by:** Module owner

## Context
Android mixes local time and UTC per column. The current storage rule (`DB_CONVENTIONS.md`) writes patient and visit rows in local time and
encounter and obs rows in UTC. The aim is UTC everywhere, but it is to be verified before anything moves. Nepal shows
Bikram Sambat dates, other clients Gregorian.

## Options considered
- **Move storage to UTC now.** The stated aim; unverified, and it changes the current rule.
- **Keep storage as it is; route every date operation through two helpers.** No conversion repeated in
  features; one place to change later.

## Decision
- Storage stays as `DB_CONVENTIONS.md` says until it has been verified (open points 4–5).
- Obs values that hold a date or time keep Android's wall-clock formats.
- Display follows the client (BS or Gregorian); the Timeline card date is Gregorian for now.
- Every date operation goes through `core/utils/datetime.ts` (storage, conversion, arithmetic) or `calendar.ts`
  (display). eslint blocks the date libraries anywhere else.

## Consequences
- A future move to UTC changes two files and the stored rows, not every feature.
- The Timeline shows Gregorian dates in Nepal until BS support is added.

## Evidence
`a9c9583` (date helpers, eslint) · `679842c` (Gregorian Timeline) · LABOUR_OPEN_POINTS points 4–5 and Settled
2026-10-28.
