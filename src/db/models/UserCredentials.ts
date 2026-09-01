import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

// Android tbl_user_credentials has no uuid PK — WatermelonDB auto-generates id.
export default class UserCredentials extends Model {
  static table = 'tbl_user_credentials';

  @field('username')           username!: string;
  @field('password')           password!: string;
  @field('creator_uuid_cred')  creator_uuid_cred!: string;
  @field('chwname')            chwname!: string;
  @field('provider_uuid_cred') provider_uuid_cred!: string;
}
