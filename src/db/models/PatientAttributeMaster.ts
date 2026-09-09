import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class PatientAttributeMaster extends Model {
  static table = 'tbl_patient_attribute_master';

  @field('uuid')          uuid!: string;   // PRIMARY KEY in Android
  @field('name')          name!: string;
  @field('modified_date') modified_date!: string;
  @field('voided')        voided!: string;
  @field('sync')          sync!: string;
}
