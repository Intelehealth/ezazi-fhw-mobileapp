import * as repositories from '../../repositories';
import { transact, type DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * Guards the barrel itself. A repository added under `repositories/` but left
 * out of `index.ts` is invisible to every consumer and nothing else would
 * fail — so the count here is deliberately brittle, like `constants.test.ts`.
 */

const EXPECTED = [
  'encounterRepo',
  'imageRepo',
  'locationRepo',
  'obsRepo',
  'patientRepo',
  'providerAttributeRepo',
  'providerRepo',
  'rtcConnectionRepo',
  'visitAttributeRepo',
  'visitRepo',
] as const;

describe('repositories barrel', () => {
  it('exports every repository, and only those', () => {
    expect(Object.keys(repositories).sort()).toEqual([...EXPECTED].sort());
  });

  it('exposes a non-empty namespace for each', () => {
    for (const name of EXPECTED) {
      const namespace = repositories[name] as Record<string, unknown>;
      const fns = Object.values(namespace).filter((v) => typeof v === 'function');

      expect(fns.length).toBeGreaterThan(0);
    }
  });

  it('composes across repositories inside one transaction', () => {
    // The point of the barrel: one import, one handle, one unit of work.
    let ctx: TestDb | null = null;

    return createTestDb().then((created) => {
      ctx = created;
      const db = ctx.db as DbHandle;

      try {
        expect(() =>
          transact((tx) => {
            repositories.patientRepo.createPatient(
              'pt1',
              { first_name: 'A', last_name: 'B' },
              tx,
            );
            repositories.visitRepo.create({ uuid: 'v1', patientuuid: 'pt1' }, tx);
            repositories.encounterRepo.upsert({ uuid: 'e1', visituuid: 'v1' }, tx);
            repositories.obsRepo.insert({ encounteruuid: 'e1', conceptuuid: 'c1' }, tx);
            throw new Error('boom');
          }, db),
        ).toThrow('boom');

        expect(repositories.patientRepo.listDirtyPatients(db)).toEqual([]);
        expect(repositories.visitRepo.findAll(db)).toEqual([]);
        expect(repositories.encounterRepo.findAll(db)).toEqual([]);
        expect(repositories.obsRepo.listByEncounter('e1', db)).toEqual([]);
      } finally {
        ctx.close();
      }
    });
  });
});
