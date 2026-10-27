import { fitSquare } from '../fitSquare';

/** Equal `size` gives every action-bar icon the same visible size, whatever its shape. */
describe('fitSquare', () => {
  it('fits a wide glyph to the width', () => {
    expect(fitSquare(30, 25.98, 21.15)).toEqual({ width: 30, height: (30 * 21.15) / 25.98 });
  });

  it('fits a tall glyph to the height', () => {
    expect(fitSquare(30, 18.42, 22.67)).toEqual({ width: (30 * 18.42) / 22.67, height: 30 });
  });

  it('fills the square for a square glyph', () => {
    expect(fitSquare(30, 30.46, 30.46)).toEqual({ width: 30, height: 30 });
  });
});
