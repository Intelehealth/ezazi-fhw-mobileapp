import { useState } from 'react';
import chevronIcon from '../../../assets/svgs/chevron-down.svg';

/**
 * Same four font families as profile.component.ts's `fonts` array
 * (intelehealth-doctor-webapp). The reference previews each font with its
 * own name (`item.text`) rather than the doctor's typed signature — this
 * port instead previews the actual "Signature letters" value in each font,
 * so the doctor sees what their own signature will look like before saving.
 */
export const SIGNATURE_FONTS = [
  { name: 'arty' },
  { name: 'asem' },
  { name: 'youthness' },
  { name: 'almondita' },
] as const;

interface SignatureFontSelectProps {
  value: string;
  onChange: (name: string) => void;
  /** The "Signature letters" field's current value — previewed in each font instead of the font's own name. */
  previewText: string;
  error?: string;
}

/**
 * Ports the "Select Signature" ng-select (profile.component.html) — a
 * dropdown whose closed value AND each option are rendered in the font
 * they represent, at 30px/50px respectively, matching the reference's
 * inline `[style.fontFamily]` + font-size. No ng-select equivalent exists
 * in this app's dependencies, so this is a small custom listbox instead
 * of a third-party select component.
 */
export function SignatureFontSelect({
  value,
  onChange,
  previewText,
  error,
}: SignatureFontSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = SIGNATURE_FONTS.find(font => font.name === value);
  const preview = previewText.trim() || 'Select Signature';

  function selectFont(name: string) {
    onChange(name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label className={'mb-1 block text-sm font-bold text-[#1B163A]'}>
        Select Signature *
      </label>

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-12 w-full cursor-pointer items-center justify-between rounded-lg border border-[rgba(178,175,190,0.2)] bg-[#FAF9FF] px-4"
      >
        {/* These signature fonts (arty/asem/youthness/almondita) have an
            unusually tall ascent baked into the font files themselves — far
            more headroom above the baseline than their font-size implies.
            `overflow-hidden` (or a box too short to fit that ascent) clips
            the letterforms down to a stray fragment. No clipping here keeps
            the glyphs fully visible even in this shorter, h-12 box. */}
        <span
          style={{ fontFamily: selected?.name }}
          className="max-w-full overflow-visible text-[22px] whitespace-nowrap text-[#1B163A]"
        >
          {preview}
        </span>
        {/* chevron-down.svg is actually drawn pointing right (›) — every
            other usage in this app (e.g. dashboard.component.tsx's
            show/hide-all toggle) rotates it 90deg for a down/up chevron;
            unrotated it read as a "next" arrow instead of a dropdown. */}
        <img
          src={chevronIcon}
          alt=""
          className={`h-4 w-4 shrink-0 transition-transform ${open ? '-rotate-90' : 'rotate-90'}`}
        />
      </button>

      {open && (
        <>
          {/* Click-outside-to-close backdrop, same pattern as a native <select>'s implicit dismissal. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[rgba(178,175,190,0.2)] bg-white shadow-[0px_4px_24px_rgba(31,28,58,0.08)]"
          >
            {SIGNATURE_FONTS.map(font => (
              <li
                key={font.name}
                role="option"
                aria-selected={font.name === value}
              >
                <button
                  type="button"
                  onClick={() => selectFont(font.name)}
                  style={{ fontFamily: font.name }}
                  className="block w-full cursor-pointer px-4 py-2 text-left text-[40px] leading-tight text-[#1B163A] hover:bg-[#FAF9FF]"
                >
                  {preview}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
