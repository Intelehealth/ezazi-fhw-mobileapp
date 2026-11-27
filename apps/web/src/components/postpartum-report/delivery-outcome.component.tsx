import type { ReactNode } from 'react';
import type {
  PostpartumDeliveryOutcome,
  PostpartumReportView,
} from '../../modules/dashboard/postpartum-report/postpartum-report.types';
import { formatTime12h, formatYearMonthNameDay } from '../../utils/date-format';

const CELL_CLASS =
  'min-w-[220px] border border-[#dee2e6] p-2.5 align-top text-sm';

function Field({
  label,
  colSpan,
  className = '',
  highlight = false,
  children,
}: {
  label: string;
  colSpan?: number;
  className?: string;
  /* The patient row: the value in blue, as `.page-title-row` styles it. */
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`${CELL_CLASS} ${highlight ? 'text-[#007bff]' : 'text-[#212529]'} ${className}`}
    >
      <span className="font-semibold text-[#212529]">{label}</span> {children}
    </td>
  );
}

const dash = (value: string | null) => value || '-';

function apgarScore({ apgar1, apgar5 }: PostpartumDeliveryOutcome): string {
  return apgar1 || apgar5 ? `${dash(apgar1)}/${dash(apgar5)}` : '-';
}

interface DeliveryOutcomeComponentProps {
  patient: PostpartumReportView['patient'];
  outcome: PostpartumDeliveryOutcome;
}

/*
 * The "DELIVERY OUTCOME REPORT" table heading the Postpartum Report —
 * stage3.component.html's `.delivery-outcome` block, four details a row.
 */
export function DeliveryOutcomeComponent({
  patient,
  outcome,
}: DeliveryOutcomeComponentProps) {
  const hasDisorders = outcome.congenitalDisorders.length > 0;

  return (
    <div className="mb-4 w-full overflow-x-auto">
      <table className="m-0 w-full border-collapse bg-white">
        <tbody>
          <tr>
            <td
              colSpan={4}
              className="border border-[#dee2e6] p-2.5 text-center text-lg font-bold tracking-[0.5px] text-[#212529]"
            >
              DELIVERY OUTCOME REPORT
            </td>
          </tr>
          <tr>
            <Field label="Name:" colSpan={2} highlight>
              {patient.name || 'NA'}
            </Field>
            <Field label="OpenMRS ID:" colSpan={2} highlight>
              {patient.openMrsId || 'NA'}
            </Field>
          </tr>
          <tr>
            <Field label="Delivery Date:">
              {formatYearMonthNameDay(outcome.deliveryDate) ?? '-'}
            </Field>
            <Field label="Delivery Time:">
              {formatTime12h(outcome.deliveryTime) ?? '-'}
            </Field>
            <Field label="Delivery Mode:">{dash(outcome.deliveryMode)}</Field>
            <Field label="Placenta & Membrane Delivery:">
              {dash(outcome.placentaMembraneDelivery)}
            </Field>
          </tr>
          <tr>
            <Field label="Placenta Delivery Time:">
              {formatTime12h(outcome.placentaDeliveryTime) ?? '-'}
            </Field>
            <Field label="Placenta/Cord Abnormality:">
              {dash(outcome.placentaCordAbnormality)}
            </Field>
            <Field label="Perineal Laceration:">
              {dash(outcome.perinealLaceration)}
            </Field>
            <Field label="Degree of Tear:">{dash(outcome.degreeOfTear)}</Field>
          </tr>
          <tr>
            <Field label="AMTSL Medication:" className="whitespace-pre-line">
              {outcome.amtslMedication.length
                ? outcome.amtslMedication.join('\n')
                : '-'}
            </Field>
            <Field label="Baby Status:">{dash(outcome.babyStatus)}</Field>
            <Field label="Baby Gender:">{dash(outcome.babyGender)}</Field>
            <Field label="Baby Weight (in grams):">
              {dash(outcome.babyWeight)}
            </Field>
          </tr>
          <tr>
            <Field label="APGAR Score:">{apgarScore(outcome)}</Field>
            <Field label="Resuscitation:">{dash(outcome.resuscitation)}</Field>
            <Field label="Skin-to-Skin:">{dash(outcome.skinToSkin)}</Field>
            <Field label="Breast-feeding (in 1 hour):">
              {dash(outcome.breastfeedingInOneHour)}
            </Field>
          </tr>
          <tr>
            <Field label="Gestation (weeks):" colSpan={hasDisorders ? 2 : 4}>
              {dash(outcome.gestationWeeks)}
            </Field>
            {hasDisorders && (
              <Field label="Congenital Disorders:" colSpan={2}>
                {outcome.congenitalDisorders.join(', ')}
              </Field>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
