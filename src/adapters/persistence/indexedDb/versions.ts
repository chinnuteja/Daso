import type { ToolVersionRepository } from '../../../core/ports/repositories';
import type { ToolId, ToolVersionId } from '../../../core/schema/primitives';
import { ToolDefinition } from '../../../core/schema/toolDefinition';
import { ToolVersion } from '../../../core/schema/toolVersion';
import { deepFreeze } from '../../../core/serialization/deepFreeze';
import { LedgerEntry } from '../../../core/ledger/types';
import type { ForkSnapshot } from '../../../core/reuse/types';
import { shouldFailAfterForkWrite, shouldFailAfterVersionWrite } from '../atomicCommit';
import { PersistenceError, STORE, type TeachDasoDatabase } from '../database';
import { assertForkLookup, parseForkSnapshot, rejectLineageOnDirectWrite } from '../forkCommit';
import { abortTransaction, getParsed, listByToolIndex } from './access';

export function createIndexedDbVersionRepository(
  database: TeachDasoDatabase,
): ToolVersionRepository {
  return {
    async get(versionId: ToolVersionId): Promise<ToolVersion | null> {
      const parsed = await getParsed(database, STORE.toolVersions, versionId, ToolVersion);
      return parsed === null ? null : deepFreeze(parsed);
    },

    async listByTool(toolId: ToolId): Promise<readonly ToolVersion[]> {
      const found = await listByToolIndex(database, STORE.toolVersions, toolId, ToolVersion);
      return found
        .map((version) => deepFreeze(version))
        .sort((left, right) => left.version - right.version);
    },

    async save(version: ToolVersion): Promise<void> {
      const parsed = ToolVersion.parse(version);
      const existing = await database.get(STORE.toolVersions, parsed.versionId);
      if (existing !== undefined) {
        throw new PersistenceError(
          `version ${parsed.versionId} already exists; compiled versions are immutable`,
        );
      }
      await database.put(STORE.toolVersions, parsed);
    },

    async saveAndActivate(version: ToolVersion, definition: ToolDefinition): Promise<void> {
      const parsedVersion = ToolVersion.parse(version);
      const parsedDefinition = ToolDefinition.parse(definition);
      rejectLineageOnDirectWrite(parsedDefinition);
      if (parsedVersion.toolId !== parsedDefinition.toolId) {
        throw new PersistenceError('version and definition must name the same tool');
      }
      if (parsedDefinition.currentVersionId !== parsedVersion.versionId) {
        throw new PersistenceError('definition must point at the version being activated');
      }

      const tx = database.transaction([STORE.toolVersions, STORE.tools], 'readwrite');
      const versionStore = tx.objectStore(STORE.toolVersions);
      const toolStore = tx.objectStore(STORE.tools);
      const existing = await versionStore.get(parsedVersion.versionId);
      if (existing !== undefined) {
        await abortTransaction(
          tx,
          `version ${parsedVersion.versionId} already exists; compiled versions are immutable`,
        );
      }
      await versionStore.put(parsedVersion);
      if (shouldFailAfterVersionWrite()) {
        await abortTransaction(tx, 'injected compilation failure after version write');
      }
      await toolStore.put(parsedDefinition);
      await tx.done;
    },

    async saveForkSnapshot(snapshot: ForkSnapshot): Promise<void> {
      const parsed = parseForkSnapshot(snapshot);
      const lineage = parsed.definition.forkedFrom;
      if (lineage === undefined) {
        throw new PersistenceError('fork snapshot must carry forkedFrom lineage');
      }

      const tx = database.transaction(
        [STORE.ledgerEntries, STORE.toolVersions, STORE.tools],
        'readwrite',
      );
      const ledgerStore = tx.objectStore(STORE.ledgerEntries);
      const versionStore = tx.objectStore(STORE.toolVersions);
      const toolStore = tx.objectStore(STORE.tools);

      const rawSourceTool = await toolStore.get(lineage.toolId);
      const rawSourceVersion = await versionStore.get(lineage.versionId);
      const rawTargetTool = await toolStore.get(parsed.definition.toolId);
      const rawTargetVersion = await versionStore.get(parsed.version.versionId);
      const sourceLedgerRaw = await ledgerStore.index('toolId').getAll(lineage.toolId);
      const targetLedger = await ledgerStore.index('toolId').getAll(parsed.definition.toolId);
      const existingEventIds = new Set<string>();
      for (const entry of parsed.ledger) {
        const existing = await ledgerStore.get(entry.eventId);
        if (existing !== undefined) {
          existingEventIds.add(entry.eventId);
        }
      }

      try {
        assertForkLookup(parsed, {
          sourceDefinition: rawSourceTool === undefined ? null : ToolDefinition.parse(rawSourceTool),
          sourceVersion:
            rawSourceVersion === undefined ? null : ToolVersion.parse(rawSourceVersion),
          sourceLedger: sourceLedgerRaw.map((entry) => LedgerEntry.parse(entry)),
          targetDefinition: rawTargetTool === undefined ? null : ToolDefinition.parse(rawTargetTool),
          targetVersion:
            rawTargetVersion === undefined ? null : ToolVersion.parse(rawTargetVersion),
          existingEventIds,
          targetLedgerCount: targetLedger.length,
        });
      } catch (error) {
        await abortTransaction(
          tx,
          error instanceof Error ? error.message : 'fork snapshot is invalid',
        );
      }

      const first = parsed.ledger[0];
      if (first !== undefined) {
        await ledgerStore.put(first);
      }
      if (shouldFailAfterForkWrite()) {
        await abortTransaction(tx, 'injected fork failure after target write');
      }
      for (const entry of parsed.ledger.slice(1)) {
        await ledgerStore.put(entry);
      }
      await versionStore.put(parsed.version);
      await toolStore.put(parsed.definition);
      await tx.done;
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      const found = await listByToolIndex(database, STORE.toolVersions, toolId, ToolVersion);
      const tx = database.transaction(STORE.toolVersions, 'readwrite');
      for (const version of found) {
        await tx.store.delete(version.versionId);
      }
      await tx.done;
    },
  };
}
