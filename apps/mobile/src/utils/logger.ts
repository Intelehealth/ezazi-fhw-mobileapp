/**
 * Tiny dev-only logger. Drops to no-op in production.
 * Swap to Sentry / pino-mobile later if needed.
 */
import { env } from '@/config/env';

const isDev = env.APP_ENV !== 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const log = (level: LogLevel, ...args: unknown[]): void => {
  if (!isDev && level === 'debug') return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](`[${ts}] [${level.toUpperCase()}]`, ...args);
};

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
