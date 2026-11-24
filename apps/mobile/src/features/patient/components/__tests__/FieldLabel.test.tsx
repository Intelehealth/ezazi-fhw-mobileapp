import '@/core/i18n';
import { render, screen } from '@testing-library/react-native';
import { FieldLabel } from '../FieldLabel';

describe('FieldLabel', () => {
  it('renders the label text and draws no asterisk by default', () => {
    render(<FieldLabel label="Middle Name" />);

    expect(screen.getByText('Middle Name')).toBeTruthy();
    expect(screen.queryByText('*')).toBeNull();
  });

  it('draws the asterisk when the field is required', () => {
    render(<FieldLabel label="First Name" required />);

    expect(screen.getByText(/^First Name/)).toBeTruthy();
    expect(screen.getByText('*')).toBeTruthy();
  });

  // The string table stores title case; uppercasing is a style, so the text
  // content a translation test would read is unchanged.
  it('keeps the label in the case the string table stores it', () => {
    render(<FieldLabel label="Date of Birth" />);

    expect(screen.getByText('Date of Birth')).toBeTruthy();
    expect(screen.queryByText('DATE OF BIRTH')).toBeNull();
  });
});
