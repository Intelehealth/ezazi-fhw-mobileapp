import { Model } from '@nozbe/watermelondb';
import { field, relation, children } from '@nozbe/watermelondb/decorators';

import type { Query } from '@nozbe/watermelondb';
import type Visit from './Visit';
import type Obs from './Obs';

export default class Encounter extends Model {
  static table = 'tbl_encounter';

  static associations = {
    tbl_visit: { type: 'belongs_to' as const, key: 'visituuid' },
    tbl_obs:   { type: 'has_many'   as const, foreignKey: 'encounteruuid' },
  };

  @field('uuid')                uuid!: string;   // PRIMARY KEY in Android
  @field('visituuid')           visituuid!: string;
  @field('encounter_time')      encounter_time!: string;
  @field('provider_uuid')       provider_uuid!: string;
  @field('encounter_type_uuid') encounter_type_uuid!: string;
  @field('modified_date')       modified_date!: string;
  @field('sync')                sync!: string;
  @field('voided')              voided!: string;
  @field('privacynotice_value') privacynotice_value!: string;

  @relation('tbl_visit', 'visituuid') visit!: Visit;

  @children('tbl_obs') observations!: Query<Obs>;
}
