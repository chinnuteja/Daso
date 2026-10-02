import type { CapabilityLifecycleRepository } from '../../../core/ports/repositories';
import { CapabilityLedgerEntry } from '../../../core/capability/ledger';
import { CapabilityDefinition, DrawCapabilityVersion, SavedCapabilityVersion } from '../../../core/capability/types';
import { assertApprovalCommit, reviewedContextDigest, type ApprovalStorageInput } from '../../../core/capability/approval';
import { DrawDocument, MarkSnapshot } from '../../../core/draw/schema';
import { ExperimentTrial } from '../../../core/schema/experimentTrial';
import { PersistenceError } from '../database';
import { shouldFailAfterCapabilityWrite } from '../atomicCommit';
import type { MemoryRecords } from './store';
import { CapabilityGraph } from '../../../core/capability/graph';

export function createMemoryCapabilityLifecycleRepository(records: MemoryRecords): CapabilityLifecycleRepository {
  const entriesFor = (toolId: string) => [...records.capabilityEntries.values()].map((value) => CapabilityLedgerEntry.parse(value)).filter((entry) => entry.toolId === toolId).sort((a, b) => a.sequence - b.sequence);
  const versionsFor = (toolId: string) => [...records.capabilityVersions.values()].map((value) => SavedCapabilityVersion.parse(value)).filter((version) => version.toolId === toolId);
  async function commit(input: ApprovalStorageInput) {
    const digest = await reviewedContextDigest(input);
    const approval = CapabilityLedgerEntry.parse(input.approval);
    if (approval.type !== 'child_approval') throw new PersistenceError('only a child approval can activate a capability');
    const version = SavedCapabilityVersion.parse(input.version);
    const definition = CapabilityDefinition.parse(input.definition);
    const duplicate = [...records.capabilityEntries.values()].map((value) => CapabilityLedgerEntry.parse(value)).find((entry) => entry.type === 'child_approval' && entry.idempotencyKey === approval.idempotencyKey);
    if (duplicate !== undefined) {
      const existing = versionsFor(definition.toolId).find((value) => value.metadata.approvalEventId === duplicate.eventId);
      if (JSON.stringify(duplicate) !== JSON.stringify(approval) || existing === undefined || JSON.stringify(existing) !== JSON.stringify(version)) throw new PersistenceError('approval retry key has no matching committed decision');
      return existing;
    }
    const activeRaw = records.capabilityDefinitions.get(definition.toolId);
    const context = input.reviewedContext;
    const drawing = context?.kind === 'draw_pattern' ? records.drawDocuments.get(context.sourceDocumentId) : undefined;
    assertApprovalCommit(input, { entries: entriesFor(definition.toolId), activeDefinition: activeRaw === undefined ? null : CapabilityDefinition.parse(activeRaw), drawing: drawing === undefined ? null : DrawDocument.parse(drawing), trials: [...records.trials.values()].map((value) => ExperimentTrial.parse(value)).filter((trial) => trial.toolId === definition.toolId), contextDigest: digest });
    if (version.version !== versionsFor(definition.toolId).length + 1) throw new PersistenceError('version sequence changed; review again');
    if (records.capabilityVersions.has(version.versionId) || (input.snapshot !== undefined && records.markSnapshots.has(input.snapshot.snapshotId))) throw new PersistenceError('immutable approval output already exists');
    const maps = [records.markSnapshots, records.capabilityEntries, records.capabilityVersions, records.capabilityDefinitions];
    const before = maps.map((map) => new Map(map));
    try {
      if (input.snapshot !== undefined) records.markSnapshots.set(input.snapshot.snapshotId, MarkSnapshot.parse(input.snapshot));
      records.capabilityEntries.set(approval.eventId, approval);
      if (shouldFailAfterCapabilityWrite()) throw new PersistenceError('injected capability failure after snapshot write or approval write');
      records.capabilityVersions.set(version.versionId, version);
      records.capabilityDefinitions.set(definition.toolId, definition);
      return version;
    } catch (error) {
      maps.forEach((map, index) => { map.clear(); for (const [key, value] of before[index]!) map.set(key, value); });
      throw error;
    }
  }
  return {
    async getGraph(toolId) {
      const tool = records.capabilityDefinitions.get(toolId);
      if (tool === undefined || CapabilityDefinition.parse(tool).currentVersionId === null) return null;
      const definition = CapabilityDefinition.parse(tool);
      const snapshots = [...records.markSnapshots.values()].map((value) => MarkSnapshot.parse(value)).filter((value) => value.toolId === toolId);
      const documentIds = new Set(snapshots.map((value) => value.sourceDocumentId));
      const scoped = (map: Map<string, unknown>) => [...map.values()].filter((raw) => (raw as { toolId: string }).toolId === toolId);
      return CapabilityGraph.parse({ tool: definition, ownerProfile: records.profiles.get(definition.ownerChildId) ?? null, versions: versionsFor(toolId), ledger: entriesFor(toolId), snapshots, documents: [...records.drawDocuments.values()].map((value) => DrawDocument.parse(value)).filter((value) => documentIds.has(value.documentId)), trials: scoped(records.trials), grants: scoped(records.grants), summaries: scoped(records.summaries) });
    },
    async commitApprovedCapability(input) {
      if (input.reviewedContext === undefined) throw new PersistenceError('shared approval requires a reviewed source context');
      return commit(input);
    },
    async commitDrawApproval(input) { return DrawCapabilityVersion.parse(await commit(input)); },
    async getDefinition(toolId) { const raw = records.capabilityDefinitions.get(toolId); return raw === undefined ? null : CapabilityDefinition.parse(raw); },
    async listDefinitionsByOwner(childId) { return [...records.capabilityDefinitions.values()].map((value) => CapabilityDefinition.parse(value)).filter((definition) => definition.ownerChildId === childId).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.toolId.localeCompare(b.toolId)); },
    async listEntriesByTool(toolId) { return entriesFor(toolId); },
    async append(entry) { const parsed = CapabilityLedgerEntry.parse(entry); if (records.capabilityEntries.has(parsed.eventId) || parsed.sequence !== entriesFor(parsed.toolId).length + 1) throw new PersistenceError('capability events must have unique, contiguous sequences'); records.capabilityEntries.set(parsed.eventId, parsed); },
    async getVersion(versionId) { const raw = records.capabilityVersions.get(versionId); return raw === undefined ? null : SavedCapabilityVersion.parse(raw); },
    async getDrawVersion(versionId) { const raw = records.capabilityVersions.get(versionId); if (raw === undefined) return null; const version = SavedCapabilityVersion.parse(raw); return version.kind === 'draw_pattern' ? version : null; },
    async listDrawVersionsByTool(toolId) { return versionsFor(toolId).filter((version): version is DrawCapabilityVersion => version.kind === 'draw_pattern').sort((a, b) => a.version - b.version); },
  };
}
