import { toBase64 } from '../base64';
import { decodeJwtPayload, isJwtExpired } from '../jwt';

function makeToken(payload: Record<string, unknown>): string {
  const header = toBase64(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = toBase64(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('decodeJwtPayload', () => {

  it('decodes the payload segment of a well-formed JWT', () => {
    expect(decodeJwtPayload(makeToken({ exp: 123, sub: 'user-1' }))).toEqual({
      exp: 123,
      sub: 'user-1',
    });
  });

  it('returns null for a string with no dot-separated segments', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
  });

  it('returns null when the payload segment is not valid JSON', () => {
    expect(decodeJwtPayload(`header.${toBase64('not-json')}.sig`)).toBeNull();
  });

});

describe('isJwtExpired', () => {

  it('is false for a token whose exp is in the future', () => {
    const futureSeconds = Math.floor(Date.now() / 1000) + 3600;
    expect(isJwtExpired(makeToken({ exp: futureSeconds }))).toBe(false);
  });

  it('is true for a token whose exp is in the past', () => {
    const pastSeconds = Math.floor(Date.now() / 1000) - 3600;
    expect(isJwtExpired(makeToken({ exp: pastSeconds }))).toBe(true);
  });

  it('is true for a token with no exp claim', () => {
    expect(isJwtExpired(makeToken({ sub: 'user-1' }))).toBe(true);
  });

  it('is true for a malformed token', () => {
    expect(isJwtExpired('garbage')).toBe(true);
  });

});
