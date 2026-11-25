import '@/core/i18n';
import { render, screen } from '@testing-library/react-native';

import type { LoginLocation } from '../../stores/location.store';
import { AUTH_TEST_IDS } from '../../testIds';
import { LocationPickerModal } from '../LocationPickerModal';

const LOCATION: LoginLocation = { uuid: 'loc-1', display: 'Ward A' };

/** The QA locator registry must name the ids the screen really renders (PR #17 review). */
describe('LocationPickerModal locators', () => {
  it('renders each option with the registry id', () => {
    render(
      <LocationPickerModal
        testID={AUTH_TEST_IDS.setup.locationList}
        visible
        locations={[LOCATION]}
        isLoading={false}
        anchor={{ x: 0, y: 0, width: 300, height: 48 }}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId(AUTH_TEST_IDS.setup.locationOption('loc-1'))).toBeTruthy();
  });
});
