import { relations } from 'drizzle-orm';

import {
  encounter,
  obs,
  patient,
  patientAttribute,
  provider,
  providerAttribute,
  visit,
  visitAttribute,
} from './schema';

/**
 * How rows join, for `db.query` nested reads. Mirrors the predicates the legacy
 * Android DAOs hand-wrote — nothing speculative. Emits zero DDL and no foreign
 * keys, so writes, deletes and sync are unaffected. Type lookups are absent on
 * purpose: resolve types by uuid constant. `obs.creatoruuid` is too — it joins
 * `provider.useruuid` under a role predicate, which no relation can express.
 */

export const patientRelations = relations(patient, ({ many }) => ({
  attributes: many(patientAttribute),
  visits: many(visit),
}));

export const patientAttributeRelations = relations(patientAttribute, ({ one }) => ({
  patient: one(patient, {
    fields: [patientAttribute.patientuuid],
    references: [patient.uuid],
  }),
}));

export const visitRelations = relations(visit, ({ one, many }) => ({
  patient: one(patient, {
    fields: [visit.patientuuid],
    references: [patient.uuid],
  }),
  attributes: many(visitAttribute),
  encounters: many(encounter),
}));

export const visitAttributeRelations = relations(visitAttribute, ({ one }) => ({
  visit: one(visit, {
    fields: [visitAttribute.visit_uuid],
    references: [visit.uuid],
  }),
}));

export const encounterRelations = relations(encounter, ({ one, many }) => ({
  visit: one(visit, {
    fields: [encounter.visituuid],
    references: [visit.uuid],
  }),
  observations: many(obs),
}));

export const obsRelations = relations(obs, ({ one }) => ({
  encounter: one(encounter, {
    fields: [obs.encounteruuid],
    references: [encounter.uuid],
  }),
}));

export const providerRelations = relations(provider, ({ many }) => ({
  attributes: many(providerAttribute),
}));

export const providerAttributeRelations = relations(providerAttribute, ({ one }) => ({
  provider: one(provider, {
    fields: [providerAttribute.provideruuid],
    references: [provider.uuid],
  }),
}));

export const schemaRelations = {
  patientRelations,
  patientAttributeRelations,
  visitRelations,
  visitAttributeRelations,
  encounterRelations,
  obsRelations,
  providerRelations,
  providerAttributeRelations,
};
