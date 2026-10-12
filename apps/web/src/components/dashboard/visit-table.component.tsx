import type { VisitRow } from '../../modules/dashboard/dashboard.types';
import userIcon from '../../assets/svgs/user.svg';
import { AlertCountBadgeComponent } from './alert-count-badge.component';

/**
 * The three visit tables in dashboard.component.html render almost the same
 * columns — only "In-progress"/"Priority" vs "Completed" differ (labour
 * duration vs date of birth, plus completed's extra birth-outcome/reason
 * columns). `variant` picks the right set instead of duplicating the table.
 */
export type VisitTableVariant = 'active' | 'completed';

interface VisitTableComponentProps {
  rows: VisitRow[];
  variant: VisitTableVariant;
  emptyMessage: string;
  onRowClick?: (row: VisitRow) => void;
}

export function VisitTableComponent({
  rows,
  variant,
  emptyMessage,
  onRowClick,
}: VisitTableComponentProps) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[#7F7B92]">{emptyMessage}</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1 text-left">
        <thead>
          <tr className="text-sm font-bold text-[#7F7B92]">
            <th className="pr-6 font-bold">Patient Name & ID</th>
            <th className="pr-6 font-bold">Age</th>
            <th className="pr-6 font-bold">
              {variant === 'completed'
                ? 'Date & Time of Birth'
                : 'In-labour duration'}
            </th>
            <th className="pr-6 font-bold">No. of Alerts</th>
            <th className="pr-6 font-bold">Stage</th>
            <th className="pr-6 font-bold">Cervix [Plot X]</th>
            <th className="pr-6 font-bold">Descent [Plot O]</th>
            <th className="pr-6 font-bold">Alarming readings</th>
            {variant === 'completed' && (
              <th className="pr-6 font-bold">Birth Outcome</th>
            )}
            {variant === 'completed' && (
              <th className="pr-6 font-bold">Reason</th>
            )}
            <th className="pr-6 font-bold">Provider</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.uuid}
              onClick={() => onRowClick?.(row)}
              className={`h-[88px] cursor-pointer text-sm ${
                row.isUnseen
                  ? 'bg-[#E6FFF3]'
                  : index % 2 === 1
                    ? 'bg-[#F7F7FA]'
                    : 'bg-white'
              }`}
            >
              <td className="rounded-l-lg pr-6">
                <div className="flex items-center">
                  <img
                    src={row.patient.avatarUrl ?? userIcon}
                    onError={e => {
                      e.currentTarget.src = userIcon;
                    }}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <div className="ml-2 flex flex-col">
                    <span className="font-bold">
                      {row.patient.name} ({row.patient.gender})
                    </span>
                    <span>{row.patient.identifier}</span>
                  </div>
                </div>
              </td>
              <td className="pr-6">{row.patient.age}y</td>
              <td className="pr-6">
                {variant === 'completed'
                  ? (row.dateTimeOfBirth ?? '-')
                  : (row.inLabourDuration ?? '-')}
              </td>
              <td className="pr-6">
                <AlertCountBadgeComponent count={row.alertCount} />
              </td>
              <td className="pr-6">Stage {row.stage}</td>
              <td className="pr-6">{row.cervixPlotX ?? '-'}</td>
              <td className="pr-6">{row.descentPlotO ?? '-'}</td>
              <td className="pr-6">
                <ul className="m-0 list-none py-2.5">
                  {row.alarmingReadings.map(note => (
                    <li key={note.key}>
                      {note.key} ({note.value})
                    </li>
                  ))}
                </ul>
              </td>
              {variant === 'completed' && (
                <td className="pr-6">
                  <div className="flex items-center">
                    {row.birthOutcome ?? '-'}
                    {row.birthOutcomeOther && (
                      <span
                        className="ml-1 text-xs text-[#7F7B92]"
                        title={row.birthOutcomeOther}
                      >
                        ⓘ
                      </span>
                    )}
                  </div>
                </td>
              )}
              {variant === 'completed' && (
                <td className="pr-6">
                  <div className="flex items-center">
                    {row.completeReason ?? '-'}
                    {(row.outOfTimeReason || row.referTypeOtherReason) && (
                      <span
                        className="ml-1 text-xs text-[#7F7B92]"
                        title={row.outOfTimeReason ?? row.referTypeOtherReason}
                      >
                        ⓘ
                      </span>
                    )}
                  </div>
                </td>
              )}
              <td className="rounded-r-lg pr-6">{row.provider}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
