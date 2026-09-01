import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

// Android PK is `locationuuid` — WatermelonDB stores it as the built-in `id`.
// The getter below provides the Android-compatible alias.
export default class Location extends Model {
  static table = 'tbl_location';

  @field('name')          name!: string;
  @field('retired')       retired!: number;
  @field('modified_date') modified_date!: string;
  @field('voided')        voided!: string;
  @field('sync')          sync!: string;

  get locationuuid(): string {
    return this.id;
  }
}
