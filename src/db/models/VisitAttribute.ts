import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

import type Visit from './Visit';

export default class VisitAttribute extends Model {
  static table = 'tbl_visit_attribute';

  static associations = {
    tbl_visit: { type: 'belongs_to' as const, key: 'visit_uuid' },
  };

  @field('uuid')                      uuid!: string;   // PRIMARY KEY in Android
  @field('visit_uuid')                visit_uuid!: string;
  @field('value')                     value!: string;
  @field('visit_attribute_type_uuid') visit_attribute_type_uuid!: string;
  @field('voided')                    voided!: string;
  @field('sync')                      sync!: string;

  @relation('tbl_visit', 'visit_uuid') visit!: Visit;
}
