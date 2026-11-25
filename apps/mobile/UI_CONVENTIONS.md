# UI conventions

**Read this before building or changing any screen, dialog or message in `apps/mobile`.**

One look for the whole app: every screen takes its colours and sizes from the theme, and shows feedback (dialogs,
banners, field errors, toasts) in the same few patterns. Where a screen needs something not covered here, the pattern
is added here first.

Each rule says where it comes from: **Figma**, **Android**, or **(app decision)** where neither sets it.

Companion docs: `MOBILE_STACK.md` §3.1 (app bar and screen shells) · `src/core/config/theme.ts` (tokens) ·
`src/core/ui/` (shared components).

---

## 1. Sources of truth

| Question | Decided by |
|---|---|
| How it looks: colours, sizes, layout, dialog and banner design, navigation | Figma **Backend-Developer-file** (`9uQFDm12GDMlqshK1PzaJS`, page `0:1`) |
| What it says and does: fields, options and their order, texts, flows | The Android app (`whitelabel-master`), unless a recorded decision says otherwise |
| The exact values in code | `src/core/config/theme.ts` |

Figma sections: Style guide & Components `1:441` · Sign Up `1:478` · Forgot password `1:1561` · Observation flow
`1:2226` · Stage 3 & 4 `1:8054` · View LCG & Postpartum `1:15997` · Add patient `1:21100`.

- Figma has **only portrait tablet frames, 800 × 1280**. Phone layouts have no frame; they are derived from the tablet
  frame (app decision).
- Values inside Figma frames (names, numbers) are samples, not data.
- Figma defines almost no variables; the tokens live in `theme.ts`.
- Older code comments cite frame ids of the previous design file (`251:…`, `2-109`, `2-144`); the same screens exist in
  this file under new ids.
- Recorded exceptions: the End Stage 1 and 2 dialogs follow Figma's "Complete Stage" design, not Android's; toasts stay
  Android's system toast (2026-11-24, `LABOUR_OPEN_POINTS.md` Settled).

## 2. Tokens

**Every colour, size, radius and font size comes from the theme**, on the phone as on tablets: `colors`, `dimens`,
`spacing`, `radii`, `fontSizes` (through `fs()`), `typography`. A hex value or a bare number in a style is a value that
drifts from every other screen. A missing value is added to `theme.ts` with the Figma name it comes from, then used.

**Text is drawn with `core/ui/Text`**, which sets Lato. Lato has two weights: 400 and 700; any weight from 500 up
renders as 700.

**The main call to action is the gradient button** (`ctaGradientStart` → `ctaGradientEnd`, left to right): Next / Save,
Record Now, End Stage, a dialog's primary button.

## 3. Devices, orientation and sizes

| Device | Role | Notes |
|---|---|---|
| Phone (xhdpi) | Supported | About 360 × 640 dp. No Figma frame; derived layout |
| Samsung 8.7" tablet | Supported; the real test device (SM-X135) | About 600 dp wide: exactly on the tablet breakpoint. Samsung's "Screen zoom" can push it below 600 dp and into the phone layout, so check it at the default and at one zoom step up |
| Samsung Galaxy Tab A11, 11" | Supported | Confirm its size on the device (`adb shell wm size`, `wm density`) before relying on numbers |

- **Portrait is the design** (2026-11-24): every screen is built and checked in portrait. The app is not forced into
  portrait on tablets: Android 16 ignores the app's portrait setting on screens 600 dp and wider, so a tablet may
  rotate, and a screen must stay usable if it does. Phones stay portrait.
- A device is a tablet from **600 dp** wide (app decision).
- **Phone sizes come from theme tokens** (2026-11-24). Tablet sizes go through `useResponsive()`: `fs(key)` for font
  sizes, `scale(n)` for a tablet size, `fromFigma(n)` for a number read off the 800-wide Figma frame, `cornerRadius` for
  corners. A phone size is never a number written in place.

## 4. Choosing the feedback

| Situation | Pattern | Source | Component |
|---|---|---|---|
| Confirm an action, or leaving a screen with unsaved input | Confirm dialog (§5) | Figma | `ConfirmDialog` |
| Something the person must allow before going on (permissions, Alarms & reminders) | Gate: a confirm dialog with no ✕ | App decision (Figma has no gate) | `ConfirmDialog` with `hideClose`, or without `cancelLabel` for one button |
| A completed action that needs acknowledging (password updated) | Success dialog (§5, success tone) | Figma | `ConfirmDialog` with `tone="success"` |
| A save failed and the input must be kept | Confirm dialog ("Not saved"); the screen stays open | App decision | `ConfirmDialog` |
| Choosing one outcome from several (End Stage) | Choice sheet (§6) | Figma | — |
| A sign-in request failed (credentials, network, server) | Error banner above the main button (§7) | Figma | `ApiErrorBanner` |
| One field is missing, wrong or out of range | Field error (§8) | Figma | `AppTextField`, the capture form fields |
| A short note after a successful action ("Login successful") | Android toast (§9) | Android | `showToast` (`core/utils/toast.ts`) |
| Waiting for a request | Full-screen progress | App decision (Figma has only the splash "Loading") | `ApiProgressOverlay` |
| Picking from a longer list | Dropdown card under the field (§6) | Figma | `PickerField` (today a bottom sheet; see §14) |

