import { buildClientRegistry } from '@ezazi/config';
import { DEFAULT_CLIENT_CONFIG } from './default';
import { NEPAL_CLIENT_CONFIG } from './nepal';

/** Add one line here for every new client — nothing else needs to change. */
export const CLIENT_REGISTRY = buildClientRegistry([
  DEFAULT_CLIENT_CONFIG,
  NEPAL_CLIENT_CONFIG,
]);
