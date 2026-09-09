import { toBase64 } from '../base64';

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
