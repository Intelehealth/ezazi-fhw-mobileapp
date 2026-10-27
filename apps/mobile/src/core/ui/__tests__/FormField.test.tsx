import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { FormField } from '../FormField';

describe('FormField', () => {
  it('captions the control in capitals and shows no error line by default', () => {
    render(
      <FormField label="Companion?">
        <Text>control</Text>
      </FormField>,
    );
    expect(screen.getByText('COMPANION?')).toBeTruthy();
    expect(screen.getByText('control')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the error under the control', () => {
    render(
      <FormField label="Strength" error="Enter the strength">
        <Text>control</Text>
      </FormField>,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Enter the strength')).toBeTruthy();
  });
});
