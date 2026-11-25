# Labour module: open points

Points in the labour module (Timeline, card engine, capture, save) that are still to be decided or
checked. Each one says what RN does today, so nothing here is hidden behaviour. When a point is
settled, move it to **Settled** with the date and who decided, and update the deviation sheet
(`eZAZI_RN_vs_Android_deviations.csv`) if RN keeps a difference from Android.

Started 2026-10-31. Android reference: `whitelabel-master` b3ddd15.

A decision that shapes the architecture, a data format or a rule many files follow is recorded as an ADR in
`src/features/labour-care-guide/docs/adr/` instead (2026-11-24); this file keeps open questions and settled details.

## Waiting for a decision

| # | Point | RN today | Android | Options |
|---|---|---|---|---|
| 1 | Editing a saved card | Rewrites the rows in place, as Android (since 2026-10-31) | Rewrites in place (`ObsDAO.updateObs`) | Keep Android's way · keep history by voiding the old row and writing a new one · write-new with both rows live (not safe after sync) · **parked for a rethink (2026-11-06): keep Android's way meanwhile** |
| 2 | **Suspected Android bug, copied for now:** a medicine removed or edited on an edited card | As Android: the old row is **not voided**. An edited medicine is a new row and the old one stays live; a removed one stays live (it reappears when the card is opened again). Only Medicine "No" voids all medicines | `getMedicinesObsList` (`ParamInfo` 332-341) writes only new medicines; `setDeletedMedicines` is only called in commented-out code (`PartogramQueryListingAdapter` 1435, 1448) | Keep Android's way · void the old row of a removed or edited medicine · **parked for a rethink (2026-11-06): keep Android's way meanwhile** |
<!-- 2026-11-18: settled, see Settled 2026-11-18
| 3 | Notes on an edited card | As Android: saved notes are rewritten as they are (same uuid, time kept), new ones added; a removed note is not voided | `getPlansObsList` / `getAssessmentsObsList` rewrite every listed note | Keep · write only new notes · **parked for a rethink (2026-11-06): keep Android's way meanwhile** |
-->
| 4 | Date-times written to the database (deviation row 20) | Current rule: patient and visit rows in local time, encounter and obs in UTC | Mixed per column | All UTC in Android's formats · keep · **still waiting for a check with the sync owner / the server (2026-11-06)** |
| 5 | `modified_date` on card obs | UTC `yyyy-MM-dd HH:mm:ss` | Local time with offset on card saves | Part of #4 · **still waiting for a check (2026-11-06)** |
<!-- 2026-11-06: settled, see Settled 2026-11-06
| 8 | Decision Pending visit attribute | Inserted when the row is missing | Only updated when it exists | Keep · follow Android |
-->
| 9 | Visit holder check | Only the visit-holder attribute counts; a voided Visit Complete is ignored | Any attribute equal to the provider id; any Visit Complete | Keep (stricter) · follow Android · **parked (2026-11-06)** |
<!-- 2026-11-06: settled by the card-alarm redesign, see Settled 2026-11-06
| 10 | Cards after the app is closed | An OS alarm keeps creating cards | Stops while the app is closed | Keep · follow Android |
-->
<!-- 2026-11-06: settled by the card-alarm redesign, see Settled 2026-11-06
| 11 | Card timing (exact-alarm access, parked) | Scan every ~105 s, so a card can be ~1¾ min late | Up to 1 min late | Team doc "Card engine timing: exact alarm access" |
-->
| 12 | Tapping a selected option again | Keeps it selected | (dialogs) | Keep · clear the choice · **kept selected for now; to be asked to the PO (2026-11-06)** |
| 24 | A failed End Stage write (End Stage 1 or 2) | Logged; nothing is half-written (one transaction). The dialog closes with no message and the nurse stays on the Timeline | Not checked | Show "Not saved" and keep the dialog open, as a failed card save does (2026-11-18) · keep · **found 2026-11-24 while writing the labour architecture docs** |
| 25 | The card engine's missed marker and its card's sync flag | `insertMissedEncounterMarker` writes the obs but does not mark its card encounter dirty. Harmless today (nothing syncs); once sync runs, a missed marker added to a card already pushed is never sent | — (Android has no push-by-parent) | Mark the encounter dirty in the same transaction now · or switch to the sync branch's `obsWrites.recordMissedEncounter` when his sync branch is merged · **parked for a decision (2026-11-24); found while checking the sync branch** |
| 26 | Magnesium Sulfate 20% strength in the medicine catalogue (PR #17 review) | `500 mg/mL`, the same as the 50% entry below it; a 20% solution is 200 mg/mL, so a 4 mL dose reads as 2 g instead of 0.8 g | The catalogue is copied from Android's `medicines.json`; Android's `arrays_ezazi.xml` lists only the 50% entry | Keep Android's value · correct it to 200 mg/mL in both apps after clinical sign-off · **parked for a decision (2026-11-25): kept as Android meanwhile** |
| 27 | A session from before the creator uuid was stored (PR #17 review) | `creatorUuid` is stored at login since 2026-10-23; a tablet still logged in from an older build has none, so cards are not generated, Save shows "Not saved", SOS and End Stage do nothing, until the nurse logs in again | — | Treat a missing `creatorUuid` as "needs login" at startup · leave it (only test tablets; no release yet; test data is dummy) · **parked (2026-11-25)** |
| 28 | A server pull can overwrite an offline edit (PR #17 review) | Edits rewrite rows in place; `obs.ts` `upsertManyFromServer` marks the server row clean without checking for unsent local changes. Not called yet (no pull engine) | — | Skip rows with unsent local changes · **check after the sync branch is merged whether it still exists (2026-11-25)** |
<!-- 2026-11-06: settled, see Settled 2026-11-06
| 13 | "−" on an empty stepper | Fills the starting value, as "+" | (no steppers) | Keep · do nothing |
-->
<!-- 2026-11-06: settled, see Settled 2026-11-06
| 14 | Notes added on this card | Can be removed before saving | Not confirmed | Keep · Android's way once confirmed |
-->
<!-- 2026-11-06: settled, see Settled 2026-11-06
| 15 | Wording | Medicine button "Add" (Android); Save & Exit text says "observation" (Figma says "registration") | — | Confirm |
-->
<!-- 2026-11-06: settled, see Settled 2026-11-06
| 16 | Gradient buttons (Next, Record Now, End First Stage) | Plain colour | — | Needs a native package and a rebuild |
-->
<!-- 2026-11-06: settled, see Settled 2026-11-06
| 17 | Read-only card, last Next | Goes back to the Timeline | Read mode has no save | Keep · hide Next on the last tab |
-->
<!-- 2026-11-06: settled, see Settled 2026-11-06
| 18 | SOS dialog text | Says "This will open the SOS observation form", but Capture SOS only adds the SOS card to the Timeline | Same: only refreshes the Timeline (`TimelineVisitSummaryActivity` ~1539) | Change the text · open the form after Capture SOS |
-->
<!-- 2026-11-18: settled, see Settled 2026-11-18
| 19 | Medicine Duration and Duration unit | Marked `*` but not required; Add works without them | Same: labels have `*`, `isValidMedicine` does not check them | Keep · drop the `*` · make them required · **same as Android for now; parked, to check later (2026-11-06)** |
-->
<!-- 2026-11-06: settled, see Settled 2026-11-06
| 20 | Medicine Frequency list | "Single Dose, Stat Dose" appears twice | Same (`arrays_ezazi.xml` 119-120) | Keep · show it once |
-->
<!-- 2026-11-06: settled by the card-alarm redesign, see Settled 2026-11-06
| 22 | **Card engine stops after 6 hours with the screen off** (15-hour device run, 2026-11-01) | The monitor's foreground service is type `dataSync`; Android 15+ stops it after 6 h a day (`FGS (dataSync) timed out` at 07:41). The app then becomes a cached process, Samsung's Freecess freezes it when the screen goes off and its alarms are deferred: no cards 07:42-09:11 and 10:19-11:00, then one card on wake-up and no backfill | Same service type (legacy app); its target SDK decides whether the limit applies (not checked) | Service type with no daily limit (e.g. `specialUse`, Play justification) · handle `onTimeout` · exact alarms that run while idle · battery-optimisation exemption prompt |
-->
<!-- 2026-11-06: settled by the card-alarm redesign, see Settled 2026-11-06
| 23 | PendingIntent count keeps growing | System warns "Too many PendingIntent created" for the app (up to 1,200 by 03:11) | — | Reuse one PendingIntent per trigger, check the 5-second notification update |
-->
<!-- 2026-11-06: settled, see Settled 2026-11-06
| 21 | Assessment / Plan typed but not added | Dropped on save; only notes added with "+ Add" are saved | Not yet checked | Check Android, then match |
-->

## Android features not built yet

| Feature | Android |
|---|---|
<!-- 2026-11-24: built. A completed visit shows its outcome panel instead of the action bar (SOS hidden); SOS is disabled for a non-holder (Settled 2026-11-18).
| SOS button hidden on a completed visit, disabled for a nurse who is not the visit holder | `TimelineVisitSummaryActivity` 1593, 1691 |
-->
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
- Card engine: 20-hour screen-off soak on the tablet (Stage 1 then Stage 2), and a reboot mid-labour (after the first unlock). Same build, wake log `Android/data/org.intelehealth.ezazi/files/card-wakes.log`.
- Card engine: Samsung may put an app unused for about 3 days to sleep (16 days: deep sleep, alarms blocked). The in-app guide to "Unrestricted" battery and "Never sleeping apps" was removed for now (2026-11-06); decide after testing, meanwhile a tablet-setup checklist item.
- Card engine (optional): the 5-minute battery wake could also create an overdue card, so a failed main wake-up costs about 5 s instead of the 2-minute watchdog.
<!-- 2026-11-18: asked one by one on 2026-11-18; decisions under Settled, the rest below.
- The ~25 Low items of the 5 Nov audit: to be asked one by one (2026-11-06).
-->
- Parked (2026-11-18): sizes from the theme; double tap on Record Now; code tidy-ups (refreshVisitRisk transaction, comment length, Timeline queries per card, form re-renders); dev-seed creator uuids; edit quirks (newest vs oldest row rewritten, same medicine's added time) with points 1-2; sync after a new card (Android now syncs after creating it).
- To check in Android: does picking a catalogue medicine clear Dose, Duration and Remark?
- With the delivery form: leave DELIVERY_OUTCOME_STAGE3 out of the Timeline, as Android.
- The sync branch (logout keeps the database, Reset app): checked while merging.
- Decision Pending banner and prolonged-labour warning: parked (2026-11-06).
- Login screen: "Something went wrong" and no locations once, right after a logout (2026-11-06); a restart loaded them. Login flow, outside this module.

## Settled

| Date | Point | Decision (who) |
|---|---|---|
| 2026-11-25 | Backspacing Systolic clears Diastolic (PR #17 review, `useCaptureForm.ts`): kept as Android | Module owner |
| 2026-11-24 | End Stage 1 and 2 dialogs: follow the Figma "Complete Stage" design (Backend-Developer-file, section Stage 3 & 4) instead of Android's dialogs. The Figma file "Backend-Developer-file" is the design source from now on | Module owner |
| 2026-11-24 | Toasts: Android's system toast, as Android (Figma has no toast design) | Module owner |
| 2026-11-18 | Point 3, notes on an edited card: kept as Android (rewritten as they are, new ones added, none removed) | Module owner |
| 2026-11-18 | Point 19, medicine Duration and Duration unit: required (stricter than Android, which marks them * but does not check) | Module owner |
| 2026-11-18 | Leaving a capture card: always ask "Are you sure you want to close patient observation?" with Save & Exit (Android asks nothing and discards; Phase 0 decision kept) | Module owner |
| 2026-11-18 | Timeline: Android's edit marker on the editable card; a heading per stage over its cards | Module owner |
| 2026-11-18 | SOS: the button is disabled while SOS cannot be created (Decision Pending, or not the visit holder); a 1-second vibration on SOS, as Android | Module owner |
| 2026-11-18 | "Woman Declines", as Android | Module owner |
| 2026-11-18 | Editing a card leaves out doctor-written rows, as Android | Module owner |
| 2026-11-18 | Patient header: no age when there is no date of birth (not "0 years") | Module owner |
| 2026-11-18 | Video Call shown for every client, Nepal included (Android hides it in Nepal) | Module owner |
| 2026-11-18 | A failed card save shows an error and keeps the card open | Module owner |
| 2026-11-18 | Code rules: notification and channel texts in en.json; date calls through datetime.ts; the medicine form on zod; FIELD_ID constants, javaTrim and the digit filter from the package; the missing unit tests | Module owner |
| 2026-11-18 | Hindi / Nepali texts: English until the team provides translations | Module owner |
| 2026-11-06 | Point 8, Decision Pending attribute: RN keeps inserting it when the visit has no row (Android only updates) | Module owner |
| 2026-11-06 | Point 13, "−" on an empty stepper: does nothing (disabled); "+" fills the start value | Module owner |
| 2026-11-06 | Point 14, notes: none can be removed, saved or new, as Android (no remove path in Android) | Module owner |
| 2026-11-06 | Point 15, wording: medicine "Add" and Save & Exit "observation" stay | Module owner |
| 2026-11-06 | Point 16, gradient buttons: Figma "Main CTA" #2E1E91 → #3922CF, left to right, on Next / Save, Record Now and End Stage, drawn with react-native-svg (no new package) | Module owner |
| 2026-11-06 | Point 17, read-only card: Back works on every tab (from the first back to the Timeline), Next moves between tabs and is disabled on the last tab, no Save & Exit question | Module owner |
| 2026-11-06 | Point 18, SOS dialog: Android's text ("SOS Data Entry!", "Are you sure to capture the data now?", Cancel / Yes); only the card is added, as Android | Module owner |
| 2026-11-06 | Point 20, medicine Frequency: "Single Dose, Stat Dose" shown once (Android lists it twice; same stored text) | Module owner |
| 2026-11-06 | Point 21, Assessment / Plan typed but not added: discarded, as Android (its Cancel discards; only added notes are saved) | Checked against Android |
| 2026-11-06 | Last-tab button: Android's "Save" on a new card, "Update" on an edited one | Module owner |
| 2026-11-06 | Medicine dose units: Android's active four (mL, Tab, Cap, Drop); mg, ug, %, IU removed (commented out in Android) | Module owner |
| 2026-11-06 | A card marked missed while its capture screen was open: the saved data wins, the marker is voided (Android decides missed only when drawing) | Module owner |
| 2026-11-06 | Timeline opens scrolled to the due card (else the newest card) | Module owner |
| 2026-11-06 | End Stage 1 and 2 as Android (options, texts, writes) on shared code, with Android's bugs fixed: Stage-3 and Mother Death exclusive, no stray second "Self discharge" row, the dialogs stay open with their message when nothing is chosen, a visit is completed only once, one transaction per action, REFER_TYPE always in English; End Stage hidden on a completed visit (outcome shown instead, as Android) and disabled for a nurse who does not hold the visit; after a completion, back to Home. The Women Delivery Details form (Stage-3) is the next task | Module owner |
| 2026-11-06 | Logout keeps no confirmation | Module owner |
| 2026-11-06 | The 5-minute battery wake also creates a card more than 3 s overdue | Module owner |
| 2026-11-06 | Battery cost of the alarm clock during a labour: accepted for now, measured in the 20-hour run before a final decision | Module owner |
| 2026-11-06 | Former points 10, 11, 22, 23 (cards with the app closed, card timing, 6-hour stop, PendingIntent growth): the card engine wakes on an alarm clock 20 s before each due card, waits for the due second and scans inside a short foreground service, with a watchdog alarm 2 min after; no dataSync service (CARD_ENGINE_ALARM_PLAN.md). Device run, Galaxy Tab, Android 16, eZAZI in no Samsung exemption list: app open, background, swiped away with the process dead, screen locked, light Doze with the battery unplugged, app updated: every card 5-17 ms after its due time; a crashed wake-up recovered by the watchdog at +2 min; logout stopped every alarm, login re-armed; PendingIntents steady at about 25 (was 1,200). Deep Doze is not entered while a card alarm is within 30 min (more battery during a labour). | Module owner (go-ahead), device-tested |
| 2026-11-01 | Former points 6 and 7: `created_date` on the Oxytocin / IV row and on field rows is the save time in UTC, as Android (`PartogramDataCaptureActivity` 561, 589, 666); RN already matches | Checked against Android (no decision needed) |
| 2026-10-31 | Edit save follows Android for now, including its medicine and note lists (points 1-3 stay open) | Module owner |
| 2026-10-29 | Where Dr. Venkat's frequency sheet and Android disagree, follow Android | Module owner |
| 2026-10-29 | Range errors while typing, in the Figma error style | Module owner |
| 2026-10-28 | Timeline dates in Gregorian for now | Module owner |
