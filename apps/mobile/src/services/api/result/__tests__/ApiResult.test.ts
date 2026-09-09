import { failure, isFailure, isSuccess, success } from '../ApiResult';
import { ApiError } from '../../errors/ApiError';

describe('ApiResult', () => {

  // ── Construction ─────────────────────────────────────────────────────────

  it('success() creates an ok result carrying the data', () => {
    const result = success({ id: 1 });
    expect(result).toEqual({ ok: true, data: { id: 1 } });
  });

  it('failure() creates a non-ok result carrying the error', () => {
    const error = new ApiError('api', 'boom');
    const result = failure(error);
    expect(result).toEqual({ ok: false, error });
  });

  // ── Narrowing ────────────────────────────────────────────────────────────

  it('isSuccess narrows to Success and exposes data', () => {
    const result = success(42);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data).toBe(42);
    }
  });

  it('isFailure narrows to Failure and exposes the error', () => {
    const result = failure(new ApiError('network', 'no connection'));
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.kind).toBe('network');
    }
  });

  it('isSuccess and isFailure are mutually exclusive', () => {
    const ok = success('x');
    const bad = failure(new ApiError('api', 'x'));
    expect(isSuccess(ok)).toBe(!isFailure(ok));
    expect(isSuccess(bad)).toBe(!isFailure(bad));
  });

});
