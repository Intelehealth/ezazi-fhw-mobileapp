import { Fragment } from 'react';
import { isPostpartumAlert } from '../../modules/dashboard/postpartum-report/postpartum-report.alerts';
import type {
  PostpartumColumn,
  PostpartumRow,
  PostpartumSection,
} from '../../modules/dashboard/postpartum-report/postpartum-report.types';
import { formatDateTime24h, formatTime12h } from '../../utils/date-format';

const CELL_CLASS =
  'min-w-[120px] border border-[#dee2e6] p-2 text-center align-middle text-sm';
const LABEL_CLASS =
  'min-w-[220px] border border-[#dee2e6] p-2 text-left align-middle text-sm font-semibold text-[#212529]';

/* A section's header row: its title, then each column's label and time. */
function HeaderRow({
  title,
  columns,
}: {
  title: string;
  columns: PostpartumColumn[];
}) {
  return (
    <tr>
      <th scope="col" className={`${LABEL_CLASS} bg-[#f8f9fa]`}>
        {title}
      </th>
      {columns.map((column, index) => (
        <th
          key={index}
          scope="col"
          className={`${CELL_CLASS} font-semibold ${
            column.isSos
              ? 'bg-[#d32f2f] text-white'
              : 'bg-[#f8f9fa] text-[#212529]'
          }`}
        >
          <div className="mb-1">{column.label}</div>
          {column.time && (
            <small
              className={`font-normal ${column.isSos ? 'text-white' : 'text-[#6c757d]'}`}
            >
              {formatDateTime24h(column.time)}
            </small>
          )}
        </th>
      ))}
    </tr>
  );
}

/* BP is plotted as its two halves, one per line. */
function ReadingValue({ rowKey, value }: { rowKey: string; value: string }) {
  if (rowKey !== 'bp') return <>{value}</>;
  const [systolic, diastolic] = value.split('/');
  return (
    <>
      {systolic && <div>Systolic: {systolic}</div>}
      {diastolic && <div>Diastolic: {diastolic}</div>}
    </>
  );
}

function SectionRows({
  section,
  rows,
}: {
  section: PostpartumSection;
  rows: PostpartumRow[];
}) {
  return rows.map(row => (
    <tr key={`${section}-${row.key}`}>
      <th scope="row" className={LABEL_CLASS}>
        {row.label}
      </th>
      {row.kind === 'reading'
        ? row.values.map((value, index) => {
            const isAlert = isPostpartumAlert(section, row.key, value);
            return (
              <td key={index} className={CELL_CLASS}>
                {value && (
                  <div
                    data-alert={isAlert || undefined}
                    className={`mx-auto w-fit min-w-5 rounded px-1.5 py-0.5 ${
                      isAlert ? 'bg-[#ffebee] text-[#d32f2f]' : 'text-[#007bff]'
                    }`}
                  >
                    <ReadingValue rowKey={row.key} value={value} />
                  </div>
                )}
              </td>
            );
          })
        : row.values.map((entries, index) => (
            <td key={index} className={`${CELL_CLASS} align-top`}>
              {entries.map(entry => (
                <div
                  key={entry.uuid}
                  className="my-0.5 rounded border border-[#cfe5ff] bg-[#eef6ff] px-1.5 py-0.5 text-left text-[11px]"
                >
                  {entry.value}{' '}
                  <small>
                    <i>
                      ({entry.initial} {formatTime12h(entry.obsDatetime)})
                    </i>
                  </small>
                </div>
              ))}
            </td>
          ))}
    </tr>
  ));
}

interface PostpartumMonitoringTableComponentProps {
  columns: PostpartumColumn[];
  maternal: PostpartumRow[];
  newborn: PostpartumRow[];
}

/*
 * stage3.component.html's monitoring grid: the mother's vitals after
 * delivery, then the newborn's condition, one column per scheduled check or
 * SOS reading. Out-of-range readings are flagged red.
 */
export function PostpartumMonitoringTableComponent({
  columns,
  maternal,
  newborn,
}: PostpartumMonitoringTableComponentProps) {
  const sections = [
    {
      section: 'maternal',
      title: 'Maternal Vitals (after delivery)',
      rows: maternal,
    },
    { section: 'newborn', title: 'Newborn Condition', rows: newborn },
  ] as const;

  return (
    <div className="w-full overflow-x-auto">
      <table className="m-0 w-full min-w-[1200px] border-collapse bg-white">
        <tbody>
          {sections.map(({ section, title, rows }) => (
            <Fragment key={section}>
              <HeaderRow title={title} columns={columns} />
              <SectionRows section={section} rows={rows} />
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
