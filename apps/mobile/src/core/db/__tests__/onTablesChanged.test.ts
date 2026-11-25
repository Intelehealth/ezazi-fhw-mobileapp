import { addDatabaseChangeListener } from 'expo-sqlite';

import { onTablesChanged } from '..';
import { encounter, obs } from '../schema';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
  addDatabaseChangeListener: jest.fn(),
}));

type ChangeEvent = { tableName: string };
let emit: (event: ChangeEvent) => void;
const remove = jest.fn();

/** One timeline re-read per burst of row changes, only for the watched tables. */
describe('onTablesChanged', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    remove.mockClear();
    (addDatabaseChangeListener as jest.Mock).mockImplementation((callback: (event: ChangeEvent) => void) => {
      emit = callback;
      return { remove };
    });
  });

  afterEach(() => jest.useRealTimers());

  it('calls the listener once for a burst of changes to watched tables', () => {
    const listener = jest.fn();
    onTablesChanged([encounter, obs], listener);

    for (let row = 0; row < 20; row += 1) emit({ tableName: 'tbl_obs' });
    emit({ tableName: 'tbl_encounter' });
    expect(listener).not.toHaveBeenCalled();

    jest.runAllTimers();
    expect(listener).toHaveBeenCalledTimes(1);

    emit({ tableName: 'tbl_obs' });
    jest.runAllTimers();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('ignores tables it does not watch', () => {
    const listener = jest.fn();
    onTablesChanged([encounter], listener);

    emit({ tableName: 'tbl_patient' });
    jest.runAllTimers();

    expect(listener).not.toHaveBeenCalled();
  });

  it('drops a pending call when unsubscribed', () => {
    const listener = jest.fn();
    const unsubscribe = onTablesChanged([obs], listener);

    emit({ tableName: 'tbl_obs' });
    unsubscribe();
    jest.runAllTimers();

    expect(listener).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
