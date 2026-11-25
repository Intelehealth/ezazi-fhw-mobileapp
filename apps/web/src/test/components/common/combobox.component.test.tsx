import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ComboboxComponent,
  type ComboboxOption,
} from '../../../components/common/combobox.component';

const OPTIONS: ComboboxOption[] = ['Start', 'Continue', 'Stop'].map(label => ({
  key: label,
  label,
}));

/** A combobox holding its own value, as the dialogs' forms do. */
function Harness({
  allowCustom,
  initial = '',
  onSelect = vi.fn(),
}: {
  allowCustom?: boolean;
  initial?: string;
  onSelect?: (option: ComboboxOption) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="status">Status</label>
      <ComboboxComponent
        id="status"
        value={value}
        options={OPTIONS}
        placeholder="Select status"
        allowCustom={allowCustom}
        onChange={setValue}
        onSelect={option => {
          onSelect(option);
          setValue(option.label);
        }}
      />
    </>
  );
}

const box = () => screen.getByRole('combobox', { name: 'Status' });
const options = () =>
  screen.queryAllByRole('option').map(option => option.textContent);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ComboboxComponent', () => {
  it('lists every option on focus, starting on the current value', async () => {
    render(<Harness initial="Continue" />);

    await userEvent.click(box());

    expect(options()).toEqual(['Start', 'Continue', 'Stop']);
    expect(screen.getByRole('option', { name: 'Continue' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(box()).toHaveAttribute('aria-expanded', 'true');
  });

  it('reopens on a click after a pick, while still focused', async () => {
    render(<Harness />);

    await userEvent.click(box());
    await userEvent.click(screen.getByRole('option', { name: 'Stop' }));
    expect(options()).toEqual([]);

    await userEvent.click(box());
    expect(options()).toEqual(['Start', 'Continue', 'Stop']);
  });

  it('moves through the list with the arrow keys and picks with Enter', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    box().focus();
    await userEvent.keyboard('{Escape}');
    expect(options()).toEqual([]);

    /* ArrowDown opens a closed list, then moves down — no further than the last. */
    await userEvent.keyboard(
      '{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}'
    );
    await userEvent.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith({
      key: 'Continue',
      label: 'Continue',
    });
    expect(box()).toHaveValue('Continue');
  });

  it('stops at the top of the list', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await userEvent.click(box());

    await userEvent.keyboard('{ArrowUp}{ArrowUp}{Enter}');

    expect(onSelect).toHaveBeenCalledWith({ key: 'Start', label: 'Start' });
  });

  it('closes on Escape without letting it reach a dialog around it', async () => {
    const onDocumentKey = vi.fn();
    document.addEventListener('keydown', onDocumentKey);
    render(<Harness />);
    await userEvent.click(box());

    await userEvent.keyboard('{Escape}');

    expect(options()).toEqual([]);
    expect(onDocumentKey).not.toHaveBeenCalled();
    document.removeEventListener('keydown', onDocumentKey);
  });

  it('leaves Enter and Escape alone while the list is closed', async () => {
    const onSelect = vi.fn();
    const onDocumentKey = vi.fn();
    document.addEventListener('keydown', onDocumentKey);
    render(<Harness onSelect={onSelect} />);
    box().focus();
    await userEvent.keyboard('{Escape}');
    onDocumentKey.mockClear();

    await userEvent.keyboard('{Enter}{Escape}');

    expect(onSelect).not.toHaveBeenCalled();
    expect(onDocumentKey).toHaveBeenCalledTimes(2);
    document.removeEventListener('keydown', onDocumentKey);
  });

  it('keeps whatever is typed when free text is allowed', async () => {
    render(<Harness />);

    await userEvent.type(box(), 'Paused');
    fireEvent.blur(box());

    expect(box()).toHaveValue('Paused');
  });

  it('as a strict select, only filters on typing and keeps the chosen value', async () => {
    const onSelect = vi.fn();
    render(<Harness allowCustom={false} initial="Start" onSelect={onSelect} />);

    await userEvent.clear(box());
    await userEvent.type(box(), 'st');
    expect(box()).toHaveValue('st');
    expect(options()).toEqual(['Start', 'Stop']);

    fireEvent.blur(box());
    expect(box()).toHaveValue('Start');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows no list when nothing matches what was typed', async () => {
    render(<Harness allowCustom={false} />);

    await userEvent.type(box(), 'zzz');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(box()).toHaveAttribute('aria-expanded', 'false');
  });

  describe('which way the list opens', () => {
    function placeBox(boxRect: Partial<DOMRect>, frameRect?: Partial<DOMRect>) {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        function (this: Element) {
          const rect =
            this.id === 'status'
              ? boxRect
              : (frameRect ?? { top: 0, bottom: 0 });
          return { top: 0, bottom: 0, ...rect } as DOMRect;
        }
      );
    }

    const panel = () => screen.getByRole('listbox');

    it('opens downward when there is room below in the window', async () => {
      placeBox({ top: 100, bottom: 148 });
      render(<Harness />);

      await userEvent.click(box());

      expect(panel().className).toContain('top-full');
    });

    it('opens upward near the bottom of the window', async () => {
      placeBox({
        top: window.innerHeight - 60,
        bottom: window.innerHeight - 12,
      });
      render(<Harness />);

      await userEvent.click(box());

      expect(panel().className).toContain('bottom-full');
    });

    it('measures the room inside the scrolling area around it', async () => {
      /* Low in its scrolling frame, though the window has room below. */
      placeBox({ top: 400, bottom: 448 }, { top: 0, bottom: 480 });
      render(
        <div style={{ overflowY: 'auto' }}>
          <Harness />
        </div>
      );

      await userEvent.click(box());

      expect(panel().className).toContain('bottom-full');
    });

    it('stays downward when there is even less room above', async () => {
      placeBox({ top: 20, bottom: 68 }, { top: 0, bottom: 200 });
      render(
        <div style={{ overflowY: 'scroll' }}>
          <Harness />
        </div>
      );

      await userEvent.click(box());

      expect(panel().className).toContain('top-full');
    });
  });
});
