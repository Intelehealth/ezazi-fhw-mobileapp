/**
 * Android `FirstLetterUpperCaseInputFilter` (Supervisor Doctor, IV "Other"): keeps only
 * `[a-zA-Z0-9\p{Punct} ]` (ASCII punctuation) and upper-cases the first character.
 */
const ALLOWED = /[a-zA-Z0-9!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~ ]/;

export function filterFreeText(text: string): string {
  const kept = Array.from(text).filter((char) => ALLOWED.test(char)).join('');
  return kept.length > 0 ? kept[0].toUpperCase() + kept.slice(1) : kept;
}
