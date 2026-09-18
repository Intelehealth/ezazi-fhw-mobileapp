import { fromBase64, toBase64 } from '../base64';

describe('toBase64', () => {

  it('encodes a typical username:password pair', () => {
    expect(toBase64('nurse1:secret')).toBe('bnVyc2UxOnNlY3JldA==');
  });

  it('encodes an empty password after the colon', () => {
    expect(toBase64('admin:')).toBe('YWRtaW46');
  });

  it('encodes a lone colon', () => {
    expect(toBase64(':')).toBe('Og==');
  });

  it('encodes a short 3-character input with no padding', () => {
    expect(toBase64('a:b')).toBe('YTpi');
  });

  it('encodes an empty string', () => {
    expect(toBase64('')).toBe('');
  });

  it('is UTF-8 safe for multi-byte characters', () => {
    expect(toBase64('user✓:pässwörd')).toBe('dXNlcuKckzpww6Rzc3fDtnJk');
  });

});

describe('fromBase64', () => {

  it('decodes a standard base64 string', () => {
    expect(fromBase64('bnVyc2UxOnNlY3JldA==')).toBe('nurse1:secret');
  });

  it('decodes a base64url string with no padding', () => {
    expect(fromBase64('eyJleHAiOjEwfQ')).toBe('{"exp":10}');
  });

  it('decodes an empty string', () => {
    expect(fromBase64('')).toBe('');
  });

  it('round-trips UTF-8 multi-byte characters through toBase64', () => {
    expect(fromBase64(toBase64('user✓:pässwörd'))).toBe('user✓:pässwörd');
  });

});
