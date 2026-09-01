import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class RtcConnectionLog extends Model {
  static table = 'tbl_rtc_connection_log';

  @field('visit_uuid')      visit_uuid!: string;
  @field('connection_info') connection_info!: string;
}
