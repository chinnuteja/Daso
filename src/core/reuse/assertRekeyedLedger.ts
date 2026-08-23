import { bodyFromVersion } from '../compiler';
import { foldApprovedEvents } from '../ledger/fold';
import { compareEntries, type LedgerEntry } from '../ledger/types';
import type { ToolId } from '../schema/primitives';
import type { ToolVersion } from '../schema/toolVersion';
import { canonicalJson } from '../serialization/canonicalJson';
import { ForkBuildError } from './types';

/**
 * Proves a target ledger is a complete structural re-key of one source ledger.
 * Pure: no repository, clock, or I/O.
 */
export function assertRekeyedLedger(input: {
  readonly sourceLedger: readonly LedgerEntry[];
  readonly targetLedger: readonly LedgerEntry[];
  readonly sourceVersion: ToolVersion;
  readonly targetVersion: ToolVersion;
  readonly targetToolId: ToolId;
}): void {
  const source = [...input.sourceLedger].sort(compareEntries);
  const target = [...input.targetLedger].sort(compareEntries);
  if (source.length !== target.length) {
    throw new ForkBuildError(
      `fork ledger must re-key every source entry; source has ${source.length}, target has ${target.length}`,
    );
  }

  const sourceIds = new Set(source.map((entry) => entry.eventId));
  const targetIds = new Set<string>();
  const idBySource = new Map<string, string>();

  source.forEach((sourceEntry, index) => {
    const targetEntry = target[index];
    if (targetEntry === undefined) {
      throw new ForkBuildError('fork ledger is missing a remapped source entry');
    }
    if (sourceEntry.sequence !== targetEntry.sequence) {
      throw new ForkBuildError(
        `fork ledger sequence order diverged at ${sourceEntry.sequence}`,
      );
    }
    if (sourceEntry.entryKind !== targetEntry.entryKind) {
      throw new ForkBuildError(`fork ledger entry kind diverged at sequence ${sourceEntry.sequence}`);
    }
    if (targetEntry.toolId !== input.targetToolId) {
      throw new ForkBuildError(`fork ledger entry ${targetEntry.eventId} does not use the target tool id`);
    }
    if (targetEntry.eventId === sourceEntry.eventId || sourceIds.has(targetEntry.eventId)) {
      throw new ForkBuildError(`fork event ${targetEntry.eventId} reuses a source event id`);
    }
    if (targetIds.has(targetEntry.eventId)) {
      throw new ForkBuildError(`fork event ${targetEntry.eventId} is duplicated`);
    }
    targetIds.add(targetEntry.eventId);
    idBySource.set(sourceEntry.eventId, targetEntry.eventId);

    if (sourceEntry.entryKind === 'candidate' && targetEntry.entryKind === 'candidate') {
      if (sourceEntry.actor !== targetEntry.actor || sourceEntry.type !== targetEntry.type) {
        throw new ForkBuildError(`fork candidate actor/type changed at sequence ${sourceEntry.sequence}`);
      }
      if (sourceEntry.originalInput !== targetEntry.originalInput) {
        throw new ForkBuildError(`fork candidate originalInput changed at sequence ${sourceEntry.sequence}`);
      }
      if (canonicalJson(sourceEntry.candidateMutation) !== canonicalJson(targetEntry.candidateMutation)) {
        throw new ForkBuildError(`fork candidate mutation changed at sequence ${sourceEntry.sequence}`);
      }
      if (sourceEntry.createdAt !== targetEntry.createdAt) {
        throw new ForkBuildError(`fork candidate createdAt changed at sequence ${sourceEntry.sequence}`);
      }
      return;
    }

    if (sourceEntry.entryKind === 'approval' && targetEntry.entryKind === 'approval') {
      if (sourceEntry.actor !== targetEntry.actor || sourceEntry.createdAt !== targetEntry.createdAt) {
        throw new ForkBuildError(`fork approval actor/createdAt changed at sequence ${sourceEntry.sequence}`);
      }
    }
  });

  for (const [index, sourceEntry] of source.entries()) {
    if (sourceEntry.entryKind !== 'approval') {
      continue;
    }
    const targetEntry = target[index];
    if (targetEntry === undefined || targetEntry.entryKind !== 'approval') {
      throw new ForkBuildError('fork approval mapping is incomplete');
    }
    const remapped = idBySource.get(sourceEntry.approves);
    if (remapped === undefined || targetEntry.approves !== remapped) {
      throw new ForkBuildError(
        `fork approval ${targetEntry.eventId} does not point at the remapped source candidate`,
      );
    }
  }

  if (
    canonicalJson(foldApprovedEvents(source)) !== canonicalJson(bodyFromVersion(input.sourceVersion))
  ) {
    throw new ForkBuildError('source version body does not equal the fold of the source ledger');
  }
  if (
    canonicalJson(foldApprovedEvents(target)) !== canonicalJson(bodyFromVersion(input.targetVersion))
  ) {
    throw new ForkBuildError('target version body does not equal the fold of the target ledger');
  }
}
