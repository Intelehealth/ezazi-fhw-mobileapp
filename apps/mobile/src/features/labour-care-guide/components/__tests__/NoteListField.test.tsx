import '@/core/i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { getCardLayout } from '@ezazi/clinical-rules';

import { toTabViews } from '../../domain/captureFieldView';
import { NoteListField } from '../NoteListField';

const FIELD = toTabViews(getCardLayout('Stage1_Hour1_1')!, 'default')
  .flatMap((tab) => tab.fields)
  .find((field) => field.id === 'assessment')!;

describe('NoteListField', () => {
  it('adds a note with Android\'s first-letter capital, stored as typed, and empties the box', async () => {
    const onAdd = jest.fn();
    render(<NoteListField field={FIELD} notes={[]} onAdd={onAdd} />);
    expect(screen.getByRole('button', { name: '+ Add' }).props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByLabelText('Assessment'), 'progressing well'); // Android filter
    fireEvent.press(screen.getByRole('button', { name: '+ Add' }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('Progressing well'));
    await waitFor(() => expect(screen.getByLabelText('Assessment').props.value).toBe(''));
  });

  it('lists saved and new notes; none can be removed, as Android (open point 14)', () => {
    render(<NoteListField field={FIELD} savedNotes={['Admitted']} notes={['Progressing well']} onAdd={jest.fn()} />);
    expect(screen.getByText('Admitted')).toBeTruthy();
    expect(screen.getByText('Progressing well')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
  });
});
