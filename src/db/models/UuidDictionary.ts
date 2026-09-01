import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

// WatermelonDB id stores the uuid value (Android PK column is `uuid`).
export default class UuidDictionary extends Model {
  static table = 'tbl_uuid_dictionary';

  @field('name') name!: string;

  get uuid(): string {
    return this.id;
  }
}
