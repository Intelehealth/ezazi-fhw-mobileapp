import '@/core/i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { getCardLayout } from '@ezazi/clinical-rules';

import { toTabViews } from '../../domain/captureFieldView';
import { NoteListField } from '../NoteListField';

const FIELD = toTabViews(getCardLayout('Stage1_Hour1_1')!, 'default')
  .flatMap((tab) => tab.fields)
  .find((field) => field.id === 'assessment')!;

describe('NoteListField', () => {
  it('adds a typed note, trimmed, and empties the box', async () => {
    const onAdd = jest.fn();
    render(<NoteListField field={FIELD} notes={[]} onAdd={onAdd} onRemove={jest.fn()} />);
    expect(screen.getByRole('button', { name: '+ Add' }).props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByLabelText('Assessment'), '  Progressing well ');
    fireEvent.press(screen.getByRole('button', { name: '+ Add' }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('Progressing well'));
    await waitFor(() => expect(screen.getByLabelText('Assessment').props.value).toBe(''));
  });

  it('lists the notes added on this card, each removable', () => {
    const onRemove = jest.fn();
    render(<NoteListField field={FIELD} notes={['Progressing well']} onAdd={jest.fn()} onRemove={onRemove} />);
    fireEvent.press(screen.getByRole('button', { name: 'Remove Assessment note' }));
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});
