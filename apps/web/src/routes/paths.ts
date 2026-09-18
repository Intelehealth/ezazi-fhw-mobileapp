/**
 * Single source of truth for route paths (migration guide §3). Only the
 * auth + root routes exist so far — extend this table module by module as
 * §7's phases are worked, matching the reference repo's ROUTES shape.
 */
export const ROUTES = {
  ROOT: '/',
  AUTH: {
    BASE: '/auth',
    LOGIN: 'login',
  },
  NOT_FOUND: '*',
} as const;
