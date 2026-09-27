import type { CapabilityLifecycleRepository } from '../../../core/ports/repositories';
import { CapabilityLedgerEntry } from '../../../core/capability/ledger';
import { CapabilityDefinition, DrawCapabilityVersion } from '../../../core/capability/types';
import { MarkSnapshot } from '../../../core/draw/schema';
import { PersistenceError, STORE, type TeachDasoDatabase } from '../database';
import { abortTransaction } from './access';
import { shouldFailAfterCapabilityWrite } from '../atomicCommit';

export function createIndexedDbCapabilityLifecycleRepository(database: TeachDasoDatabase): CapabilityLifecycleRepository {
  return {
    async getDefinition(toolId) {
      const raw = await database.get(STORE.capabilityDefinitions, toolId);
      return raw === undefined ? null : CapabilityDefinition.parse(raw);
    },
    async listDefinitionsByOwner(childId) {
      return (await database.getAllFromIndex(STORE.capabilityDefinitions, 'ownerChildId', childId))
        .map((value) => CapabilityDefinition.parse(value))
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.toolId.localeCompare(right.toolId));
    },
    async listEntriesByTool(toolId) {
      return (await database.getAllFromIndex(STORE.capabilityEntries, 'toolId', toolId))
        .map((value) => CapabilityLedgerEntry.parse(value))
        .sort((left, right) => left.sequence - right.sequence || left.eventId.localeCompare(right.eventId));
    },
    async append(entry) {
      const parsed = CapabilityLedgerEntry.parse(entry);
      const tx = database.transaction(STORE.capabilityEntries, 'readwrite');
      const prior = (await tx.store.index('toolId').getAll(parsed.toolId)).map((value) => CapabilityLedgerEntry.parse(value));
      if (prior.some((existing) => existing.eventId === parsed.eventId) || parsed.sequence !== prior.length + 1) {
        await abortTransaction(tx, 'capability events must have unique, contiguous sequences');
      }
      await tx.store.put(parsed);
      await tx.done;
    },
    async commitDrawApproval(input) {
      const approval = CapabilityLedgerEntry.parse(input.approval);
      const definition = CapabilityDefinition.parse(input.definition);
      const version = DrawCapabilityVersion.parse(input.version);
      const snapshot = MarkSnapshot.parse(input.snapshot);
      if (approval.type !== 'child_approval' || approval.actor !== 'child') throw new PersistenceError('only a child approval can activate a capability');
      const tx = database.transaction([STORE.capabilityDefinitions, STORE.capabilityVersions, STORE.capabilityEntries, STORE.markSnapshots], 'readwrite');
      const entries = (await tx.objectStore(STORE.capabilityEntries).index('toolId').getAll(definition.toolId)).map((value) => CapabilityLedgerEntry.parse(value));
      const duplicate = (await tx.objectStore(STORE.capabilityEntries).index('idempotencyKey').get(approval.idempotencyKey));
      if (duplicate !== undefined) {
        const duplicateEntry = CapabilityLedgerEntry.parse(duplicate);
        const existing = (await tx.objectStore(STORE.capabilityVersions).index('toolId').getAll(definition.toolId))
          .map((value) => DrawCapabilityVersion.parse(value))
          .find((candidateVersion) => candidateVersion.metadata.approvalEventId === duplicateEntry.eventId);
        if (existing === undefined) {
          await abortTransaction(tx, 'duplicate approval key has no committed version');
          throw new PersistenceError('duplicate approval key has no committed version');
        }
        await tx.done;
        return existing;
      }
      const candidate = entries.find((entry) => entry.type === 'capability_candidate' && entry.eventId === approval.candidateEventId);
      const rejected = entries.some((entry) => entry.type === 'child_rejection' && entry.candidateEventId === approval.candidateEventId);
      if (candidate === undefined || rejected || approval.sequence !== entries.length + 1 || definition.currentVersionId !== version.versionId || version.markSnapshotId !== snapshot.snapshotId || definition.toolId !== version.toolId || definition.toolId !== snapshot.toolId) {
        await abortTransaction(tx, 'draw approval no longer matches the reviewed candidate');
      }
      if ((await tx.objectStore(STORE.capabilityVersions).get(version.versionId)) !== undefined || (await tx.objectStore(STORE.markSnapshots).get(snapshot.snapshotId)) !== undefined) {
        await abortTransaction(tx, 'immutable approval output already exists');
      }
      await tx.objectStore(STORE.markSnapshots).put(snapshot);
      if (shouldFailAfterCapabilityWrite()) await abortTransaction(tx, 'injected capability failure after snapshot write');
      await tx.objectStore(STORE.capabilityEntries).put(approval);
      await tx.objectStore(STORE.capabilityVersions).put(version);
      await tx.objectStore(STORE.capabilityDefinitions).put(definition);
      await tx.done;
      return version;
    },
    async getDrawVersion(versionId) {
      const raw = await database.get(STORE.capabilityVersions, versionId);
      return raw === undefined ? null : DrawCapabilityVersion.parse(raw);
    },
    async listDrawVersionsByTool(toolId) {
      return (await database.getAllFromIndex(STORE.capabilityVersions, 'toolId', toolId))
        .map((value) => DrawCapabilityVersion.parse(value))
        .sort((left, right) => left.version - right.version);
    },
  };
}
