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
    const { rerender } = render(
      <OtpInputComponent value="" onChange={vi.fn()} />
    );
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
    expect(screen.getAllByLabelText(/OTP digit/)[0].className).toContain(
      'border-red-600'
    );
  });

  it('fills all boxes and focuses the last one when the full 6 digits are pasted', () => {
    const onChange = vi.fn();
    render(<OtpInputComponent value="" onChange={onChange} />);
    const boxes = screen.getAllByLabelText(/OTP digit/);

    fireEvent.paste(boxes[0], {
      clipboardData: { getData: () => '123456' },
    });

    expect(onChange).toHaveBeenCalledWith('123456');
  });

  it('strips non-digit characters and truncates a paste longer than 6 digits', () => {
    const onChange = vi.fn();
    render(<OtpInputComponent value="" onChange={onChange} />);
    const boxes = screen.getAllByLabelText(/OTP digit/);

    fireEvent.paste(boxes[0], {
      clipboardData: { getData: () => '1a2b3c4d5e6f7g8h' },
    });

    expect(onChange).toHaveBeenCalledWith('123456');
  });

  it('ignores a paste with no digits at all', () => {
    const onChange = vi.fn();
    render(<OtpInputComponent value="" onChange={onChange} />);
    const boxes = screen.getAllByLabelText(/OTP digit/);

    fireEvent.paste(boxes[0], {
      clipboardData: { getData: () => 'abcdef' },
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the other digits in place when a middle box is cleared', () => {
    const onChange = vi.fn();
    render(<OtpInputComponent value="123456" onChange={onChange} />);

    fireEvent.change(screen.getAllByLabelText(/OTP digit/)[2], {
      target: { value: '' },
    });

    expect(onChange).toHaveBeenCalledWith('12 456');
  });

  it('shows a blank slot as an empty box and fills it without moving its neighbours', () => {
    const onChange = vi.fn();
    render(<OtpInputComponent value="12 456" onChange={onChange} />);
    const boxes = screen.getAllByLabelText(/OTP digit/);

    expect(boxes[2]).toHaveValue('');
    expect(boxes[3]).toHaveValue('4');

    fireEvent.change(boxes[2], { target: { value: '9' } });
    expect(onChange).toHaveBeenCalledWith('129456');
  });

  it('keeps earlier boxes empty when a later box is filled first', () => {
    const onChange = vi.fn();
    render(<OtpInputComponent value="" onChange={onChange} />);

    fireEvent.change(screen.getAllByLabelText(/OTP digit/)[4], {
      target: { value: '7' },
    });

    expect(onChange).toHaveBeenCalledWith('    7');
  });

  it('reports an empty string once every box has been cleared', () => {
    const onChange = vi.fn();
    render(<OtpInputComponent value="5" onChange={onChange} />);

    fireEvent.change(screen.getAllByLabelText(/OTP digit/)[0], {
      target: { value: '' },
    });

    expect(onChange).toHaveBeenCalledWith('');
  });
});
