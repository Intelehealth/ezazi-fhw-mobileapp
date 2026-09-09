import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Location extends Model {
  static table = 'tbl_location';

  @field('name')          name!: string;
  @field('locationuuid')  locationuuid!: string;   // PRIMARY KEY in Android
  @field('retired')       retired!: number;
  @field('modified_date') modified_date!: string;
  @field('voided')        voided!: string;
  @field('sync')          sync!: string;
}