Errors that need an action are never only a toast: a toast disappears before it can be read twice.

## 5. Confirm dialog

Figma "Modal": 26 dialogs share one anatomy (for example `1:7100`, `1:7140`, `1:2194`, `1:24008`).

1. **Tone badge** at the top left: a 48-unit circle with its icon and the faint rings behind it.
   - **Warning** (orange): the default, used by most confirms, including leaving and discarding.
   - **Danger** (red): SOS in Figma. Any other use is an app decision.
   - **Success** (green): an action completed.
2. **✕** at the top right, on every Figma dialog. It does what the cancel button does; so does the device Back button.
   A gate has no ✕ (app decision).
3. **Title**: a question for a confirm ("Close patient registration?"), the result for a success ("Successful").
4. **Message**: one or two sentences on what happens next.
5. **Note** (optional; one Figma dialog, SOS): a lavender box with an info icon, for one line the person must not miss.
6. **Buttons**, 80 units tall on the Figma frame: secondary on the left (cancel or stay), primary on the right (do it).
   An acknowledgement has one full-width primary button. A success dialog that shows a summary card stacks two
   full-width buttons (`1:8490`).

`ConfirmDialog` draws this in all three tones. Content such as a list goes in its `children`, under the message; a
gate sets `hideClose`; a short button label ("OK") can carry a fuller screen-reader name. Dialogs Figma does not
draw (low battery, permissions) use it too, in the warning tone, so every dialog in the app looks the same. A new
dialog uses `ConfirmDialog`, not a new `Modal`.

## 6. Other dialog types

| Type | Figma | Anatomy |
|---|---|---|
| Choice sheet | "Complete Stage 2" (`1:11811`), End First Stage frames (`1:13619`, `1:13856`) | A full-width sheet anchored to the bottom of the screen; ✕ at the top right; title and message; a highlighted card for the option that continues the visit; a section label ("OTHER OUTCOMES - THESE END THE VISIT"); outcome cards in a grid, the clinical-risk outcome in a red outline; an optional comment box; a notice card when an outcome that ends the visit is chosen ("Saved observations will be retained."); Cancel / Yes |
| Form sheet | Monitor Mother / Monitor Baby (`1:10410`, `1:10473`, in sheet `1:10398`) | A full-width sheet anchored to the bottom; ✕; form sections as on a screen; Cancel / Yes where the form is submitted |
| Menu | Reset app / Logout / End Shift (`1:23792`) | A card dropped down under the app bar, aligned right; rows of icon, title, one-line description, chevron; the ending row in the danger colours; no ✕ |
| Dropdown card | Location (`1:479`), AMNIOTIC FLUID (`1:7344`), Route (`1:7693`) | A card under the field with one row per option, rows divided by lines, no title |

Every dialog and sheet closes on the device Back button the same way its ✕ or Cancel does (app decision).

## 7. Error banner

Figma: sign-in only ("Username or password is incorrect" `1:1225`, "Something went wrong" `1:1339`). A pale red card
above the screen's main button: a red circular icon, a red title, a grey message under it. One banner at a time; it
clears when the person tries again, and a new error replaces it (app decision). Title and message come from `en.json`.

## 8. Field errors

Figma "Sign up all error fields" (`1:1453`), "Forgot Password error screen" (`1:1735`), "Incorrect OTP" (`1:1965`). The
field's border turns red and the message sits under the field in red, left-aligned. Sign-in and forgot-password forms
show them on submit; the capture form shows range errors while typing (app decision). Messages come from `en.json`, and
for clinical fields from the package's rules.

## 9. Toasts

Android's system toast, short duration, through `showToast()` only, never `ToastAndroid` directly. Figma has no toast
design. A toast is only for a note the person can safely miss, and never carries clinical information.

## 10. Other components in Figma

