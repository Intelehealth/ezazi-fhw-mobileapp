const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_LOOKUP: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (let i = 0; i < BASE64_CHARS.length; i++) map[BASE64_CHARS[i]] = i;
  return map;
})();

/**
 * UTF-8-safe base64 encoding with no Buffer/btoa dependency — neither is
 * guaranteed available on Hermes/React Native. Used for the login Basic-auth
 * header (see services/api/auth.api.ts).
 */
export function toBase64(input: string): string {
  const bytes = utf8Bytes(input);
  let output = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const triplet = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);

    output += BASE64_CHARS[(triplet >> 18) & 0x3f];
    output += BASE64_CHARS[(triplet >> 12) & 0x3f];
    output += b1 === undefined ? '=' : BASE64_CHARS[(triplet >> 6) & 0x3f];
    output += b2 === undefined ? '=' : BASE64_CHARS[triplet & 0x3f];
  }

  return output;
}

/**
 * UTF-8-safe base64 (and base64url — '-'/'_' and missing '=' padding) decoding
 * with no Buffer/atob dependency — neither is guaranteed available on
 * Hermes/React Native. Used to read JWT payloads (see utils/jwt.ts).
 */
export function fromBase64(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const bytes: number[] = [];

  for (let i = 0; i < normalized.length; i += 4) {
    const c0 = BASE64_LOOKUP[normalized[i]] ?? 0;
    const c1 = BASE64_LOOKUP[normalized[i + 1]] ?? 0;
    const c2 = normalized[i + 2] !== undefined ? BASE64_LOOKUP[normalized[i + 2]] : undefined;
    const c3 = normalized[i + 3] !== undefined ? BASE64_LOOKUP[normalized[i + 3]] : undefined;

    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 !== undefined) {
      bytes.push(((c1 & 0xf) << 4) | (c2 >> 2));
      if (c3 !== undefined) bytes.push(((c2 & 0x3) << 6) | c3);
    }
  }

  return utf8Decode(bytes);
}

function utf8Decode(bytes: number[]): string {
  let output = '';
  let i = 0;

  while (i < bytes.length) {
    const b0 = bytes[i++];
    if (b0 < 0x80) {
      output += String.fromCodePoint(b0);
    } else if (b0 >> 5 === 0x6) {
      const b1 = bytes[i++];
      output += String.fromCodePoint(((b0 & 0x1f) << 6) | (b1 & 0x3f));
    } else if (b0 >> 4 === 0xe) {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      output += String.fromCodePoint(((b0 & 0xf) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
    } else {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      output += String.fromCodePoint(
        ((b0 & 0x7) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f),
      );
    }
  }

  return output;
}

function utf8Bytes(input: string): number[] {
  const bytes: number[] = [];

  for (let i = 0; i < input.length; i++) {
    const code = input.codePointAt(i);
    if (code === undefined) continue;
    if (code > 0xffff) i++; // surrogate pair — codePointAt already consumed both halves

    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  return bytes;
}
