import '@/core/i18n';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RegistrationStepLayout } from '../RegistrationStepLayout';
import type { RegistrationStep } from '../RegistrationStepper';

// The layout owns the discard path, so it reaches for navigation and for the
// hardware-back guard. `usePreventRemove` is stubbed rather than spread from
// the real module: it registers against a route that does not exist here.
const mockPopTo = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), popTo: mockPopTo }),
  usePreventRemove: jest.fn(),
}));

function renderLayout(currentStep: RegistrationStep = 'personal') {
  return render(
    <RegistrationStepLayout
      currentStep={currentStep}
      title="Personal Details"
      subtitle="Basic details"
      footer={<Text>Continue</Text>}
    >
      <Text>the form fields</Text>
    </RegistrationStepLayout>,
  );
}

describe('RegistrationStepLayout', () => {
  it('renders the title, the subtitle, the fields and the footer', () => {
    renderLayout();

    expect(screen.getByText('Personal Details')).toBeTruthy();
    expect(screen.getByText('Basic details')).toBeTruthy();
    expect(screen.getByText('the form fields')).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('counts the step the screen says it is on', () => {
    renderLayout('personal');
    expect(screen.getByText('Step 1 of 2')).toBeTruthy();
  });

  it('counts the address step as the second of two', () => {
    renderLayout('address');
    expect(screen.getByText('Step 2 of 2')).toBeTruthy();
  });

  // The X and the dialog both live here, so step 2 abandons the same way step
  // 1 does and neither screen renders either of them.
  it('raises the discard dialog from the X', () => {
    renderLayout();

    expect(screen.queryByText('Close patient registration?')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByText('Close patient registration?')).toBeTruthy();
  });

  it('puts the dialog away again on No', () => {
    renderLayout();

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    fireEvent.press(screen.getByRole('button', { name: 'No' }));

    expect(screen.queryByText('Close patient registration?')).toBeNull();
  });
});
