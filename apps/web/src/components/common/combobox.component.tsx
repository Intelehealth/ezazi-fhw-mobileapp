import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import chevronIcon from '../../assets/svgs/chevron-down-input.svg';

export interface ComboboxOption {
  key: string;
  label: string;
}

interface ComboboxComponentProps {
  id: string;
  /** The value shown in the box once nothing is being typed. */
  value: string;
  options: ComboboxOption[];
  placeholder?: string;
  invalid?: boolean;
  /**
   * True (the default): whatever is typed is kept — ng-select's `[addTag]`,
   * reported through `onChange`. False: a plain searchable select — typing
   * only filters the list, and the value changes only when one is picked.
   */
  allowCustom?: boolean;
  /** Free text typed into the box, when `allowCustom`. */
  onChange?: (text: string) => void;
  /** A list option was picked. */
  onSelect: (option: ComboboxOption) => void;
  className?: string;
}

/** ng-select's `.ng-dropdown-panel-items` max-height. */
const PANEL_MAX_HEIGHT = 240;

/** The nearest scrolling ancestor's visible bottom and top, else the window's. */
function roomAround(element: HTMLElement): { above: number; below: number } {
  const box = element.getBoundingClientRect();
  let top = 0;
  let bottom = window.innerHeight;
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      const frame = node.getBoundingClientRect();
      top = Math.max(top, frame.top);
      bottom = Math.min(bottom, frame.bottom);
      break;
    }
  }
  return { above: box.top - top, below: bottom - box.bottom };
}

/**
 * The searchable ng-select the Angular prescription dialogs use (its
 * `.visit-select` look: a white 48px box with a grey chevron, and a
 * borderless, shadowed list that scrolls past 240px). Typing filters the
 * list; arrow keys move through it, Enter picks, Escape closes it. The list
 * opens upward when there is no room for it below.
 */
export function ComboboxComponent({
  id,
  value,
  options,
  placeholder,
  invalid = false,
  allowCustom = true,
  onChange,
  onSelect,
  className = '',
}: ComboboxComponentProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  /* Opening shows every option; typing narrows them to what was typed. */
  const matches = useMemo(() => {
    const needle = query?.trim().toLowerCase();
    return needle
      ? options.filter(option => option.label.toLowerCase().includes(needle))
      : options;
  }, [options, query]);

  function open(input: HTMLInputElement) {
    if (isOpen) return;
    /* Start on the current value, as ng-select marks it. */
    const current = options.findIndex(option => option.label === value);
    setActive(Math.max(current, 0));
    const { above, below } = roomAround(input);
    setOpensUp(below < PANEL_MAX_HEIGHT && above > below);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    setQuery(null);
  }

  function pick(option: ComboboxOption) {
    onSelect(option);
    close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) open(event.currentTarget);
      else setActive(index => Math.min(index + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && isOpen && matches[active]) {
      event.preventDefault();
      pick(matches[active]);
    } else if (event.key === 'Escape' && isOpen) {
      /* Closes the list only, not the dialog around it (its Escape listener is on document). */
      event.stopPropagation();
      close();
    }
  }

  const showList = isOpen && matches.length > 0;
  /* A strict select shows what is being typed only while searching. */
  const shown = !allowCustom && query !== null ? query : value;

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        aria-activedescendant={
          showList ? `${listId}-${matches[active]?.key}` : undefined
        }
        value={shown}
        placeholder={placeholder}
        onFocus={event => open(event.currentTarget)}
        onClick={event => open(event.currentTarget)}
        onBlur={close}
        onChange={event => {
          const text = event.target.value;
          if (allowCustom) onChange?.(text);
          setQuery(text);
          setIsOpen(true);
          setActive(0);
        }}
        onKeyDown={handleKeyDown}
        className={`${className} cursor-pointer truncate pr-10`}
      />
      <img
        src={chevronIcon}
        alt=""
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 transition-transform ${
          showList ? 'rotate-180' : ''
        }`}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          style={{ maxHeight: PANEL_MAX_HEIGHT }}
          className={`absolute right-0 left-0 z-20 m-0 list-none overflow-y-auto rounded-lg bg-white p-0 shadow-[0px_7px_30px_rgba(37,46,75,0.12)] ${
            opensUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {matches.map((option, index) => (
            <li
              key={option.key}
              id={`${listId}-${option.key}`}
              role="option"
              aria-selected={index === active}
              /* mousedown, not click: picking must win over the input's blur. */
              onMouseDown={event => {
                event.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer border-t border-[rgba(178,175,190,0.2)] px-2.5 py-3.5 text-base text-[#1B163A] first:border-t-0 ${
                index === active ? 'bg-[#F7F7FA]' : 'bg-white'
              }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
