import '@/core/i18n';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { AppDropdown, type FieldAnchor } from '../AppDropdown';

// The panel's placement is arithmetic against the window height, so the
// window is pinned here rather than left to whatever the preset reports.
let mockWindowHeight = 640;

jest.mock('@/core/ui/hooks/useResponsive', () => ({
  useResponsive: () => ({
    width:        360,
    height:       mockWindowHeight,
    isTablet:     false,
    fs:           () => 15,
    cornerRadius: 8,
    scale:        (n: number) => n,
  }),
}));

interface Option {
  id: string;
  name: string;
}

const OPTIONS: Option[] = [
  { id: 'mh', name: 'Maharashtra' },
  { id: 'dn', name: 'Dadra and Nagar Haveli (UT)' },
];

const ANCHOR: FieldAnchor = { x: 20, y: 100, width: 200, height: 60 };

const CLOSE_LABEL = 'Close the list';
const EMPTY_TEXT = 'Nothing to choose from';

function renderDropdown(overrides: Partial<React.ComponentProps<typeof AppDropdown<Option>>> = {}) {
  const props = {
    visible:    true,
    options:    OPTIONS,
    keyOf:      (o: Option) => o.id,
    labelOf:    (o: Option) => o.name,
    anchor:     ANCHOR,
    onSelect:   jest.fn(),
    onClose:    jest.fn(),
    emptyText:  EMPTY_TEXT,
    closeLabel: CLOSE_LABEL,
    ...overrides,
  };
  render(<AppDropdown<Option> {...props} />);
  return props;
}

const panelStyle = () =>
  StyleSheet.flatten(screen.getByTestId('app-dropdown-panel').props.style) as Record<
    string,
    number | undefined
  >;

beforeEach(() => {
  mockWindowHeight = 640;
});

describe('AppDropdown', () => {

  // --- Contents -------------------------------------------------------------

  it('renders nothing until the trigger has been measured', () => {
    renderDropdown({ anchor: null });

    expect(screen.queryByTestId('app-dropdown-panel')).toBeNull();
    expect(screen.queryByText('Maharashtra')).toBeNull();
  });

  it('renders one row per option', () => {
    renderDropdown();

    expect(screen.getByRole('button', { name: 'Maharashtra' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dadra and Nagar Haveli (UT)' })).toBeTruthy();
  });

  it('hands the whole option back on press, not just its label', () => {
    const { onSelect } = renderDropdown();

    fireEvent.press(screen.getByRole('button', { name: 'Maharashtra' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(OPTIONS[0]);
  });

  it('closes when the area outside the panel is tapped', () => {
    const { onClose } = renderDropdown();

    fireEvent.press(screen.getByLabelText(CLOSE_LABEL));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows no rows while loading', () => {
    renderDropdown({ isLoading: true });

    expect(screen.queryByText('Maharashtra')).toBeNull();
    expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
    // The scrim carries no button role, so no buttons remain at all.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows the caller\'s empty text when there are no options', () => {
    renderDropdown({ options: [] });

    expect(screen.getByText(EMPTY_TEXT)).toBeTruthy();
  });

  // --- Selected row ---------------------------------------------------------

  it('marks the selected row, and only that row', () => {
    renderDropdown({ selectedKey: 'mh' });

    expect(
      screen.getByRole('button', { name: 'Maharashtra' }).props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Dadra and Nagar Haveli (UT)' }).props
        .accessibilityState.selected,
    ).toBe(false);
  });

  it('marks nothing when no selection is passed', () => {
    renderDropdown();

    expect(
      screen.getByRole('button', { name: 'Maharashtra' }).props.accessibilityState.selected,
    ).toBe(false);
  });

  // --- The wrapping rule ----------------------------------------------------

  it('lets long row text wrap instead of truncating it', () => {
    // Guards the rule in AppDropdown's header: a capped row cuts off the
    // longer state and district names in a half-width column.
    renderDropdown();

    const row = screen.getByText('Dadra and Nagar Haveli (UT)');

    expect(row.props.numberOfLines).toBeUndefined();
    expect(row.props.ellipsizeMode).toBeUndefined();
  });

  // --- Placement ------------------------------------------------------------

  it('takes the trigger\'s width and horizontal position, not the screen\'s', () => {
    renderDropdown();

    expect(panelStyle().width).toBe(ANCHOR.width);
    expect(panelStyle().left).toBe(ANCHOR.x);
  });

  it('opens below the trigger when there is room', () => {
    renderDropdown();

    expect(panelStyle().top).toBe(166); // 100 + 60 + 6
    expect(panelStyle().bottom).toBeUndefined();
  });

  it('flips above the trigger when there is not enough room below', () => {
    renderDropdown({ anchor: { ...ANCHOR, y: 560 } });

    expect(panelStyle().bottom).toBe(86); // 640 - 560 + 6
    expect(panelStyle().top).toBeUndefined();
  });

  it('stays below a trigger near the top even though the space is tight', () => {
    // Above is tighter than below, so flipping would make it worse.
    renderDropdown({ anchor: { ...ANCHOR, y: 20 } });

    expect(panelStyle().top).toBe(86);
    expect(panelStyle().bottom).toBeUndefined();
  });

  it('caps the panel to the room available rather than overflowing', () => {
    mockWindowHeight = 300;
    renderDropdown({ anchor: { ...ANCHOR, y: 20 } });

    // 300 - (20 + 60 + 6) = 214, short of the 260 default.
    expect(panelStyle().maxHeight).toBe(214);
  });

  it('honours a caller\'s lower maxHeight', () => {
    renderDropdown({ maxHeight: 120 });

    expect(panelStyle().maxHeight).toBe(120);
  });

});
