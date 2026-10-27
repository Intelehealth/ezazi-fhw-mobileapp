import '@/core/i18n';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PagerView from 'react-native-pager-view';

import { colors } from '@/core/config/theme';

import { TabPager } from '../TabPager';

const TABS = [
  { key: 'supportive', label: 'Supportive care' },
  { key: 'medication', label: 'Medication', errorCount: 2 },
];

const setPageCalls = (PagerView as unknown as { setPageCalls: number[] }).setPageCalls;

const setup = (index = 0) => {
  const onIndexChange = jest.fn();
  const view = render(
    <TabPager tabs={TABS} index={index} onIndexChange={onIndexChange}>
      {[<Text key="a">Page one</Text>, <Text key="b">Page two</Text>]}
    </TabPager>,
  );
  return { onIndexChange, ...view };
};

describe('TabPager', () => {
  beforeEach(() => setPageCalls.splice(0));

  it('shows every tab and every page, the current tab selected', () => {
    setup();
    expect(screen.getByRole('tab', { name: 'Supportive care' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByText('Page one')).toBeTruthy();
    expect(screen.getByText('Page two')).toBeTruthy();
  });

  it('shows a tab\'s error count in red', () => {
    setup();
    expect(StyleSheet.flatten(screen.getByText('Medication (2)').props.style).color).toBe(colors.alertFigma);
  });

  it('reports a tapped tab and a swiped page', () => {
    const { onIndexChange } = setup();
    fireEvent.press(screen.getByRole('tab', { name: 'Medication (2)' }));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);

    fireEvent(screen.getByTestId('pager-view'), 'pageSelected', { nativeEvent: { position: 0 } });
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it('moves the pager when the index changes', () => {
    const { rerender, onIndexChange } = setup();
    rerender(
      <TabPager tabs={TABS} index={1} onIndexChange={onIndexChange}>
        {[<Text key="a">Page one</Text>, <Text key="b">Page two</Text>]}
      </TabPager>,
    );
    expect(setPageCalls.at(-1)).toBe(1);
  });
});
