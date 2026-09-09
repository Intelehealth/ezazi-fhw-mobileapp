import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

import type Encounter from './Encounter';

export default class Obs extends Model {
  static table = 'tbl_obs';

  static associations = {
    tbl_encounter: { type: 'belongs_to' as const, key: 'encounteruuid' },
  };

  @field('uuid')                    uuid!: string;   // PRIMARY KEY in Android
  @field('encounteruuid')          encounteruuid!: string;
  @field('conceptuuid')            conceptuuid!: string;
  @field('value')                  value!: string;
  @field('comment')                comment!: string;
  @field('creator')                creator!: string;
  @field('creatoruuid')            creatoruuid!: string;
  @field('voided')                 voided!: string;
  @field('obsservermodifieddate')  obsservermodifieddate!: string;
  @field('modified_date')          modified_date!: string;
  @field('created_date')           created_date!: string;
  @field('sync')                   sync!: string;

  @relation('tbl_encounter', 'encounteruuid') encounter!: Encounter;
}
