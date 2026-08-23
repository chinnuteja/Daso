import { bodyFromVersion } from '../../core/compiler';
import { foldApprovedEvents } from '../../core/ledger/fold';
import { LedgerEntry } from '../../core/ledger/types';
import type { ForkSnapshot } from '../../core/reuse/types';
import { ToolDefinition } from '../../core/schema/toolDefinition';
import { ToolVersion } from '../../core/schema/toolVersion';
import { canonicalJson } from '../../core/serialization/canonicalJson';
import { PersistenceError } from './database';

export interface ForkStoreLookup {
  readonly sourceDefinition: ToolDefinition | null;
  readonly sourceVersion: ToolVersion | null;
  readonly targetDefinition: ToolDefinition | null;
  readonly targetVersion: ToolVersion | null;
  readonly existingEventIds: ReadonlySet<string>;
  readonly targetLedgerCount: number;
}

export function parseForkSnapshot(snapshot: ForkSnapshot): ForkSnapshot {
  const definition = ToolDefinition.parse(snapshot.definition);
  const version = ToolVersion.parse(snapshot.version);
  const ledger = snapshot.ledger.map((entry) => LedgerEntry.parse(entry));
  if (definition.forkedFrom === undefined) {
    throw new PersistenceError('fork snapshot must carry forkedFrom lineage');
  }
  if (definition.toolId !== version.toolId) {
    throw new PersistenceError('fork definition and version must name the same tool');
  }
  if (definition.currentVersionId !== version.versionId) {
    throw new PersistenceError('fork definition must point at the fork version');
  }
  if (definition.toolId === definition.forkedFrom.toolId) {
    throw new PersistenceError('fork tool id must differ from the source tool id');
  }
  const folded = foldApprovedEvents(ledger);
  if (canonicalJson(folded) !== canonicalJson(bodyFromVersion(version))) {
    throw new PersistenceError('fork version body does not equal the fold of the fork ledger');
  }
  return { definition, version, ledger };
}

export function assertForkLookup(snapshot: ForkSnapshot, lookup: ForkStoreLookup): void {
  const lineage = snapshot.definition.forkedFrom;
  if (lineage === undefined) {
    throw new PersistenceError('fork snapshot must carry forkedFrom lineage');
  }
  if (lookup.sourceDefinition === null) {
    throw new PersistenceError(`source definition ${lineage.toolId} is missing`);
  }
  if (lookup.sourceDefinition.toolId !== lineage.toolId) {
    throw new PersistenceError('source definition does not match lineage tool id');
  }
  if (lookup.sourceDefinition.ownerChildId !== lineage.ownerChildId) {
    throw new PersistenceError('source owner does not match lineage owner');
  }
  if (lookup.sourceDefinition.currentVersionId !== lineage.versionId) {
    throw new PersistenceError('lineage version is not the source active version');
  }
  if (lookup.sourceVersion === null) {
    throw new PersistenceError(`source version ${lineage.versionId} is missing`);
  }
  if (lookup.sourceVersion.toolId !== lineage.toolId) {
    throw new PersistenceError('source version belongs to a different tool');
  }
  if (lookup.sourceVersion.versionId !== lineage.versionId) {
    throw new PersistenceError('source version does not match lineage');
  }
  if (lookup.targetDefinition !== null) {
    throw new PersistenceError(`target tool ${snapshot.definition.toolId} already exists`);
  }
  if (lookup.targetVersion !== null) {
    throw new PersistenceError(`target version ${snapshot.version.versionId} already exists`);
  }
  if (lookup.targetLedgerCount > 0) {
    throw new PersistenceError(`target ledger for ${snapshot.definition.toolId} is not empty`);
  }
  for (const entry of snapshot.ledger) {
    if (lookup.existingEventIds.has(entry.eventId)) {
      throw new PersistenceError(`target event ${entry.eventId} already exists`);
    }
  }
}
