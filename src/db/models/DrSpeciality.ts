import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

import type Provider from './Provider';

export default class DrSpeciality extends Model {
  static table = 'tbl_dr_speciality';

  static associations = {
    tbl_provider: { type: 'belongs_to' as const, key: 'provideruuid' },
  };

  @field('uuid')              uuid!: string;   // PRIMARY KEY in Android
  @field('provideruuid')      provideruuid!: string;
  @field('attributetypeuuid') attributetypeuuid!: string;
  @field('value')             value!: string;   // UNIQUE constraint in Android
  @field('voided')            voided!: string;

  @relation('tbl_provider', 'provideruuid') provider!: Provider;
}
