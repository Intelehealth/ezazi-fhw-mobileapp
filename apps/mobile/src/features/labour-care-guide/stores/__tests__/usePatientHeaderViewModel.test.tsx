import '@/core/i18n';
import { act, renderHook } from '@testing-library/react-native';

import { onTablesChanged } from '@/core/db';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';

import { readPatient } from '../../data/timelineReader';
import type { PatientRow } from '../../domain/timelineModel';
import { usePatientHeaderViewModel } from '../usePatientHeaderViewModel';

jest.mock('@/core/db', () => ({ getDb: jest.fn(() => 'db-handle'), onTablesChanged: jest.fn() }));
jest.mock('../../data/timelineReader', () => ({ readPatient: jest.fn() }));
jest.mock('@/core/utils/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

const VISIT = 'visit-1';
const NOW = new Date('2026-10-26T10:00:00.000Z');
const ROW: PatientRow = {
  patientUuid: 'p1',
  openmrsId: 'EZ-DEV-0002',
  firstName: 'Live',
  middleName: null,
  lastName: 'Test Patient',
  dateOfBirth: '1997-08-21',
  gravida: null,
};

let tablesChanged: () => void;

describe('usePatientHeaderViewModel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.clearAllMocks();
    useDbBootstrapStore.setState({ phase: 'ready' });
    (onTablesChanged as jest.Mock).mockImplementation((_tables: unknown, listener: () => void) => {
      tablesChanged = listener;
      return jest.fn();
    });
    (readPatient as jest.Mock).mockReturnValue(ROW);
  });

  afterEach(() => jest.useRealTimers());

  it('is null until the database is ready, then shows the patient line', () => {
    useDbBootstrapStore.setState({ phase: 'preparing' });
    const { result, rerender } = renderHook(() => usePatientHeaderViewModel(VISIT));
    expect(result.current).toBeNull();
    expect(readPatient).not.toHaveBeenCalled();

    act(() => useDbBootstrapStore.setState({ phase: 'ready' }));
    rerender({});

    expect(readPatient).toHaveBeenCalledWith(VISIT, 'db-handle');
    expect(result.current).toEqual({ id: 'p1', name: 'Live Test Patient', ezId: 'EZ-DEV-0002', ageYears: 29, gravidaLabel: 'G-' });
  });

  it('shows gravida once the Admission obs is written', () => {
    const { result } = renderHook(() => usePatientHeaderViewModel(VISIT));
    (readPatient as jest.Mock).mockReturnValue({ ...ROW, gravida: '2' });

    act(() => tablesChanged());

    expect(result.current?.gravidaLabel).toBe('G2');
  });

  it('keeps the last good line when a read fails', () => {
    const { result } = renderHook(() => usePatientHeaderViewModel(VISIT));
    (readPatient as jest.Mock).mockImplementation(() => {
      throw new Error('db closed');
    });

    act(() => tablesChanged());

    expect(result.current?.name).toBe('Live Test Patient');
  });
});
