import { useEffect, useRef, useState } from 'react';
import calendarIcon from '../../assets/svgs/calendar-date.svg';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]; // prettier-ignore
const MIN_YEAR = 1900;
const YEARS_PER_PAGE = 24;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-time YYYY-MM-DD, so a picked day never shifts across the UTC boundary. */
function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** "06 Jul 2000" — the format the Angular Material field shows. */
function formatDisplay(date: Date): string {
  const month = MONTHS[date.getMonth()];
  return `${pad(date.getDate())} ${month[0]}${month.slice(1).toLowerCase()} ${date.getFullYear()}`;
}

/** "THU JUL 06 2000" — the calendar header's label. */
function formatHeader(date: Date): string {
  return `${WEEKDAY_NAMES[date.getDay()]} ${MONTHS[date.getMonth()]} ${pad(date.getDate())} ${date.getFullYear()}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Moves to `month`/`year`, clamping the day (31 Jan -> 28 Feb). */
function withMonth(date: Date, year: number, month: number): Date {
  return new Date(year, month, Math.min(date.getDate(), daysInMonth(year, month)));
}

type View = 'day' | 'month' | 'year';

interface DatePickerProps {
  id: string;
  label: string;
  /** YYYY-MM-DD, or '' for no date. */
  value: string;
  onChange: (isoDate: string) => void;
  onBlur?: () => void;
  /** Latest selectable date, YYYY-MM-DD. Defaults to no limit. */
  max?: string;
  error?: string;
  placeholder?: string;
}

/**
 * Ports the Angular Material `mat-datepicker` the default app uses for the
 * profile's Date of birth (profile.component.html): a read-only
 * "06 Jul 2000" field with a calendar toggle, a popup with a
 * "THU JUL 06 2000 ▾" header (click it to jump by year, then month),
 * prev/next month arrows, a Sunday-first grid with the month label in the
 * first row, and days after `max` disabled.
 */
export function DatePickerComponent({
  id,
  label,
  value,
  onChange,
  onBlur,
  max,
  error,
  placeholder = 'Enter DOB',
}: DatePickerProps) {
  const selected = parseIso(value);
  const maxDate = max ? parseIso(max) : null;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('day');
  const [active, setActive] = useState<Date>(() => selected ?? maxDate ?? new Date());
  const [yearPage, setYearPage] = useState(0);

  function openCalendar() {
    setActive(selected ?? maxDate ?? new Date());
    setView('day');
    setOpen(true);
  }

  function close() {
    setOpen(false);
    onBlur?.();
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
    // `close` only reads props/state that are stable while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const year = active.getFullYear();
  const month = active.getMonth();
  const maxYear = maxDate ? maxDate.getFullYear() : new Date().getFullYear() + 50;
  const isDisabled = (date: Date) => maxDate !== null && date > maxDate;

  const firstWeekday = new Date(year, month, 1).getDay();
  const dayCount = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: dayCount }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = withMonth(active, month === 0 ? year - 1 : year, (month + 11) % 12);
  const nextMonth = withMonth(active, month === 11 ? year + 1 : year, (month + 1) % 12);
  const canGoNext = !maxDate || new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1) <= maxDate;
  const canGoPrev = prevMonth.getFullYear() >= MIN_YEAR;

  const firstYear = Math.max(MIN_YEAR, maxYear - YEARS_PER_PAGE + 1 - yearPage * YEARS_PER_PAGE);
  const years = Array.from(
    { length: Math.min(YEARS_PER_PAGE, maxYear - firstYear + 1) },
    (_, i) => firstYear + i
  );

  const NAV_BUTTON =
    'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#5E5A73] hover:bg-[#F1EEFB] disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-bold text-[#1B163A]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          readOnly
          value={selected ? formatDisplay(selected) : ''}
          placeholder={placeholder}
          onClick={() => (open ? close() : openCalendar())}
          className="h-12 w-full cursor-pointer rounded-lg border border-[rgba(178,175,190,0.2)] bg-[#FAF9FF] px-4 pr-12 text-base text-[#1B163A]"
        />
        <button
          type="button"
          aria-label="Open calendar"
          onClick={() => (open ? close() : openCalendar())}
          className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer"
        >
          <img src={calendarIcon} alt="" className="h-[22px] w-[22px]" />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute top-full left-0 z-30 mt-1 w-[296px] rounded bg-white pb-2 shadow-[0_5px_5px_-3px_rgba(0,0,0,0.2),0_8px_10px_1px_rgba(0,0,0,0.14),0_3px_14px_2px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <button
              type="button"
              aria-label="Choose month and year"
              onClick={() => {
                setYearPage(0);
                setView(view === 'day' ? 'year' : 'day');
              }}
              className="cursor-pointer rounded px-2 py-2 text-sm font-medium tracking-wide text-[#1B163A]"
            >
              {formatHeader(active)} <span aria-hidden="true">▾</span>
            </button>
            {view === 'day' && (
              <div className="flex">
                <button
                  type="button"
                  aria-label="Previous month"
                  disabled={!canGoPrev}
                  onClick={() => setActive(prevMonth)}
                  className={NAV_BUTTON}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  disabled={!canGoNext}
                  onClick={() => setActive(nextMonth)}
                  className={NAV_BUTTON}
                >
                  ›
                </button>
              </div>
            )}
          </div>

          {view === 'year' && (
            <div>
              <div className="flex justify-end px-3">
                <button
                  type="button"
                  aria-label="Earlier years"
                  disabled={firstYear <= MIN_YEAR}
                  onClick={() => setYearPage(yearPage + 1)}
                  className={NAV_BUTTON}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Later years"
                  disabled={yearPage === 0}
                  onClick={() => setYearPage(yearPage - 1)}
                  className={NAV_BUTTON}
                >
                  ›
                </button>
              </div>
              <div className="grid grid-cols-4 gap-y-2 px-3 pb-2">
                {years.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setActive(withMonth(active, y, month));
                      setView('month');
                    }}
                    className={`mx-auto h-10 w-[60px] cursor-pointer rounded-full text-sm ${
                      y === year
                        ? 'bg-[#5B2BB5] text-white'
                        : 'text-[#1B163A] hover:bg-[#F1EEFB]'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'month' && (
            <div className="grid grid-cols-4 gap-y-3 px-3 py-3">
              {MONTHS.map((name, index) => {
                const monthStart = new Date(year, index, 1);
                const disabled = maxDate !== null && monthStart > maxDate;
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setActive(withMonth(active, year, index));
                      setView('day');
                    }}
                    className={`mx-auto h-10 w-[60px] cursor-pointer rounded-full text-sm disabled:cursor-not-allowed disabled:opacity-30 ${
                      index === month
                        ? 'bg-[#5B2BB5] text-white'
                        : 'text-[#1B163A] hover:bg-[#F1EEFB]'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}

          {view === 'day' && (
            <div className="px-2">
              <div className="grid grid-cols-7 border-b border-[#E0E0E0] pb-1 text-center text-xs text-[#6B677D]">
                {WEEKDAYS.map((day, index) => (
                  <span key={index} className="py-2 underline decoration-dotted">
                    {day}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 pt-1 text-center text-sm">
                {cells.map((day, index) => {
                  if (day === null) {
                    // The month label sits in the first cell of the first
                    // row when that row has leading blanks, as in Material.
                    return (
                      <span
                        key={index}
                        className="flex h-10 items-center pl-2 text-left text-xs text-[#6B677D]"
                      >
                        {index === 0 ? MONTHS[month] : ''}
                      </span>
                    );
                  }
                  const date = new Date(year, month, day);
                  const isSelected = selected !== null && toIso(date) === toIso(selected);
                  const disabled = isDisabled(date);
                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={disabled}
                      aria-label={formatDisplay(date)}
                      aria-pressed={isSelected}
                      onClick={() => {
                        onChange(toIso(date));
                        setOpen(false);
                        onBlur?.();
                      }}
                      className={`mx-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-30 ${
                        isSelected
                          ? 'bg-[#5B2BB5] text-white'
                          : 'text-[#1B163A] hover:bg-[#F1EEFB]'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
