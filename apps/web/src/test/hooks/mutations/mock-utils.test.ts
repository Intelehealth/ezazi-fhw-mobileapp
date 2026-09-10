import { describe, expect, it } from 'vitest';
import {
  shouldSimulateFailure,
  simulateNetworkDelay,
} from '../../../hooks/mutations/mock-utils';

describe('shouldSimulateFailure', () => {
  it('is true when the value contains "fail" (case-insensitive)', () => {
    expect(shouldSimulateFailure('please-fail-me')).toBe(true);
    expect(shouldSimulateFailure('FAIL')).toBe(true);
    expect(shouldSimulateFailure('nurse1')).toBe(false);
  });
});

describe('simulateNetworkDelay', () => {
  it('resolves after roughly the given delay', async () => {
    const start = Date.now();
    await simulateNetworkDelay(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(9);
  });
});
