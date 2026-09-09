const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

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
