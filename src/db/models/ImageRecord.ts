import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

import type Patient from './Patient';

export default class ImageRecord extends Model {
  static table = 'tbl_image_records';

  static associations = {
    tbl_patient: { type: 'belongs_to' as const, key: 'patientuuid' },
  };

  @field('patientuuid')   patientuuid!: string;
  @field('visituuid')     visituuid!: string;
  @field('encounteruuid') encounteruuid!: string;
  @field('image_path')    image_path!: string;
  @field('obs_time_date') obs_time_date!: string;
  @field('image_type')    image_type!: string;
  @field('voided')        voided!: string;
  @field('sync')          sync!: string;

  @relation('tbl_patient', 'patientuuid') patient!: Patient;
}
