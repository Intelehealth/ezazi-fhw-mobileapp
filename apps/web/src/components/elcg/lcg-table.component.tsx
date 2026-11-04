import type { ReactNode } from 'react';
import {
  BABY_SECTION,
  CERVIX_PLOT_ROWS,
  CERVIX_STAGE2_INSTRUCTION,
  CONTRACTION_ROWS,
  DESCENT_PLOT_ROWS,
  LCG_ABBREVIATIONS,
  LCG_FOOTER_INSTRUCTIONS,
  SUPPORTIVE_CARE_SECTION,
  WOMAN_SECTION,
  type LcgReadingRowConfig,
} from '../../modules/dashboard/elcg/elcg.row-config';
import type {
  ElcgView,
  LcgColumn,
  LcgHour,
  LcgIvFluidEntry,
  LcgNoteEntry,
  LcgOxytocinEntry,
  LcgReading,
  LcgStageNo,
  LcgStageValues,
  LcgVisitCompletion,
} from '../../modules/dashboard/elcg/elcg.types';
import { formatDate, formatTime } from '../../utils/date-format';
import { TooltipComponent } from '../common/tooltip.component';
import {
  BORDERLESS_CELL_CLASS,
  CELL_CLASS,
  DecisionNotes,
  DividerRow,
  IvFluidNote,
  MedicineNotes,
  OxytocinNote,
  StageArrow,
  StageGapCell,
  ValueItemComponent,
  VerticalHeaderCell,
  halfHourlyClass,
} from './lcg-cells.component';

/** The section header, label and ALERT columns to the left of the first stage. */
const LABEL_COLUMNS = 4;

/* Contractions, the cervix and descent plots, and the two spacer rows between them. */
const LABOUR_PROGRESS_ROWS =
  CONTRACTION_ROWS.length +
  CERVIX_PLOT_ROWS.length +
  DESCENT_PLOT_ROWS.length +
  2;

/** Bootstrap's `bg-secondary` — the guide's greyed-out ALERT cells. */
const GREYED_CELL_CLASS = `${CELL_CLASS} bg-[#6c757d]`;

const SOS_CELL_CLASS = 'border-2 border-[red] bg-[#FFE9EF]';

interface LcgTableComponentProps {
  title: string;
  view: ElcgView;
  onViewAssessment?: (stage: LcgStageNo, hourIndex: number) => void;
  onViewPlan?: (stage: LcgStageNo, hourIndex: number) => void;
}

/** "NA" for anything not recorded, like Angular's `noValue:'NA'` pipe. */
function orNa(value: string | null | undefined): string {
  return value || 'NA';
}

/**
 * partogram.component.html's header-row colspans. Each row's last field takes
 * whatever columns remain, so the row never spans more than the grid (the
 * Angular rows add up to 59 of its 55 columns, widening the table past them).
 */
const HEADER_ROW_SPANS = {
  details: [6, 6, 6, 15],
  history: [14],
  dates: [18, 18],
};

const HEADER_CELL_CLASS =
  'border-none p-2 text-left align-middle text-base font-bold text-[#007bff]';

/** A "Label: value" header cell — label in black, value in the guide's blue. */
function HeaderField({
  label,
  colSpan,
  children,
}: {
  label: string;
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <td colSpan={colSpan} className={HEADER_CELL_CLASS}>
      <span className="text-black">{label}</span> {children}
    </td>
  );
}

/** The columns left for a row's last field after its fixed spans. */
function remaining(total: number, spans: number[]): number {
  return Math.max(1, total - spans.reduce((sum, span) => sum + span, 0));
}

