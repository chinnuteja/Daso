import type { CapabilityLifecycleRepository } from '../../../core/ports/repositories';
import { CapabilityLedgerEntry } from '../../../core/capability/ledger';
import { CapabilityDefinition, DrawCapabilityVersion, SavedCapabilityVersion } from '../../../core/capability/types';
import { assertApprovalCommit, reviewedContextDigest, type ApprovalStorageInput } from '../../../core/capability/approval';
import { DrawDocument, MarkSnapshot } from '../../../core/draw/schema';
import { ExperimentTrial } from '../../../core/schema/experimentTrial';
import { PersistenceError, STORE, type TeachDasoDatabase } from '../database';
import { shouldFailAfterCapabilityWrite } from '../atomicCommit';
import { CapabilityGraph } from '../../../core/capability/graph';

export function createIndexedDbCapabilityLifecycleRepository(database: TeachDasoDatabase): CapabilityLifecycleRepository {
  async function commit(input: ApprovalStorageInput) {
    // Finish crypto before IDB; source rereads and writes then share one transaction.
    const digest = await reviewedContextDigest(input);
    const approval = CapabilityLedgerEntry.parse(input.approval);
    if (approval.type !== 'child_approval') throw new PersistenceError('only a child approval can activate a capability');
    const definition = CapabilityDefinition.parse(input.definition);
    const version = SavedCapabilityVersion.parse(input.version);
    const tx = database.transaction([STORE.capabilityDefinitions, STORE.capabilityVersions, STORE.capabilityEntries, STORE.markSnapshots, STORE.drawDocuments, STORE.trials], 'readwrite');
    try {
      const entriesStore = tx.objectStore(STORE.capabilityEntries);
      const versionsStore = tx.objectStore(STORE.capabilityVersions);
      const duplicate = await entriesStore.index('idempotencyKey').get(approval.idempotencyKey);
      const existingVersions = (await versionsStore.index('toolId').getAll(definition.toolId)).map((value) => SavedCapabilityVersion.parse(value));
      if (duplicate !== undefined) {
        const parsedDuplicate = CapabilityLedgerEntry.parse(duplicate);
        const existing = existingVersions.find((value) => value.metadata.approvalEventId === parsedDuplicate.eventId);
        if (JSON.stringify(parsedDuplicate) !== JSON.stringify(approval) || existing === undefined || JSON.stringify(existing) !== JSON.stringify(version)) throw new PersistenceError('approval retry key has no matching committed decision');
        await tx.done; return existing;
      }
      const rawActive = await tx.objectStore(STORE.capabilityDefinitions).get(definition.toolId);
      const context = input.reviewedContext;
      const drawing = context?.kind === 'draw_pattern' ? await tx.objectStore(STORE.drawDocuments).get(context.sourceDocumentId) : undefined;
      assertApprovalCommit(input, { entries: (await entriesStore.index('toolId').getAll(definition.toolId)).map((value) => CapabilityLedgerEntry.parse(value)), activeDefinition: rawActive === undefined ? null : CapabilityDefinition.parse(rawActive), drawing: drawing === undefined ? null : DrawDocument.parse(drawing), trials: (await tx.objectStore(STORE.trials).index('toolId').getAll(definition.toolId)).map((value) => ExperimentTrial.parse(value)), contextDigest: digest });
      if (version.version !== existingVersions.length + 1) throw new PersistenceError('version sequence changed; review again');
      if ((await versionsStore.get(version.versionId)) !== undefined || (input.snapshot !== undefined && (await tx.objectStore(STORE.markSnapshots).get(input.snapshot.snapshotId)) !== undefined)) throw new PersistenceError('immutable approval output already exists');
      if (input.snapshot !== undefined) await tx.objectStore(STORE.markSnapshots).add(MarkSnapshot.parse(input.snapshot));
      await entriesStore.add(approval);
      if (shouldFailAfterCapabilityWrite()) throw new PersistenceError('injected capability failure after snapshot write or approval write');
      await versionsStore.add(version);
      await tx.objectStore(STORE.capabilityDefinitions).put(definition);
      await tx.done; return version;
    } catch (error) {
      try { tx.abort(); } catch { /* Transaction has already aborted. */ }
      await tx.done.catch(() => undefined); throw error;
    }
  }
  return {
    async getGraph(toolId) {
      const tx = database.transaction([STORE.capabilityDefinitions, STORE.capabilityVersions, STORE.capabilityEntries, STORE.markSnapshots, STORE.drawDocuments, STORE.trials, STORE.grants, STORE.summaries, STORE.childProfiles], 'readonly');
      const raw = await tx.objectStore(STORE.capabilityDefinitions).get(toolId);
      if (raw === undefined || CapabilityDefinition.parse(raw).currentVersionId === null) { await tx.done; return null; }
      const tool = CapabilityDefinition.parse(raw);
      const [versions, ledger, snapshots, trials, grants, summaries, ownerProfile] = await Promise.all([
        tx.objectStore(STORE.capabilityVersions).index('toolId').getAll(toolId), tx.objectStore(STORE.capabilityEntries).index('toolId').getAll(toolId), tx.objectStore(STORE.markSnapshots).index('toolId').getAll(toolId), tx.objectStore(STORE.trials).index('toolId').getAll(toolId), tx.objectStore(STORE.grants).index('toolId').getAll(toolId), tx.objectStore(STORE.summaries).index('toolId').getAll(toolId), tx.objectStore(STORE.childProfiles).get(tool.ownerChildId),
      ]);
      const documentIds = [...new Set(snapshots.map((value) => MarkSnapshot.parse(value).sourceDocumentId))];
      const documents = (await Promise.all(documentIds.map((id) => tx.objectStore(STORE.drawDocuments).get(id)))).filter((value) => value !== undefined);
      await tx.done;
      return CapabilityGraph.parse({ tool, ownerProfile: ownerProfile ?? null, versions, ledger, snapshots, documents, trials, grants, summaries });
    },
    async commitApprovedCapability(input) {
      if (input.reviewedContext === undefined) throw new PersistenceError('shared approval requires a reviewed source context');
      return commit(input);
    },
    async commitDrawApproval(input) { return DrawCapabilityVersion.parse(await commit(input)); },
    async getDefinition(toolId) { const raw = await database.get(STORE.capabilityDefinitions, toolId); return raw === undefined ? null : CapabilityDefinition.parse(raw); },
    async listDefinitionsByOwner(childId) { return (await database.getAllFromIndex(STORE.capabilityDefinitions, 'ownerChildId', childId)).map((value) => CapabilityDefinition.parse(value)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.toolId.localeCompare(b.toolId)); },
    async listEntriesByTool(toolId) { return (await database.getAllFromIndex(STORE.capabilityEntries, 'toolId', toolId)).map((value) => CapabilityLedgerEntry.parse(value)).sort((a, b) => a.sequence - b.sequence); },
    async append(entry) {
      const parsed = CapabilityLedgerEntry.parse(entry); const tx = database.transaction(STORE.capabilityEntries, 'readwrite');
      try { const prior = await tx.store.index('toolId').getAll(parsed.toolId); if (parsed.sequence !== prior.length + 1) throw new PersistenceError('capability events must have unique, contiguous sequences'); await tx.store.add(parsed); await tx.done; }
      catch (error) { try { tx.abort(); } catch { /* Already aborted. */ } await tx.done.catch(() => undefined); throw error; }
    },
    async getVersion(versionId) { const raw = await database.get(STORE.capabilityVersions, versionId); return raw === undefined ? null : SavedCapabilityVersion.parse(raw); },
    async getDrawVersion(versionId) { const raw = await database.get(STORE.capabilityVersions, versionId); if (raw === undefined) return null; const version = SavedCapabilityVersion.parse(raw); return version.kind === 'draw_pattern' ? version : null; },
    async listDrawVersionsByTool(toolId) { return (await database.getAllFromIndex(STORE.capabilityVersions, 'toolId', toolId)).map((value) => SavedCapabilityVersion.parse(value)).filter((version): version is DrawCapabilityVersion => version.kind === 'draw_pattern').sort((a, b) => a.version - b.version); },
  };
}
