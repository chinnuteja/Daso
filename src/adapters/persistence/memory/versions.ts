import type { ToolVersionRepository } from '../../../core/ports/repositories';
import type { ToolId, ToolVersionId } from '../../../core/schema/primitives';
import { ToolDefinition } from '../../../core/schema/toolDefinition';
import { ToolVersion } from '../../../core/schema/toolVersion';
import { deepFreeze } from '../../../core/serialization/deepFreeze';
import type { ForkSnapshot } from '../../../core/reuse/types';
import { LedgerEntry } from '../../../core/ledger/types';
import { shouldFailAfterForkWrite, shouldFailAfterVersionWrite } from '../atomicCommit';
import { PersistenceError } from '../database';
import { assertForkLookup, parseForkSnapshot } from '../forkCommit';
import type { MemoryRecords } from './store';

export function createMemoryVersionRepository(records: MemoryRecords): ToolVersionRepository {
  return {
    async get(versionId: ToolVersionId): Promise<ToolVersion | null> {
      const raw = records.versions.get(versionId);
      if (raw === undefined) {
        return null;
      }
      return deepFreeze(ToolVersion.parse(raw));
    },

    async listByTool(toolId: ToolId): Promise<readonly ToolVersion[]> {
      const found: ToolVersion[] = [];
      for (const raw of records.versions.values()) {
        const parsed = ToolVersion.parse(raw);
        if (parsed.toolId === toolId) {
          found.push(deepFreeze(parsed));
        }
      }
      return found.sort((left, right) => left.version - right.version);
    },

    async save(version: ToolVersion): Promise<void> {
      const parsed = ToolVersion.parse(version);
      if (records.versions.has(parsed.versionId)) {
        throw new PersistenceError(
          `version ${parsed.versionId} already exists; compiled versions are immutable`,
        );
      }
      records.versions.set(parsed.versionId, parsed);
    },

    async saveAndActivate(version: ToolVersion, definition: ToolDefinition): Promise<void> {
      const parsedVersion = ToolVersion.parse(version);
      const parsedDefinition = ToolDefinition.parse(definition);
      if (parsedVersion.toolId !== parsedDefinition.toolId) {
        throw new PersistenceError('version and definition must name the same tool');
      }
      if (parsedDefinition.currentVersionId !== parsedVersion.versionId) {
        throw new PersistenceError('definition must point at the version being activated');
      }
      if (records.versions.has(parsedVersion.versionId)) {
        throw new PersistenceError(
          `version ${parsedVersion.versionId} already exists; compiled versions are immutable`,
        );
      }

      const versionsSnapshot = new Map(records.versions);
      const toolsSnapshot = new Map(records.tools);
      try {
        records.versions.set(parsedVersion.versionId, parsedVersion);
        if (shouldFailAfterVersionWrite()) {
          throw new PersistenceError('injected compilation failure after version write');
        }
        records.tools.set(parsedDefinition.toolId, parsedDefinition);
      } catch (error) {
        records.versions.clear();
        for (const [key, value] of versionsSnapshot) {
          records.versions.set(key, value);
        }
        records.tools.clear();
        for (const [key, value] of toolsSnapshot) {
          records.tools.set(key, value);
        }
        throw error;
      }
    },

    async saveForkSnapshot(snapshot: ForkSnapshot): Promise<void> {
      const parsed = parseForkSnapshot(snapshot);
      const lineage = parsed.definition.forkedFrom;
      if (lineage === undefined) {
        throw new PersistenceError('fork snapshot must carry forkedFrom lineage');
      }
      const sourceRaw = records.tools.get(lineage.toolId);
      const sourceVersionRaw = records.versions.get(lineage.versionId);
      let targetLedgerCount = 0;
      const existingEventIds = new Set<string>();
      for (const raw of records.ledger.values()) {
        const entry = LedgerEntry.parse(raw);
        existingEventIds.add(entry.eventId);
        if (entry.toolId === parsed.definition.toolId) {
          targetLedgerCount += 1;
        }
      }
      assertForkLookup(parsed, {
        sourceDefinition: sourceRaw === undefined ? null : ToolDefinition.parse(sourceRaw),
        sourceVersion: sourceVersionRaw === undefined ? null : ToolVersion.parse(sourceVersionRaw),
        targetDefinition:
          records.tools.get(parsed.definition.toolId) === undefined
            ? null
            : ToolDefinition.parse(records.tools.get(parsed.definition.toolId)),
        targetVersion:
          records.versions.get(parsed.version.versionId) === undefined
            ? null
            : ToolVersion.parse(records.versions.get(parsed.version.versionId)),
        existingEventIds,
        targetLedgerCount,
      });

      const ledgerSnapshot = new Map(records.ledger);
      const versionsSnapshot = new Map(records.versions);
      const toolsSnapshot = new Map(records.tools);
      try {
        const first = parsed.ledger[0];
        if (first !== undefined) {
          records.ledger.set(first.eventId, first);
        }
        if (shouldFailAfterForkWrite()) {
          throw new PersistenceError('injected fork failure after target write');
        }
        for (const entry of parsed.ledger.slice(1)) {
          records.ledger.set(entry.eventId, entry);
        }
        records.versions.set(parsed.version.versionId, parsed.version);
        records.tools.set(parsed.definition.toolId, parsed.definition);
      } catch (error) {
        records.ledger.clear();
        for (const [key, value] of ledgerSnapshot) {
          records.ledger.set(key, value);
        }
        records.versions.clear();
        for (const [key, value] of versionsSnapshot) {
          records.versions.set(key, value);
        }
        records.tools.clear();
        for (const [key, value] of toolsSnapshot) {
          records.tools.set(key, value);
        }
        throw error;
      }
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      for (const [versionId, raw] of records.versions.entries()) {
        const parsed = ToolVersion.parse(raw);
        if (parsed.toolId === toolId) {
          records.versions.delete(versionId);
        }
      }
    },
  };
}
