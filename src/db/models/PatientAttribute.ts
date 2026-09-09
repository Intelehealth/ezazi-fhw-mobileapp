import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

import type Patient from './Patient';

export default class PatientAttribute extends Model {
  static table = 'tbl_patient_attribute';

  static associations = {
    tbl_patient: { type: 'belongs_to' as const, key: 'patientuuid' },
  };

  @field('uuid')                       uuid!: string;   // PRIMARY KEY in Android
  @field('value')                      value!: string;
  @field('person_attribute_type_uuid') person_attribute_type_uuid!: string;
  @field('patientuuid')                patientuuid!: string;
  @field('modified_date')              modified_date!: string;
  @field('voided')                     voided!: string;
  @field('sync')                       sync!: string;

  @relation('tbl_patient', 'patientuuid') patient!: Patient;
}
