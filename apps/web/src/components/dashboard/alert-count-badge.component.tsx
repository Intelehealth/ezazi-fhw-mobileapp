import greenCircle from '../../assets/svgs/green-circle.svg';
import redTriangle from '../../assets/svgs/red-triangle.svg';

interface AlertCountBadgeComponentProps {
  count: number;
}

/**
 * The "No. of Alerts" pill from dashboard.component.html/.scss's `.alert-count`
 * — red triangle when there's at least one alert, green circle at zero.
 * (The Angular version also has a `.yellow` variant for a mid state that
 * table_column never actually assigns, so it's not reproduced here.)
 */
export function AlertCountBadgeComponent({
  count,
}: AlertCountBadgeComponentProps) {
  const isAlarming = count > 0;

  return (
    <div
      className={`flex h-[42px] w-[42px] items-center font-bold ${
        isAlarming
          ? 'items-end justify-center pb-0.5 text-[#ED1A56]'
          : 'justify-center text-[#019283]'
      }`}
      style={{
        // Quoted url(...): Vite's default SVG data-URI encoding leaves the
        // markup's single quotes (width='36' etc.) un-percent-encoded, which
        // desyncs an *unquoted* url() token and makes the browser drop the
        // whole background-image declaration as invalid.
        backgroundImage: `url("${isAlarming ? redTriangle : greenCircle}")`,
        backgroundSize: '100% 100%',
      }}
    >
      {count}
    </div>
  );
}
