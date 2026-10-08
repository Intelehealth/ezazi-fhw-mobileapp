import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePickerComponent } from '../../../components/common/date-picker.component';

function Harness({
  initial = '2000-07-06',
  max = '2026-10-01',
  onBlur,
}: {
  initial?: string;
  max?: string;
  onBlur?: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <DatePickerComponent
      id="dob"
      label="Date of birth *"
      value={value}
      onChange={setValue}
      onBlur={onBlur}
      max={max}
    />
  );
}

const open = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));

describe('DatePickerComponent', () => {
  it('shows the value as "06 Jul 2000" and keeps the field read-only', () => {
    render(<Harness />);

    const input = screen.getByLabelText('Date of birth *');
    expect(input).toHaveValue('06 Jul 2000');
    expect(input).toHaveAttribute('readonly');
  });

  it('opens a calendar with the "THU JUL 06 2000" header, Sunday-first weekdays, the month label and the selected day', () => {
    render(<Harness />);
    open();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/THU JUL 06 2000/)).toBeInTheDocument();
    expect(screen.getByText('JUL')).toBeInTheDocument();
    expect(screen.getAllByText('S')).toHaveLength(2);
    // 1 Jul 2000 is a Saturday: label in the first cell, "1" in the last column.
    expect(screen.getByRole('button', { name: '06 Jul 2000' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByRole('button', { name: '01 Jul 2000' })
    ).toBeInTheDocument();
  });

  it('selects a day, closes the calendar and reports the ISO date', () => {
    render(<Harness />);
    open();

    fireEvent.click(screen.getByRole('button', { name: '15 Jul 2000' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Date of birth *')).toHaveValue('15 Jul 2000');
  });

  it('moves between months with the arrows', () => {
    render(<Harness />);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText(/SUN AUG 06 2000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText(/TUE JUN 06 2000/)).toBeInTheDocument();
  });

  it('clamps the day when moving to a shorter month (31 Jan -> 29 Feb)', () => {
    render(<Harness initial="2000-01-31" />);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));

    expect(screen.getByText(/TUE FEB 29 2000/)).toBeInTheDocument();
  });

  it('jumps by year then month from the header', () => {
    render(<Harness />);
    open();

    fireEvent.click(
      screen.getByRole('button', { name: 'Choose month and year' })
    );
    fireEvent.click(screen.getByRole('button', { name: '2010' }));
    fireEvent.click(screen.getByRole('button', { name: 'MAR' }));

    expect(screen.getByText(/SAT MAR 06 2010/)).toBeInTheDocument();
  });

  it('pages back through earlier years', () => {
    render(<Harness />);
    open();

    fireEvent.click(
      screen.getByRole('button', { name: 'Choose month and year' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Earlier years' }));

    // max year 2026, 24 per page -> the second page starts at 2026 - 47 = 1979.
    expect(screen.getByRole('button', { name: '1979' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '2026' })
    ).not.toBeInTheDocument();
  });

  it('disables days after max and stops forward navigation past it', () => {
    render(<Harness initial="2026-10-01" max="2026-10-01" />);
    open();

    expect(screen.getByRole('button', { name: '02 Oct 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '01 Oct 2026' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('closes on Escape and on an outside click, firing onBlur each time', () => {
    const onBlur = vi.fn();
    render(<Harness onBlur={onBlur} />);

    open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onBlur).toHaveBeenCalledTimes(2);
  });

  it('shows the placeholder and starts at max when there is no value', () => {
    render(<Harness initial="" />);

    expect(screen.getByPlaceholderText('Enter DOB')).toHaveValue('');
    open();
    expect(screen.getByText(/THU OCT 01 2026/)).toBeInTheDocument();
  });

  it('closes the calendar when its toggle button is clicked again', () => {
    render(<Harness />);

    open();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    open();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns from the year picker to the day view when the header toggle is clicked again', () => {
    render(<Harness />);
    open();

    const toggle = screen.getByRole('button', {
      name: 'Choose month and year',
    });
    fireEvent.click(toggle);
    expect(screen.queryByText('S')).not.toBeInTheDocument();
    fireEvent.click(toggle);

    expect(screen.getAllByText('S')).toHaveLength(2);
  });

  it('rolls December over to January of the next year', () => {
    render(<Harness initial="2000-12-15" />);
    open();

    fireEvent.click(screen.getByRole('button', { name: /next month/i }));

    expect(screen.getByText('JAN')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '01 Jan 2001' })
    ).toBeInTheDocument();
  });

  it('works without a max date: starts at today and allows years up to 50 ahead', () => {
    render(
      <DatePickerComponent
        id="dob"
        label="Date of birth *"
        value=""
        onChange={vi.fn()}
      />
    );
    open();

    const today = new Date();
    expect(
      screen.getByText(new RegExp(String(today.getFullYear())))
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Choose month and year' })
    );
    expect(
      screen.getByRole('button', { name: String(today.getFullYear() + 50) })
    ).toBeInTheDocument();
  });

  it('shows an unparseable value as an empty field', () => {
    render(<Harness initial="not-a-date" />);

    expect(screen.getByLabelText('Date of birth *')).toHaveValue('');
  });

  it('shows the error message under the field', () => {
    render(
      <DatePickerComponent
        id="dob"
        label="Date of birth *"
        value=""
        onChange={vi.fn()}
        error="Enter DOB"
      />
    );

    expect(screen.getByText('Enter DOB')).toBeInTheDocument();
  });

  it('opens and closes the calendar when the read-only field itself is clicked', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Date of birth *');

    fireEvent.click(input);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(input);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pages forward again to later years after paging back', () => {
    render(<Harness />);
    open();

    fireEvent.click(
      screen.getByRole('button', { name: 'Choose month and year' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Earlier years' }));
    expect(screen.getByRole('button', { name: '1979' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Later years' }));

    expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument();
  });
});
