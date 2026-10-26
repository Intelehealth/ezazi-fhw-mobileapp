/**
 * Oxytocin / IV obs value: Android `Medication.toJson()` (Gson). Keys in ART field order
 * (by name; inferred, confirm with one real row), nulls dropped, `< > & = '` HTML-escaped.
 * Byte-exact text matters: Android's duplicate check compares the stored JSON.
 */

export interface InfusionEntry {
  readonly type?: string; // IV Fluids only; 'Other' + otherType for free text
  readonly strength?: string; // Oxytocin only, U/L
  readonly infusionRate?: string; // drops/min
  readonly otherType?: string;
  readonly infusionStatus?: string; // Started | Continued | Stopped
}

// `Medication.java` serialised fields, sorted by name as ART lists them.
const GSON_KEY_ORDER = ['infusionRate', 'infusionStatus', 'otherType', 'strength', 'type'] as const;

const GSON_HTML_ESCAPES: Readonly<Record<string, string>> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '=': '\\u003d',
  "'": '\\u0027',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

function gsonString(value: string): string {
  return JSON.stringify(value).replace(/[<>&='\u2028\u2029]/g, (char) => GSON_HTML_ESCAPES[char]);
}

/** The JSON Android stores for an infusion. Missing fields are left out, as Gson does. */
export function encodeInfusion(entry: InfusionEntry): string {
  const parts: string[] = [];
  for (const key of GSON_KEY_ORDER) {
    const value = entry[key];
    if (value !== undefined && value !== null) parts.push(`${gsonString(key)}:${gsonString(value)}`);
  }
  return `{${parts.join(',')}}`;
}

/** Reads a stored infusion in any key order. Numbers become text, as Gson reads them. Null for "No". */
export function decodeInfusion(stored: string): InfusionEntry | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const source = parsed as Record<string, unknown>;
  const entry: Record<string, string> = {};
  for (const key of GSON_KEY_ORDER) {
    const value = source[key];
    if (typeof value === 'string') entry[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) entry[key] = String(value);
  }
  return entry;
}
