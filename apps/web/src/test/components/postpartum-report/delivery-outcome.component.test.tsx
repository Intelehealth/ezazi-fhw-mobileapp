import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeliveryOutcomeComponent } from '../../../components/postpartum-report/delivery-outcome.component';
import type { PostpartumDeliveryOutcome } from '../../../modules/dashboard/postpartum-report/postpartum-report.types';

const EMPTY: PostpartumDeliveryOutcome = {
  deliveryDate: null,
  deliveryTime: null,
  deliveryMode: null,
  placentaMembraneDelivery: null,
  placentaDeliveryTime: null,
  placentaCordAbnormality: null,
  perinealLaceration: null,
  degreeOfTear: null,
  amtslMedication: [],
  babyStatus: null,
  babyGender: null,
  babyWeight: null,
  apgar1: null,
  apgar5: null,
  resuscitation: null,
  skinToSkin: null,
  breastfeedingInOneHour: null,
  gestationWeeks: null,
  congenitalDisorders: [],
};

/* The table cell holding `label`. */
function cellOf(label: string) {
  return screen.getByText(label).closest('td');
}

describe('DeliveryOutcomeComponent', () => {
  it('shows "-" for every detail not recorded, and NA for a missing name or ID', () => {
    render(
      <DeliveryOutcomeComponent
        patient={{ name: '', openMrsId: null }}
        outcome={EMPTY}
      />
    );

    expect(cellOf('Name:')).toHaveTextContent('Name: NA');
    expect(cellOf('OpenMRS ID:')).toHaveTextContent('OpenMRS ID: NA');
    for (const label of [
      'Delivery Date:',
      'Delivery Time:',
      'Delivery Mode:',
      'Placenta & Membrane Delivery:',
      'Placenta Delivery Time:',
      'Placenta/Cord Abnormality:',
      'Perineal Laceration:',
      'Degree of Tear:',
      'AMTSL Medication:',
      'Baby Status:',
      'Baby Gender:',
      'Baby Weight (in grams):',
      'APGAR Score:',
      'Resuscitation:',
      'Skin-to-Skin:',
      'Breast-feeding (in 1 hour):',
      'Gestation (weeks):',
    ]) {
      expect(cellOf(label)).toHaveTextContent(`${label} -`);
    }
    /* Gestation takes the whole row when there are no disorders. */
    expect(cellOf('Gestation (weeks):')).toHaveAttribute('colspan', '4');
    expect(screen.queryByText('Congenital Disorders:')).not.toBeInTheDocument();
  });

  it('shows a half-recorded APGAR score with "-" for the missing half', () => {
    render(
      <DeliveryOutcomeComponent
        patient={{ name: 'Priya Devi', openMrsId: '10045-6' }}
        outcome={{ ...EMPTY, apgar5: '9' }}
      />
    );

    expect(cellOf('APGAR Score:')).toHaveTextContent('APGAR Score: -/9');
  });

  it('lists congenital disorders beside the gestation', () => {
    render(
      <DeliveryOutcomeComponent
        patient={{ name: 'Priya Devi', openMrsId: '10045-6' }}
        outcome={{
          ...EMPTY,
          gestationWeeks: '37',
          congenitalDisorders: ['Cleft lip', 'Club foot'],
        }}
      />
    );

    expect(cellOf('Gestation (weeks):')).toHaveAttribute('colspan', '2');
    expect(cellOf('Congenital Disorders:')).toHaveTextContent(
      'Cleft lip, Club foot'
    );
  });
});
