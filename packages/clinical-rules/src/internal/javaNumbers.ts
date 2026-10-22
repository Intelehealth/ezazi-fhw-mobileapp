/** Number parsing as the Android inputs allow it. Null when the text is not a number. */

// Java Integer.parseInt: optional sign, ASCII digits only.
export const JAVA_INT = /^[+-]?\d+$/;

// What a decimal input accepts: digits with at most one point.
const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)$/;

export function parseJavaInt(text: string): number | null {
  return JAVA_INT.test(text) ? Number(text) : null;
}

export function parseDecimal(text: string): number | null {
  return DECIMAL.test(text) ? Number(text) : null;
}
