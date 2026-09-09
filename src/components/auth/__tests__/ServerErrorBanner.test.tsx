import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ServerErrorBanner } from '../ServerErrorBanner';

describe('<ServerErrorBanner>', () => {
  const announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => undefined);

  beforeEach(() => announce.mockClear());

  it('renders the title', () => {
    const { getByText } = render(
      <ServerErrorBanner title="Username or password is incorrect" />,
    );
    expect(getByText('Username or password is incorrect')).toBeTruthy();
  });

  it('renders title + subtitle when both are supplied', () => {
    const { getByText } = render(
      <ServerErrorBanner
        title="Something went wrong"
        subtitle="Please check your connection and try again."
      />,
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Please check your connection and try again.')).toBeTruthy();
  });

  it('announces the combined message on mount for screen readers', () => {
    render(
      <ServerErrorBanner title="Login failed" subtitle="Try again." />,
    );
    expect(announce).toHaveBeenCalledWith('Login failed. Try again.');
  });

  it('renders as a plain view (no press handler) when onDismiss is absent', () => {
    const { getByTestId } = render(<ServerErrorBanner title="X" />);
    expect(getByTestId('server-error-banner').props.onPress).toBeUndefined();
  });

  it('invokes onDismiss when pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <ServerErrorBanner title="X" onDismiss={onDismiss} />,
    );
    fireEvent.press(getByTestId('server-error-banner'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('sets alert role + polite live region for a11y', () => {
    const { getByTestId } = render(<ServerErrorBanner title="X" />);
    const node = getByTestId('server-error-banner');
    expect(node.props.accessibilityRole).toBe('alert');
    expect(node.props.accessibilityLiveRegion).toBe('polite');
  });

  it('accepts an accessibility-label override', () => {
    const { getByTestId } = render(
      <ServerErrorBanner
        title="Server error"
        subtitle="Please retry."
        accessibilityLabel="Login could not complete"
      />,
    );
    expect(getByTestId('server-error-banner').props.accessibilityLabel).toBe(
      'Login could not complete',
    );
  });
});
