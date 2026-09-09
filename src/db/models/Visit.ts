import { Model } from '@nozbe/watermelondb';
import { field, relation, children } from '@nozbe/watermelondb/decorators';

import type { Query } from '@nozbe/watermelondb';
import type Patient from './Patient';
import type Location from './Location';
import type VisitAttribute from './VisitAttribute';
import type Encounter from './Encounter';

export default class Visit extends Model {
  static table = 'tbl_visit';

  static associations = {
    tbl_patient:         { type: 'belongs_to' as const, key: 'patientuuid' },
    tbl_location:        { type: 'belongs_to' as const, key: 'locationuuid' },
    tbl_visit_attribute: { type: 'has_many' as const, foreignKey: 'visit_uuid' },
    tbl_encounter:       { type: 'has_many' as const, foreignKey: 'visituuid' },
  };

  @field('uuid')            uuid!: string;   // PRIMARY KEY in Android
  @field('patientuuid')     patientuuid!: string;
  @field('startdate')       startdate!: string;
  @field('enddate')         enddate!: string;
  @field('visit_type_uuid') visit_type_uuid!: string;
  @field('locationuuid')    locationuuid!: string;
  @field('creator')         creator!: string;
  @field('modified_date')   modified_date!: string;
  @field('isdownloaded')    isdownloaded!: string;
  @field('voided')          voided!: string;
  @field('sync')            sync!: string;
  @field('issubmitted')     issubmitted!: number;

  @relation('tbl_patient',  'patientuuid')  patient!: Patient;
  @relation('tbl_location', 'locationuuid') location!: Location;

  @children('tbl_visit_attribute') visitAttributes!: Query<VisitAttribute>;
  @children('tbl_encounter')       encounters!: Query<Encounter>;
}
