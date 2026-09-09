import React from 'react';
import { render } from '@testing-library/react-native';
import { FieldError } from '../FieldError';

describe('<FieldError>', () => {
  it('renders nothing when message is empty', () => {
    const { queryByTestId } = render(<FieldError message="" />);
    expect(queryByTestId('field-error')).toBeNull();
  });

  it('renders nothing when message is undefined', () => {
    const { queryByTestId } = render(<FieldError />);
    expect(queryByTestId('field-error')).toBeNull();
  });

  it('renders the message when provided', () => {
    const { getByTestId, getByText } = render(
      <FieldError message="Please select a location" />,
    );
    expect(getByTestId('field-error')).toBeTruthy();
    expect(getByText('Please select a location')).toBeTruthy();
  });

  it('uses the message as the default accessibility label', () => {
    const { getByTestId } = render(<FieldError message="Please enter your username" />);
    expect(getByTestId('field-error').props.accessibilityLabel).toBe('Please enter your username');
  });

  it('accepts an accessibility-label override', () => {
    const { getByTestId } = render(
      <FieldError message="Please enter your username" accessibilityLabel="Username missing" />,
    );
    expect(getByTestId('field-error').props.accessibilityLabel).toBe('Username missing');
  });
});
