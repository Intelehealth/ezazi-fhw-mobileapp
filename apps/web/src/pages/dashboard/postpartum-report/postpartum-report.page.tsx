import { useParams } from 'react-router-dom';
import { PostpartumReportComponent } from '../../../modules/dashboard/postpartum-report/postpartum-report.component';

/*
 * The route target for `${ROUTES.DASHBOARD_POSTPARTUM_REPORT}/:visitUuid`.
 * No sidebar or header: the Angular `dashboard/stage3` route sits outside
 * MainContainerComponent, so the report renders on its own, in
 * stage3.component.html's `.container-fluid` (15px side gutters) on the
 * white page.
 */
export default function PostpartumReportPage() {
  /* Always set: the route only matches with a visit uuid. */
  const { visitUuid = '' } = useParams<{ visitUuid: string }>();

  return (
    <main className="min-h-screen w-full bg-white px-[15px] py-4">
      {/* Keyed so another visit starts from its own report. */}
      <PostpartumReportComponent key={visitUuid} visitUuid={visitUuid} />
    </main>
  );
}
