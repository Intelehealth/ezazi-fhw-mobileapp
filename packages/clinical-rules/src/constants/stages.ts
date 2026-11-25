import { deepFreeze } from '../internal/deepFreeze';

/** Labour stage ids. Stage 3 is the delivery form, so it has no cards. */
export const STAGE = deepFreeze({
  STAGE1: 'stage1',
  STAGE2: 'stage2',
  STAGE4: 'stage4',
} as const);

export type StageId = (typeof STAGE)[keyof typeof STAGE];

/**
 * Card and SOS name parts, stored byte-identical to Android: `Stage1_Hour3_2`, `Stage1_Hour3_SOS2`.
 * Stage 4 is written with digit 3, because the server, web and print read that digit.
 */
export const CARD_NAME_PART = deepFreeze({
  STAGE: 'Stage',
  HOUR: 'Hour',
  SOS: 'SOS',
  SEPARATOR: '_',
} as const);

export const STAGE_DIGIT = deepFreeze({
  [STAGE.STAGE1]: 1,
  [STAGE.STAGE2]: 2,
  [STAGE.STAGE4]: 3,
} as const satisfies Record<StageId, number>);