| Component | Figma | Use |
|---|---|---|
| Tabs with swipe | Capture tabs (spec note `1:8052`) | Tap or swipe between tabs; no wrap at either end (`TabPager`) |
| Segmented choice | Button Selection (`1:7779`) | One choice from a few options (`SegmentedChoice`) |
| Stepper | Baseline FHR, Pulse | A number with − and + (`StepperInput`) |
| Status chip | DUE NOW (`1:476`), OBSERVATION DUE, ALERT | A short state label on a card |
| Step indicator | Add patient ("Step 1 of 2") | Progress through a multi-step form |
| Bottom navigation | Add patient (`1:21202`) | Top-level sections |
| Success header | "Patient Registered Successfully" (`1:22983`) | An in-screen confirmation with ✕ |
| Inline panel | End First Stage on the Timeline (`1:8661`) | An action panel inside a screen, one button |
| Values legend | "Values in red meet the existing postpartum alert…" | Explains red values on a report |
| Search field | Patient lists | Search with a magnifier icon |

## 11. Buttons and touch

`AppButton` variants: `primary` (the gradient call to action), `secondary` (white with a grey stroke, the dialog's
cancel), `outline`, `destructive`; size `compact` for buttons inside cards (Record Now). A button whose action is not yet
possible is disabled, not hidden.

**Every touch target is at least 48 dp** (Android guidance), through `minHeight` or `hitSlop` where the drawn control is
smaller.

## 12. Wording and languages

- Every text a person can read is in `en.json`, including notification titles and channel names.
- Where Android has a text, the text is Android's; Figma's wording is followed only where Android has none or a
  decision says so.
- Button labels say what happens ("Save & Exit", "Capture SOS", "Back to Login"); "Cancel" closes without doing it.
- A title and its message describe the same thing.
- Counts use plural keys (`_one`, `_other`). Layouts allow for longer Hindi and Nepali text: no fixed widths on text.

## 13. Accessibility and test locators

- **Contrast** (WCAG 2.2 AA): text at least 4.5:1 against its background; icons, borders and controls at least 3:1.
- **Font scaling**: text follows the system font size. Controls use `minHeight`, not a fixed `height`, so labels never
  clip; each screen is checked at 1.3× and 2× font size.
- Every icon-only button (✕, back, eye, edit) has an `accessibilityLabel` from `en.json` and `accessibilityRole="button"`.
- Choices carry their role (`radio`, `checkbox`) and state (`selected`, `checked`, `disabled`).
- An error or an SOS result is announced to the screen reader; a dialog's title is read first when it opens.
- Every screen sits in `ScreenLayout` or `FormScreenLayout`, so content stays clear of the system bars and the keyboard.
- Elements QA automates carry a `testID`, kept in one registry per feature (sign-in: `src/features/auth/testIds.ts`; labour: `src/features/labour-care-guide/testIds.ts`). The shared button, choice, text box and dialog accept a `testID`; a dialog names its parts `<id>-close`, `<id>-cancel`, `<id>-confirm`; a password
  field's eye toggle is `<id>-toggle`.

## 14. Known differences to close

| Difference | Where |
|---|---|
| `PickerField` opens a bottom sheet; Figma draws a dropdown card | `core/ui/PickerField.tsx` |
| Choice and form dialogs are drawn as centred dialogs; Figma draws bottom sheets with a ✕ | `EndStageDialogs.tsx` |
| Placeholder and unselected-tab text, the Completed and Missed chips and the field-error red are below 4.5:1 | `theme.ts` |
| Controls 44, header buttons 40, compact buttons 40 and the timeline dot 28 are below 48 dp | `theme.ts` `dimens` |
| Lato has no Devanagari letters | `core/ui/Text` |

## 15. Before a screen is done

- [ ] Checked on the phone, the 8.7" tablet and the 11" tablet, in portrait (and still usable rotated on a tablet);
  matches its Figma frame on the tablets
- [ ] Every colour and size from the theme, phone sizes included; no hex, no bare numbers in styles
- [ ] Every text in `en.json`; plural keys for counts
- [ ] Feedback uses the pattern of §4, with the shared component; Back closes every dialog
- [ ] Loading, empty, error and read-only states all drawn
- [ ] Touch targets 48 dp; contrast AA; readable at 2× font size
- [ ] Icon buttons labelled; QA locators set

## 16. What tools enforce

| Rule | Enforced by |
|---|---|
| `Text` only from `core/ui/Text` | eslint `@typescript-eslint/no-restricted-imports` |
| `Modal` only in the shared dialogs, the End Stage dialogs and the location dropdown | eslint `@typescript-eslint/no-restricted-imports` |
| `ToastAndroid` only in `core/utils/toast.ts` | eslint `@typescript-eslint/no-restricted-imports` |
| No hex colours, no bare numbers in styles, no hard-coded text | **Not enforced yet.** Review only |
| Figma match, contrast, touch size, font scaling, the three devices | Review and device checks (§15) |

`npm run lint` also runs `eslint-rules.test.cjs`, which checks the `Text`, `Modal` and `ToastAndroid` rules fire where they should.
