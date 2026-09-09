import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class UuidDictionary extends Model {
  static table = 'tbl_uuid_dictionary';

  @field('uuid') uuid!: string;   // PRIMARY KEY in Android
  @field('name') name!: string;
}