function PatientHeaderRows({
  title,
  view,
  colSpan,
}: {
  title: string;
  view: ElcgView;
  colSpan: number;
}) {
  const { patient } = view;
  const membrane = patient.membraneRuptured;
  const { details, history, dates } = HEADER_ROW_SPANS;

  return (
    <>
      <tr>
        <td colSpan={colSpan} className="border-none p-2">
          <h1 className="m-0 text-center text-2xl leading-[150%] font-bold text-black">
            {title}
          </h1>
        </td>
      </tr>
      <tr>
        <HeaderField label="Name:" colSpan={details[0]}>
          {orNa(patient.name)}
        </HeaderField>
        <HeaderField label="Hospital ID:" colSpan={details[1]}>
          {orNa(patient.hospitalId)}
        </HeaderField>
        <HeaderField label="Parity:" colSpan={details[2]}>
          {orNa(patient.parity)}
        </HeaderField>
        <HeaderField label="Labour onset:" colSpan={details[3]}>
          {orNa(patient.labourOnset)}
        </HeaderField>
        <HeaderField
          label="Active labour diagnosis:"
          colSpan={remaining(colSpan, details)}
        >
          <span className="text-black">[Date</span>{' '}
          {orNa(formatDate(patient.activeLabourDiagnosed))}{' '}
          <span className="text-black">]</span>
        </HeaderField>
      </tr>
      <tr>
        <HeaderField label="Ruptured membranes:" colSpan={history[0]}>
          {membrane?.kind === 'date' ? (
            <>
              <span className="text-black">[Date</span>{' '}
              {orNa(formatDate(membrane.value))}{' '}
              <span className="text-black">Time</span>{' '}
              {orNa(formatTime(membrane.value))}
              <span className="text-black">]</span>
            </>
          ) : (
            orNa(membrane?.value)
          )}
        </HeaderField>
        <HeaderField
          label="Risk factors:"
          colSpan={remaining(colSpan, history)}
        >
          {orNa(patient.riskFactors)}
        </HeaderField>
      </tr>
      <tr>
        <HeaderField label="Gravida:" colSpan={dates[0]}>
          {orNa(patient.gravida)}
        </HeaderField>
        <HeaderField label="LMP:" colSpan={dates[1]}>
          {orNa(formatDate(patient.lmp))}
        </HeaderField>
        <HeaderField label="EDD:" colSpan={remaining(colSpan, dates)}>
          {orNa(formatDate(patient.edd))}
        </HeaderField>
      </tr>
    </>
  );
}

function TimeCells({ columns }: { columns: LcgColumn[] }) {
  return columns.map((column, index) => {
    const isSos = Boolean(column.time) && column.isSos;
    return (
      <td
        key={index}
        className={`${CELL_CLASS} ${isSos ? SOS_CELL_CLASS : ''}`}
      >
        {column.time && (
          <ValueItemComponent>
            {formatDate(column.time)}
            <br />
            {formatTime(column.time)}
            {isSos && (
              <h5 className="m-0 text-center font-bold text-[red]">SOS</h5>
            )}
          </ValueItemComponent>
        )}
      </td>
    );
  });
}

/** One cell per hour, spanning that hour's sub-columns. */
function HourCells({
  hours,
  render,
}: {
  hours: LcgHour[];
  render: (hour: LcgHour, index: number) => ReactNode;
}) {
  return hours.map((hour, index) => (
    <td key={index} colSpan={hour.subColumns} className={CELL_CLASS}>
      {render(hour, index)}
    </td>
  ));
}

function ReadingCells({
  values,
  isHalfHourly = false,
  render = reading => <ValueItemComponent reading={reading} />,
}: {
  values: (LcgReading | null)[];
  isHalfHourly?: boolean;
  render?: (reading: LcgReading) => ReactNode;
}) {
  return values.map((reading, index) => (
    <td
      key={index}
      className={`${CELL_CLASS} ${isHalfHourly ? halfHourlyClass(index) : ''}`}
    >
      {reading && render(reading)}
    </td>
  ));
}

/** One cell per sub-column, holding every entry recorded in that slot. */
function EntryCells<T>({
  cells,
  render,
}: {
  cells: T[][];
  render: (entries: T[]) => ReactNode;
}) {
  return cells.map((entries, index) => (
    <td key={index} className={CELL_CLASS}>
      {render(entries)}
    </td>
  ));
}

const oxytocinNotes = (entries: LcgOxytocinEntry[]) =>
  entries.map(entry => <OxytocinNote key={entry.uuid} entry={entry} />);
const medicineNotes = (entries: LcgNoteEntry[]) => (
  <MedicineNotes entries={entries} />
);
const ivFluidNotes = (entries: LcgIvFluidEntry[]) =>
  entries.map(entry => <IvFluidNote key={entry.uuid} entry={entry} />);

function ReadingRow({
  row,
  values,
  leading,
}: {
  row: LcgReadingRowConfig;
  values: LcgStageValues<LcgReading | null>;
  leading?: ReactNode;
}) {
  return (
    <tr>
      {leading}
      <td colSpan={2} className={CELL_CLASS}>
        {row.label}
      </td>
      <td className={CELL_CLASS}>{row.alertCriteria}</td>
      <ReadingCells values={values.stage1} isHalfHourly={row.isHalfHourly} />
      <StageGapCell />
      <ReadingCells values={values.stage2} isHalfHourly={row.isHalfHourly} />
    </tr>
  );
}

