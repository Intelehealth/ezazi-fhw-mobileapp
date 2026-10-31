# Labour module: open points

Points in the labour module (Timeline, card engine, capture, save) that are still to be decided or
checked. Each one says what RN does today, so nothing here is hidden behaviour. When a point is
settled, move it to **Settled** with the date and who decided, and update the deviation sheet
(`eZAZI_RN_vs_Android_deviations.csv`) if RN keeps a difference from Android.

Started 2026-10-31 (Kaveri). Android reference: `whitelabel-master` b3ddd15.

## Waiting for a decision

| # | Point | RN today | Android | Options |
|---|---|---|---|---|
| 1 | Editing a saved card | Rewrites the rows in place, as Android (since 2026-10-31) | Rewrites in place (`ObsDAO.updateObs`) | Keep Android's way · keep history by voiding the old row and writing a new one · write-new with both rows live (not safe after sync) |
| 2 | **Suspected Android bug, copied for now:** a medicine removed or edited on an edited card | As Android: the old row is **not voided**. An edited medicine is a new row and the old one stays live; a removed one stays live (it reappears when the card is opened again). Only Medicine "No" voids all medicines | `getMedicinesObsList` (`ParamInfo` 332-341) writes only new medicines; `setDeletedMedicines` is only called in commented-out code (`PartogramQueryListingAdapter` 1435, 1448) | Keep Android's way · void the old row of a removed or edited medicine |
| 3 | Notes on an edited card | As Android: saved notes are rewritten as they are (same uuid, time kept), new ones added; a removed note is not voided | `getPlansObsList` / `getAssessmentsObsList` rewrite every listed note | Keep · write only new notes |
| 4 | Date-times written to the database (deviation row 20) | Arpan's rule: patient and visit rows in local time, encounter and obs in UTC | Mixed per column | All UTC in Android's formats · keep |
| 5 | `modified_date` on card obs | UTC `yyyy-MM-dd HH:mm:ss` | Local time with offset on card saves | Part of #4 |
| 6 | `created_date` on the Oxytocin / IV row | Always filled (DB_CONVENTIONS: an empty value breaks newest-wins reads) | Left empty | Keep · follow Android |
| 7 | `created_date` on field rows of a new card | Save time | The value's own capture time (exact stamp not yet confirmed) | Confirm Android's stamp, then match |
| 8 | Decision Pending visit attribute | Inserted when the row is missing | Only updated when it exists | Keep · follow Android |
| 9 | Visit holder check | Only the visit-holder attribute counts; a voided Visit Complete is ignored | Any attribute equal to the provider id; any Visit Complete | Keep (stricter) · follow Android |
| 10 | Cards after the app is closed | An OS alarm keeps creating cards | Stops while the app is closed | Keep · follow Android |
| 11 | Card timing (exact-alarm access, parked) | Scan every ~105 s, so a card can be ~1¾ min late | Up to 1 min late | Team doc "Card engine timing: exact alarm access" |
| 12 | Tapping a selected option again | Keeps it selected | (dialogs) | Keep · clear the choice |
| 13 | "−" on an empty stepper | Fills the starting value, as "+" | (no steppers) | Keep · do nothing |
| 14 | Notes added on this card | Can be removed before saving | Not confirmed | Keep · Android's way once confirmed |
| 15 | Wording | Medicine button "Add" (Android); Save & Exit text says "observation" (Figma says "registration") | — | Confirm |
| 16 | Gradient buttons (Next, Record Now, End First Stage) | Plain colour | — | Needs a native package and a rebuild |
| 17 | Read-only card, last Next | Goes back to the Timeline | Read mode has no save | Keep · hide Next on the last tab |

## Android features not built yet

| Feature | Android |
|---|---|
| SOS button hidden on a completed visit, disabled for a nurse who is not the visit holder | `TimelineVisitSummaryActivity` 1593, 1691 |
| Decision Pending banner on the Timeline | 710-724 |
| Prolonged-labour warning (Stage 1 ≥ 12 h, or ≥ 10 h for parous women) | 1193-1272 |
| Doctor's prescriptions list behind Medication (Administered screen) | `PartogramQueryListingAdapter` 558-722 |
| First card written at admission (admission screen not built) | `AdmissionWriter.kt` 133-147 |

## To check

- Phone and 11" tablet layouts; speed of an hourly card (under 60 s on a low-end phone).
- Medicine and IV Fluids flows on a device.
- Sizes and colours against Figma once its rate limit resets; picker sheet and alert style have no frame yet.
- The dev "Open debugger to view warnings" toast.
- Login lost on app restart (login flow, outside this module).

## Settled

| Date | Point | Decision (who) |
|---|---|---|
| 2026-10-31 | Edit save follows Android for now, including its medicine and note lists (points 1-3 stay open) | Kaveri |
| 2026-10-29 | Where Dr. Venkat's frequency sheet and Android disagree, follow Android | Kaveri |
| 2026-10-29 | Range errors while typing, in the Figma error style | Kaveri |
| 2026-10-28 | Timeline dates in Gregorian for now | Kaveri |
