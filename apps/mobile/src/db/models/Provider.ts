import { Model } from '@nozbe/watermelondb';
import { field, children } from '@nozbe/watermelondb/decorators';

import type { Query } from '@nozbe/watermelondb';
import type ProviderAttribute from './ProviderAttribute';
import type DrSpeciality from './DrSpeciality';

export default class Provider extends Model {
  static table = 'tbl_provider';

  static associations = {
    tbl_provider_attribute: { type: 'has_many' as const, foreignKey: 'provideruuid' },
    tbl_dr_speciality:      { type: 'has_many' as const, foreignKey: 'provideruuid' },
  };

  @field('uuid')          uuid!: string;   // PRIMARY KEY in Android
  @field('identifier')    identifier!: string;
  @field('given_name')    given_name!: string;
  @field('family_name')   family_name!: string;
  @field('role')          role!: string;
  @field('useruuid')      useruuid!: string;
  @field('voided')        voided!: string;
  @field('modified_date') modified_date!: string;
  @field('sync')          sync!: string;

  @children('tbl_provider_attribute') providerAttributes!: Query<ProviderAttribute>;
  @children('tbl_dr_speciality')      drSpecialities!: Query<DrSpeciality>;
}
