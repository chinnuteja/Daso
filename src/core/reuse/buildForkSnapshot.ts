import { bodyFromVersion, compileToolVersion } from '../compiler';
import { foldApprovedEvents } from '../ledger/fold';
import { LedgerEntry } from '../ledger/types';
import { canonicalJson } from '../serialization/canonicalJson';
import { deepFreeze } from '../serialization/deepFreeze';
import { ToolDefinition } from '../schema/toolDefinition';
import { ForkBuildError, type BuildForkSnapshotInput, type ForkSnapshot } from './types';

/**
 * Pure one-generation fork. Re-keys the source ledger, remaps approvals, compiles the
 * target version from that ledger, and attaches lineage. Performs no I/O.
 */
export function buildForkSnapshot(input: BuildForkSnapshotInput): ForkSnapshot {
  assertSourcePointer(input);
  assertSourceFold(input);
  if (input.targetToolId === input.sourceDefinition.toolId) {
    throw new ForkBuildError('target tool id must differ from the source tool id');
  }

  const remapped = remapLedger(input);
  const compiled = compileToolVersion(remapped, {
    versionId: input.targetVersionId,
    compiledAt: input.forkedAt,
  });
  const folded = foldApprovedEvents(remapped);
  if (canonicalJson(folded) !== canonicalJson(bodyFromVersion(compiled))) {
    throw new ForkBuildError('compiled target version does not equal the fold of the target ledger');
  }

  const definition = ToolDefinition.parse({
    toolId: input.targetToolId,
    ownerChildId: input.targetOwnerChildId,
    displayName: input.targetDisplayName,
    kind: 'experiment_comparator',
    currentVersionId: compiled.versionId,
    createdAt: input.forkedAt,
    forkedFrom: {
      toolId: input.sourceDefinition.toolId,
      versionId: input.sourceVersion.versionId,
      ownerChildId: input.sourceDefinition.ownerChildId,
    },
  });

  return deepFreeze({
    definition,
    version: compiled,
    ledger: remapped,
  });
}

function assertSourcePointer(input: BuildForkSnapshotInput): void {
  if (input.sourceVersion.toolId !== input.sourceDefinition.toolId) {
    throw new ForkBuildError('source version belongs to a different tool');
  }
  if (input.sourceDefinition.currentVersionId !== input.sourceVersion.versionId) {
    throw new ForkBuildError('source version is not the active version');
  }
}

function assertSourceFold(input: BuildForkSnapshotInput): void {
  const folded = foldApprovedEvents(input.sourceLedger);
  if (canonicalJson(folded) !== canonicalJson(bodyFromVersion(input.sourceVersion))) {
    throw new ForkBuildError('source version body does not equal the fold of the source ledger');
  }
}

function remapLedger(input: BuildForkSnapshotInput): readonly LedgerEntry[] {
  const source = input.sourceLedger.map((entry) => LedgerEntry.parse(entry));
  if (input.replacementEventIds.length !== source.length) {
    throw new ForkBuildError('replacement event ids must cover every source ledger entry');
  }
  const unique = new Set(input.replacementEventIds);
  if (unique.size !== input.replacementEventIds.length) {
    throw new ForkBuildError('replacement event ids must be unique');
  }

  const idBySource = new Map<string, string>();
  source.forEach((entry, index) => {
    const nextId = input.replacementEventIds[index];
    if (nextId === undefined) {
      throw new ForkBuildError('replacement event id was missing');
    }
    idBySource.set(entry.eventId, nextId);
  });

  return source.map((entry) => {
    const eventId = idBySource.get(entry.eventId);
    if (eventId === undefined) {
      throw new ForkBuildError('replacement event id was missing');
    }
    if (entry.entryKind === 'candidate') {
      return LedgerEntry.parse({
        ...entry,
        eventId,
        toolId: input.targetToolId,
      });
    }
    const approves = idBySource.get(entry.approves);
    if (approves === undefined) {
      throw new ForkBuildError('approval mapping is incomplete');
    }
    return LedgerEntry.parse({
      ...entry,
      eventId,
      toolId: input.targetToolId,
      approves,
    });
  });
}
