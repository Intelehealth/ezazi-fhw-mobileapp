import { useId, useMemo, useState, type KeyboardEvent } from 'react';

export interface ComboboxOption {
  key: string;
  label: string;
}

interface ComboboxComponentProps {
  id: string;
  /** The text in the box — what is saved whether picked from the list or typed. */
  value: string;
  options: ComboboxOption[];
  placeholder?: string;
  invalid?: boolean;
  /** Free text typed into the box (ng-select's `addTag`). */
  onChange: (text: string) => void;
  /** A list option was picked. */
  onSelect: (option: ComboboxOption) => void;
  className?: string;
}

/**
 * A text box with a filtered suggestion list — the searchable ng-select with
 * `[addTag]` the Angular prescription forms use: pick an option, or keep
 * whatever was typed. Arrow keys move through the list, Enter picks,
 * Escape closes it.
 */
export function ComboboxComponent({
  id,
  value,
  options,
  placeholder,
  invalid = false,
  onChange,
  onSelect,
  className = '',
}: ComboboxComponentProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  /* Focusing shows every option; typing narrows them to what was typed. */
  const matches = useMemo(() => {
    const needle = query?.trim().toLowerCase();
    return needle
      ? options.filter(option => option.label.toLowerCase().includes(needle))
      : options;
  }, [options, query]);

  function open() {
    setIsOpen(true);
    setActive(0);
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
      if (!isOpen) open();
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
        value={value}
        placeholder={placeholder}
        onFocus={open}
        onBlur={close}
        onChange={event => {
          onChange(event.target.value);
          setQuery(event.target.value);
          setIsOpen(true);
          setActive(0);
        }}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#E6E6E6] bg-white py-1 shadow-lg"
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
              className={`cursor-pointer px-4 py-2 text-sm text-[#1B163A] ${
                index === active ? 'bg-[#F1EFFF]' : ''
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
