import type { CapabilityLifecycleRepository } from '../../../core/ports/repositories';
import { CapabilityLedgerEntry } from '../../../core/capability/ledger';
import { CapabilityDefinition, DrawCapabilityVersion } from '../../../core/capability/types';
import { MarkSnapshot } from '../../../core/draw/schema';
import { PersistenceError } from '../database';
import { shouldFailAfterCapabilityWrite } from '../atomicCommit';
import type { MemoryRecords } from './store';

function entriesFor(records: MemoryRecords, toolId: string) {
  return [...records.capabilityEntries.values()]
    .map((value) => CapabilityLedgerEntry.parse(value))
    .filter((entry) => entry.toolId === toolId)
    .sort((left, right) => left.sequence - right.sequence || left.eventId.localeCompare(right.eventId));
}

function assertNext(entries: readonly ReturnType<typeof CapabilityLedgerEntry.parse>[], entry: ReturnType<typeof CapabilityLedgerEntry.parse>) {
  if (entries.some((existing) => existing.eventId === entry.eventId)) throw new PersistenceError('capability event ids are immutable');
  if (entry.sequence !== entries.length + 1) throw new PersistenceError('capability events must have contiguous sequences');
}

function assertCommit(records: MemoryRecords, input: Parameters<CapabilityLifecycleRepository['commitDrawApproval']>[0]) {
  const approval = CapabilityLedgerEntry.parse(input.approval);
  const definition = CapabilityDefinition.parse(input.definition);
  const version = DrawCapabilityVersion.parse(input.version);
  const snapshot = MarkSnapshot.parse(input.snapshot);
  if (approval.type !== 'child_approval' || approval.actor !== 'child') throw new PersistenceError('only a child approval can activate a capability');
  if (definition.kind !== 'draw_pattern' || version.kind !== 'draw_pattern') throw new PersistenceError('draw approval must contain Draw records');
  if (definition.toolId !== version.toolId || definition.toolId !== snapshot.toolId || definition.currentVersionId !== version.versionId) throw new PersistenceError('approval records do not share an active tool identity');
  if (version.markSnapshotId !== snapshot.snapshotId) throw new PersistenceError('version must name the immutable snapshot it activates');
  const entries = entriesFor(records, definition.toolId);
  const candidate = entries.find((entry) => entry.type === 'capability_candidate' && entry.eventId === approval.candidateEventId);
  if (candidate === undefined) throw new PersistenceError('approval must reference an existing candidate');
  if (entries.some((entry) => entry.type === 'child_rejection' && entry.candidateEventId === approval.candidateEventId)) throw new PersistenceError('a rejected candidate can never be activated');
  assertNext(entries, approval);
  return { approval, definition, version, snapshot };
}

export function createMemoryCapabilityLifecycleRepository(records: MemoryRecords): CapabilityLifecycleRepository {
  return {
    async getDefinition(toolId) {
      const raw = records.capabilityDefinitions.get(toolId);
      return raw === undefined ? null : CapabilityDefinition.parse(raw);
    },
    async listDefinitionsByOwner(childId) {
      return [...records.capabilityDefinitions.values()]
        .map((value) => CapabilityDefinition.parse(value))
        .filter((definition) => definition.ownerChildId === childId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.toolId.localeCompare(right.toolId));
    },
    async listEntriesByTool(toolId) { return entriesFor(records, toolId); },
    async append(entry) {
      const parsed = CapabilityLedgerEntry.parse(entry);
      assertNext(entriesFor(records, parsed.toolId), parsed);
      records.capabilityEntries.set(parsed.eventId, parsed);
    },
    async commitDrawApproval(input) {
      const rawApproval = CapabilityLedgerEntry.parse(input.approval);
      if (rawApproval.type !== 'child_approval') throw new PersistenceError('only a child approval can activate a capability');
      const duplicate = [...records.capabilityEntries.values()]
        .map((value) => CapabilityLedgerEntry.parse(value))
        .find((entry) => entry.type === 'child_approval' && entry.idempotencyKey === rawApproval.idempotencyKey);
      if (duplicate !== undefined) {
        const existing = [...records.capabilityVersions.values()]
          .map((value) => DrawCapabilityVersion.parse(value))
          .find((version) => version.metadata.approvalEventId === duplicate.eventId);
        if (existing === undefined) throw new PersistenceError('duplicate approval key has no committed version');
        return existing;
      }
      const parsed = assertCommit(records, input);
      if (records.capabilityVersions.has(parsed.version.versionId) || records.markSnapshots.has(parsed.snapshot.snapshotId)) throw new PersistenceError('immutable approval output already exists');
      const snapshotBefore = new Map(records.markSnapshots);
      const entriesBefore = new Map(records.capabilityEntries);
      const versionsBefore = new Map(records.capabilityVersions);
      const definitionsBefore = new Map(records.capabilityDefinitions);
      try {
        records.markSnapshots.set(parsed.snapshot.snapshotId, parsed.snapshot);
        if (shouldFailAfterCapabilityWrite()) throw new PersistenceError('injected capability failure after snapshot write');
        records.capabilityEntries.set(parsed.approval.eventId, parsed.approval);
        records.capabilityVersions.set(parsed.version.versionId, parsed.version);
        records.capabilityDefinitions.set(parsed.definition.toolId, parsed.definition);
        return parsed.version;
      } catch (error) {
        for (const [target, before] of [[records.markSnapshots, snapshotBefore], [records.capabilityEntries, entriesBefore], [records.capabilityVersions, versionsBefore], [records.capabilityDefinitions, definitionsBefore]] as const) {
          target.clear();
          for (const [key, value] of before) target.set(key, value);
        }
        throw error;
      }
    },
    async getDrawVersion(versionId) {
      const raw = records.capabilityVersions.get(versionId);
      return raw === undefined ? null : DrawCapabilityVersion.parse(raw);
    },
    async listDrawVersionsByTool(toolId) {
      return [...records.capabilityVersions.values()]
        .map((value) => DrawCapabilityVersion.parse(value))
        .filter((version) => version.toolId === toolId)
        .sort((left, right) => left.version - right.version);
    },
  };
}
