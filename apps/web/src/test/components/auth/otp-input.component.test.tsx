import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OtpInputComponent } from '../../../components/auth/otp-input.component';

describe('OtpInputComponent', () => {
  it('renders 6 boxes and reports the combined digit string as the user types', () => {
    const onChange = vi.fn();
    render(<OtpInputComponent value="" onChange={onChange} />);

    const boxes = screen.getAllByLabelText(/OTP digit/);
    expect(boxes).toHaveLength(6);

    fireEvent.change(boxes[0], { target: { value: '1' } });
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('auto-advances focus to the next box after a digit is entered', () => {
    const { rerender } = render(<OtpInputComponent value="" onChange={vi.fn()} />);
    const boxes = screen.getAllByLabelText(/OTP digit/);

    fireEvent.change(boxes[0], { target: { value: '5' } });
    rerender(<OtpInputComponent value="5" onChange={vi.fn()} />);

    expect(screen.getAllByLabelText(/OTP digit/)[1]).toHaveFocus();
  });

  it('moves focus back on backspace from an empty box', () => {
    render(<OtpInputComponent value="12" onChange={vi.fn()} />);
    const boxes = screen.getAllByLabelText(/OTP digit/);

    boxes[2].focus();
    fireEvent.keyDown(boxes[2], { key: 'Backspace' });

    expect(boxes[1]).toHaveFocus();
  });

  it('shows an error border when hasError is true', () => {
    render(<OtpInputComponent value="" onChange={vi.fn()} hasError />);
    expect(screen.getAllByLabelText(/OTP digit/)[0].className).toContain('border-red-600');
  });
});