/** "ⓘ" with the reason on hover — Angular's red `info_outline` mat-icon. */
function ReasonInfo({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <TooltipComponent label={reason} position="right">
      <span tabIndex={0} aria-label={reason} className="mt-1 text-[red]">
        ⓘ
      </span>
    </TooltipComponent>
  );
}

/**
 * The birth outcome written down the second stage once the visit is complete
 * (`.birth-outcome-con`). Omitted when a Stage 3 outcome exists — the Visit
 * Complete Details card links to it instead.
 */
function BirthOutcomeOverlay({
  completion,
}: {
  completion: LcgVisitCompletion;
}) {
  const { reason } = completion;
  if (completion.hasStage3 || !reason) return null;

  let content: ReactNode;
  switch (reason.kind) {
    case 'referred':
      content = <div className="whitespace-pre-wrap">{reason.referType}</div>;
      break;
    case 'out-of-time':
      content = (
        <>
          <div>OUT OF TIME</div>
          <ReasonInfo reason={reason.reason} />
        </>
      );
      break;
    case 'other':
      content = (
        <>
          <div>OTHER</div>
          <ReasonInfo reason={reason.reason} />
        </>
      );
      break;
    case 'newborn':
      content = (
        <div className="flex flex-col">
          <div className="flex items-center justify-center">
            <div>{reason.birthOutcome.toUpperCase()}</div>
            {reason.birthOutcome.toUpperCase() === 'OTHER' && (
              <ReasonInfo reason={reason.birthOutcomeOther} />
            )}
          </div>
          <div className="flex items-center justify-center">
            <div>
              Mother Status: {reason.motherDeceasedReason ? 'Death' : 'Healthy'}
            </div>
            <ReasonInfo reason={reason.motherDeceasedReason} />
          </div>
        </div>
      );
      break;
  }

  return (
    <div className="absolute top-1/2 left-1/2 flex max-h-[300px] -translate-x-1/2 -translate-y-1/2 rotate-180 items-center justify-center px-[5px] py-2.5 text-xl whitespace-nowrap text-[#007bff] [writing-mode:vertical-rl]">
      {content}
    </div>
  );
}

/**
 * partogram.component.html's WHO Labour Care Guide grid — one column per
 * encounter slot (sub-column) across the active first stage, a blank gap,
 * then the second stage. Purely presentational: every value arrives
 * already laid out in `view` (see modules/dashboard/elcg/elcg.types.ts).
 *
 * Angular sizes its spacer rows with fixed colspans (55, 47, 46) and a
 * `rowspan="52"` stage-gap cell, which drift out of line as soon as an SOS
 * encounter widens an hour; here every span is derived from the stages.
 */
