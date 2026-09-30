jest.mock('@/core/utils/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

import { logger } from '@/core/utils/logger';
import { logApiError } from '../logApiError';
import { ApiError, UnauthorizedError } from '@ezazi/api-client';

describe('logApiError', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs the error kind/status/code/message/details via logger.info', () => {
    const error = new ApiError('api', 'Account is temporarily locked', {
      status: 423,
      code: 'ACCOUNT_LOCKED',
      details: { retryAfterSeconds: 900 },
    });

    logApiError('Setup login', error);

    expect(logger.info).toHaveBeenCalledWith('[API] Setup login failed', {
      kind: 'api',
      status: 423,
      code: 'ACCOUNT_LOCKED',
      message: 'Account is temporarily locked',
      details: { retryAfterSeconds: 900 },
    });
  });

  it('logs an error with no status/code/details as undefined, not throwing', () => {
    const error = new UnauthorizedError();

    logApiError('Setup login', error);

    expect(logger.info).toHaveBeenCalledWith('[API] Setup login failed', expect.objectContaining({
      kind: 'unauthorized',
      status: 401,
      code: undefined,
      details: undefined,
    }));
  });

  it('never uses logger.warn/.error — React Native LogBox would put those on screen', () => {
    logApiError('Setup login', new ApiError('network', 'down'));

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('never throws', () => {
    expect(() => logApiError('X', new ApiError('network', 'down'))).not.toThrow();
  });

});
