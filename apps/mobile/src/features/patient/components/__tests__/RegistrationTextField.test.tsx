import '@/core/i18n';
import { render, screen } from '@testing-library/react-native';
import { RegistrationTextField } from '../RegistrationTextField';

describe('RegistrationTextField', () => {
  it('renders its label, its placeholder and no error caption', () => {
    render(
      <RegistrationTextField
        label="First Name"
        placeholder="Enter first name"
        value={''}
        onChangeText={() => {}}
        error={undefined}
      />,
    );

    expect(screen.getByText(/^First Name/)).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter first name')).toBeTruthy();
    expect(screen.queryByText('Please enter first name')).toBeNull();
  });

  // The two mobile fields share the placeholder "Enter Mobile Number", so the
  // a11y name is the only thing that tells them apart.
  it('derives the accessibility name from the label', () => {
    render(
      <RegistrationTextField
        label="Alternate Mobile Number"
        placeholder="Enter Mobile Number"
        value={''}
        onChangeText={() => {}}
      />,
    );

    expect(screen.getByLabelText('Alternate Mobile Number')).toBeTruthy();
  });

  it('lets an explicit accessibilityLabel override the derived one', () => {
    render(
      <RegistrationTextField
        label="Province/State"
        accessibilityLabel="Select province or state"
        value={''}
        onChangeText={() => {}}
      />,
    );

    expect(screen.getByLabelText('Select province or state')).toBeTruthy();
    expect(screen.queryByLabelText('Province/State')).toBeNull();
  });

  it('renders the error message as a caption under the field', () => {
    render(
      <RegistrationTextField
        label="First Name"
        placeholder="Enter first name"
        value={''}
        onChangeText={() => {}}
        error="Please enter first name"
      />,
    );

    expect(screen.getByText('Please enter first name')).toBeTruthy();
  });

  it('is not editable when editable is false', () => {
    render(
      <RegistrationTextField
        label="Gender"
        value="Female"
        editable={false}
        onChangeText={() => {}}
      />,
    );

    const field = screen.getByLabelText('Gender');
    expect(field.props.editable).toBe(false);
    expect(field.props.value).toBe('Female');
  });
});