export function LcgTableComponent({
  title,
  view,
  onViewAssessment,
  onViewPlan,
}: LcgTableComponentProps) {
  const { stage1, stage2, readings, medication, completion } = view;
  const stage1Columns = stage1.columns.length;
  const stage2Columns = stage2.columns.length;
  const totalColumns = LABEL_COLUMNS + stage1Columns + 1 + stage2Columns;
  /* Spacer rows inside a section sit beside its rowspanned header cell. */
  const sectionDividerColumns = totalColumns - 1;

  const showOutcomeRow = completion !== null;
  const supportiveCareRows = SUPPORTIVE_CARE_SECTION.rows;

  function decisionCells(stage: LcgStageNo, kind: 'assessment' | 'plan') {
    const hours = stage === 1 ? stage1.hours : stage2.hours;
    return (
      <HourCells
        hours={hours}
        render={(hour, index) =>
          hour.hasEncounter && (
            <DecisionNotes
              entries={kind === 'assessment' ? hour.assessments : hour.plans}
              viewLabel={`View stage ${stage} hour ${index + 1} ${kind}`}
              onView={() =>
                kind === 'assessment'
                  ? onViewAssessment?.(stage, index)
                  : onViewPlan?.(stage, index)
              }
            />
          )
        }
      />
    );
  }

  return (
    <table
      id="partogram-print-table"
      className="w-full border-collapse border border-black bg-white font-['DM_Sans']"
    >
      <tbody>
        <PatientHeaderRows title={title} view={view} colSpan={totalColumns} />

        <tr>
          <td colSpan={3} className={BORDERLESS_CELL_CLASS} />
          <td className={CELL_CLASS}>Time</td>
          <TimeCells columns={stage1.columns} />
          <StageGapCell />
          <TimeCells columns={stage2.columns} />
        </tr>
        <tr>
          <td colSpan={3} className={BORDERLESS_CELL_CLASS} />
          <td className={CELL_CLASS}>Hours</td>
          <HourCells hours={stage1.hours} render={(_, index) => index + 1} />
          <StageGapCell />
          <HourCells hours={stage2.hours} render={(_, index) => index + 1} />
        </tr>
        <DividerRow colSpan={totalColumns} />

        <tr className="[text-shadow:0_0_1px_#000]">
          <td colSpan={3} className={BORDERLESS_CELL_CLASS} />
          <td className={CELL_CLASS}>ALERT</td>
          <td colSpan={stage1Columns} className={BORDERLESS_CELL_CLASS}>
            <StageArrow label="ACTIVE FIRST STAGE" />
          </td>
          <StageGapCell />
          <td colSpan={stage2Columns} className={BORDERLESS_CELL_CLASS}>
            <StageArrow label="SECOND STAGE" />
          </td>
        </tr>
        <DividerRow colSpan={totalColumns} />

        {/* Supportive care — the completed visit's outcome row sits between
            Pain Relief and Oral Fluid, as in the Angular template. */}
        {supportiveCareRows.slice(0, 2).map((row, index) => (
          <ReadingRow
            key={row.key}
            row={row}
            values={readings[row.key]}
            leading={
              index === 0 && (
                <VerticalHeaderCell
                  title={SUPPORTIVE_CARE_SECTION.title}
                  rowSpan={supportiveCareRows.length + (showOutcomeRow ? 1 : 0)}
                />
              )
            }
          />
        ))}
        {completion && (
          <tr>
            <td
              colSpan={3 + stage1Columns}
              className="relative border-none p-0"
            />
            <StageGapCell />
            <td colSpan={stage2Columns} className="relative border-none p-0">
              <BirthOutcomeOverlay completion={completion} />
            </td>
          </tr>
        )}
        {supportiveCareRows.slice(2).map(row => (
          <ReadingRow key={row.key} row={row} values={readings[row.key]} />
        ))}
        <DividerRow colSpan={totalColumns} />

        {[BABY_SECTION, WOMAN_SECTION].map(section => (
          <SectionRows
            key={section.title}
            title={section.title}
            rows={section.rows}
            readings={readings}
            totalColumns={totalColumns}
          />
        ))}

        {/* Labour progress: contractions, then the cervix and descent plots. */}
        {CONTRACTION_ROWS.map((row, index) => (
          <ReadingRow
            key={row.key}
            row={row}
            values={readings[row.key]}
            leading={
              index === 0 && (
                <VerticalHeaderCell
                  title="LABOUR PROGRESS"
                  rowSpan={LABOUR_PROGRESS_ROWS}
                />
              )
            }
          />
        ))}
        <DividerRow colSpan={sectionDividerColumns} />
        {CERVIX_PLOT_ROWS.map((plotRow, index) => (
          <tr key={plotRow.value}>
            {index === 0 && (
              <td rowSpan={CERVIX_PLOT_ROWS.length} className={CELL_CLASS}>
                Cervix [Plot X]
              </td>
            )}
            <td className={CELL_CLASS}>{plotRow.value}</td>
            <td
              className={plotRow.alertCriteria ? CELL_CLASS : GREYED_CELL_CLASS}
            >
              {plotRow.alertCriteria}
            </td>
            <ReadingCells
              values={readings.cervix.stage1.map(reading =>
                reading?.value === plotRow.value ? reading : null
              )}
              render={() => <ValueItemComponent>X</ValueItemComponent>}
            />
            <StageGapCell />
            {/* Second stage plots only full dilatation (10) and the start of
                pushing (P); the rows below it carry the instruction instead. */}
            {index === 0 && (
              <ReadingCells
                values={readings.cervix.stage2.map(reading =>
                  reading?.value === '10' || reading?.value === 'P'
                    ? reading
                    : null
                )}
                isHalfHourly
                render={reading => (
                  <ValueItemComponent>{reading.value}</ValueItemComponent>
                )}
              />
            )}
            {index === 1 && (
              <td
                colSpan={stage2Columns}
                rowSpan={CERVIX_PLOT_ROWS.length - 1}
                className={CELL_CLASS}
              >
                {/* Capped so the sentence wraps (Angular breaks it with
                    <br>s): left on one line, it would stretch every
                    second-stage column to fit it. */}
                <div className="mx-auto max-w-[240px]">
                  {CERVIX_STAGE2_INSTRUCTION}
                </div>
              </td>
            )}
          </tr>
        ))}
        <DividerRow colSpan={sectionDividerColumns} />
        {DESCENT_PLOT_ROWS.map((value, index) => {
          const plotDescent = (reading: LcgReading | null) =>
            reading?.value === value ? reading : null;
          const renderO = () => <ValueItemComponent>O</ValueItemComponent>;
          return (
            <tr key={value}>
              {index === 0 && (
                <td rowSpan={DESCENT_PLOT_ROWS.length} className={CELL_CLASS}>
                  Descent [Plot O]
                </td>
              )}
              <td className={CELL_CLASS}>{value}</td>
              <td className={GREYED_CELL_CLASS} />
              <ReadingCells
                values={readings.descent.stage1.map(plotDescent)}
                render={renderO}
              />
              <StageGapCell />
              <ReadingCells
                values={readings.descent.stage2.map(plotDescent)}
                render={renderO}
              />
            </tr>
          );
        })}
        <DividerRow colSpan={totalColumns} />

        <tr>
          <VerticalHeaderCell title="MEDICATION ADMINISTRATION" rowSpan={3} />
          <td colSpan={3} className={CELL_CLASS}>
            Oxytocin (U/L, drops/min)
          </td>
          <EntryCells
            cells={medication.oxytocin.stage1}
            render={oxytocinNotes}
          />
          <StageGapCell />
          <EntryCells
            cells={medication.oxytocin.stage2}
            render={oxytocinNotes}
          />
        </tr>
        <tr>
          <td colSpan={3} className={CELL_CLASS}>
            Medicine
          </td>
          <EntryCells
            cells={medication.medicine.stage1}
            render={medicineNotes}
          />
          <StageGapCell />
          <EntryCells
            cells={medication.medicine.stage2}
            render={medicineNotes}
          />
        </tr>
        <tr>
          <td colSpan={3} className={CELL_CLASS}>
            IV fluids
          </td>
          <EntryCells
            cells={medication.ivFluids.stage1}
            render={ivFluidNotes}
          />
          <StageGapCell />
          <EntryCells
            cells={medication.ivFluids.stage2}
            render={ivFluidNotes}
          />
        </tr>
        <DividerRow colSpan={totalColumns} />

        <tr>
          <VerticalHeaderCell title="SHARED DECISION-MAKING" rowSpan={3} />
          <td colSpan={3} className={CELL_CLASS}>
            ASSESSMENT
          </td>
          {decisionCells(1, 'assessment')}
          <StageGapCell />
          {decisionCells(2, 'assessment')}
        </tr>
        <DividerRow colSpan={sectionDividerColumns} />
        <tr>
          <td colSpan={3} className={CELL_CLASS}>
            PLAN
          </td>
          {decisionCells(1, 'plan')}
          <StageGapCell />
          {decisionCells(2, 'plan')}
        </tr>
        <DividerRow colSpan={totalColumns} />

        <tr>
          <td className={BORDERLESS_CELL_CLASS} />
          <td colSpan={3} className={CELL_CLASS}>
            INITIALS
          </td>
          <HourCells
            hours={stage1.hours}
            render={hour =>
              hour.initials && (
                <ValueItemComponent>{hour.initials}</ValueItemComponent>
              )
            }
          />
          <StageGapCell />
          <HourCells
            hours={stage2.hours}
            render={hour =>
              hour.initials && (
                <ValueItemComponent>{hour.initials}</ValueItemComponent>
              )
            }
          />
        </tr>
        <tr>
          <td
            colSpan={totalColumns}
            className={`${BORDERLESS_CELL_CLASS} text-left`}
          >
            {LCG_FOOTER_INSTRUCTIONS}
            <br />
            Abbreviations:{' '}
            {LCG_ABBREVIATIONS.map(([code, meaning], index) => (
              <span key={code}>
                {code} – <span className="font-normal">{meaning}</span>
                {index < LCG_ABBREVIATIONS.length - 1 && ', '}
              </span>
            ))}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** A plain section: its rows of single readings under one vertical header. */
function SectionRows({
  title,
  rows,
  readings,
  totalColumns,
}: {
  title: string;
  rows: LcgReadingRowConfig[];
  readings: ElcgView['readings'];
  totalColumns: number;
}) {
  return (
    <>
      {rows.map((row, index) => (
        <ReadingRow
          key={row.key}
          row={row}
          values={readings[row.key]}
          leading={
            index === 0 && (
              <VerticalHeaderCell title={title} rowSpan={rows.length} />
            )
          }
        />
      ))}
      <DividerRow colSpan={totalColumns} />
    </>
  );
}
