import { describe, expect, it } from 'vitest';
import { queryClient } from '../../config/query-client';

describe('queryClient', () => {
  it('uses a conservative retry/staleTime policy for queries and no retry for mutations', () => {
    const { queries, mutations } = queryClient.getDefaultOptions();

    expect(queries).toMatchObject({
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    });
    expect(mutations).toMatchObject({ retry: 0 });
  });
});
