import { Model } from '@nozbe/watermelondb';
import { field, children } from '@nozbe/watermelondb/decorators';

import type { Query } from '@nozbe/watermelondb';
import type PatientAttribute from './PatientAttribute';
import type Visit from './Visit';
import type ImageRecord from './ImageRecord';

export default class Patient extends Model {
  static table = 'tbl_patient';

  static associations = {
    tbl_patient_attribute: { type: 'has_many' as const, foreignKey: 'patientuuid' },
    tbl_visit:             { type: 'has_many' as const, foreignKey: 'patientuuid' },
    tbl_image_records:     { type: 'has_many' as const, foreignKey: 'patientuuid' },
  };

  @field('openmrs_id')       openmrs_id!: string;
  @field('first_name')       first_name!: string;
  @field('middle_name')      middle_name!: string;
  @field('last_name')        last_name!: string;
  @field('date_of_birth')    date_of_birth!: string;
  @field('phone_number')     phone_number!: string;
  @field('address1')         address1!: string;
  @field('address2')         address2!: string;
  @field('city_village')     city_village!: string;
  @field('state_province')   state_province!: string;
  @field('postal_code')      postal_code!: string;
  @field('country')          country!: string;
  @field('gender')           gender!: string;
  @field('sdw')              sdw!: string;
  @field('creatoruuid')      creatoruuid!: string;
  @field('occupation')       occupation!: string;
  @field('patient_photo')    patient_photo!: string;
  @field('economic_status')  economic_status!: string;
  @field('education_status') education_status!: string;
  @field('caste')            caste!: string;
  @field('dead')             dead!: string;
  @field('dateCreated')      dateCreated!: string;
  @field('modified_date')    modified_date!: string;
  @field('voided')           voided!: string;
  @field('sync')             sync!: string;

  @children('tbl_patient_attribute') patientAttributes!: Query<PatientAttribute>;
  @children('tbl_visit')             visits!: Query<Visit>;
  @children('tbl_image_records')     imageRecords!: Query<ImageRecord>;
}
