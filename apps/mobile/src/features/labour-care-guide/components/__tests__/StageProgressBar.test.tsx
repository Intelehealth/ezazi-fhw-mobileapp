import '@/core/i18n';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import { colors } from '@/core/config/theme';

import type { LabourStage } from '../../domain/timeline.types';
import { StageProgressBar } from '../StageProgressBar';

const LABELS = ['1. Stage 1', '2. Stage 2', '3. Delivery Outcome', '4. Very Early PP'];

const labelStyle = (label: string) => StyleSheet.flatten(screen.getByText(label).props.style);

// The row's four segments, each a bar above its label, in stage order.
const barColours = (): string[] => {
  const row = screen.toJSON() as ReactTestRendererJSON;
  return (row.children as ReactTestRendererJSON[]).map((segment) => {
    const [bar] = segment.children as ReactTestRendererJSON[];
    return StyleSheet.flatten(bar?.props.style).backgroundColor as string;
  });
};

const renderAt = (stage: LabourStage) => render(<StageProgressBar activeStage={stage} />);

/** The four-stage stepper above the Timeline: the current stage in bold, its bar and the earlier ones filled. */
describe('StageProgressBar', () => {
  it('numbers and names all four stages', () => {
    renderAt('stage1');

    for (const label of LABELS) expect(screen.getByText(label)).toBeTruthy();
  });

  it('highlights only the current stage label', () => {
    renderAt('stage2');

    expect(labelStyle('2. Stage 2')).toMatchObject({ color: colors.primaryTextFigma, fontFamily: 'Lato_700Bold' });
    for (const label of [LABELS[0]!, LABELS[2]!, LABELS[3]!]) {
      expect(labelStyle(label)).toMatchObject({ color: colors.secondaryTextFigma, fontFamily: 'Lato_400Regular' });
    }
  });

  it('fills the bars of the stages done and the current one', () => {
    renderAt('delivery');

    expect(barColours()).toEqual([colors.primary, colors.primary, colors.primary, colors.borderFigma]);
  });

  it('fills only the first bar in Stage 1, and every bar in the last stage', () => {
    const { rerender } = renderAt('stage1');
    expect(barColours()).toEqual([colors.primary, colors.borderFigma, colors.borderFigma, colors.borderFigma]);

    rerender(<StageProgressBar activeStage="earlyPostpartum" />);
    expect(barColours()).toEqual([colors.primary, colors.primary, colors.primary, colors.primary]);
    expect(labelStyle('4. Very Early PP').color).toBe(colors.primaryTextFigma);
  });
});
