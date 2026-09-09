export type { AppConfig } from './config.types';

// Add patient.types.ts, visit.types.ts, provider.types.ts etc. here as the
// mobile and web data shapes are confirmed to match the same backend
// contracts. Don't force a shared type before two real call sites need it —
// premature sharing here just means editing two apps to change one type.
