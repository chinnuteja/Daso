import type { DrawAssetRepository } from '../../../core/ports/repositories';
import { DrawDocument, MarkSnapshot } from '../../../core/draw/schema';
import type { ChildId, DrawDocumentId, MarkSnapshotId, ToolId } from '../../../core/schema/primitives';
import { PersistenceError, STORE, type TeachDasoDatabase } from '../database';
import { getParsed } from './access';
import { assertDrawWrite, drawOwnerGenerationKey, parseDrawGenerationRecord } from '../drawWriteGuard';

export function createIndexedDbDrawAssetRepository(database: TeachDasoDatabase): DrawAssetRepository {
  return {
    async getOwnerGeneration(childId) { return parseDrawGenerationRecord((await database.get(STORE.meta, drawOwnerGenerationKey(childId)))); },
    async deleteDocument(documentId) { await database.delete(STORE.drawDocuments, documentId); },
    async getDocument(documentId: DrawDocumentId): Promise<DrawDocument | null> {
      return getParsed(database, STORE.drawDocuments, documentId, DrawDocument);
    },

    async listDocumentsByOwner(childId: ChildId): Promise<readonly DrawDocument[]> {
      const raw = await database.getAllFromIndex(STORE.drawDocuments, 'ownerChildId', childId);
      return raw
        .map((item) => DrawDocument.parse(item))
        .sort((left, right) =>
          left.updatedAt.localeCompare(right.updatedAt) || left.documentId.localeCompare(right.documentId),
        );
    },

    async saveDocument(document: DrawDocument, expected): Promise<void> {
      const parsed = DrawDocument.parse(document);
      const tx = database.transaction([STORE.drawDocuments, STORE.meta], 'readwrite');
      try {
        const raw = await tx.objectStore(STORE.drawDocuments).get(parsed.documentId);
        const generation = parseDrawGenerationRecord((await tx.objectStore(STORE.meta).get(drawOwnerGenerationKey(parsed.ownerChildId))));
        assertDrawWrite(parsed, raw === undefined ? null : DrawDocument.parse(raw), generation, expected);
        await tx.objectStore(STORE.drawDocuments).put(parsed); await tx.done;
      } catch (error) { try { tx.abort(); } catch { /* Already finished. */ } await tx.done.catch(() => undefined); throw error; }
    },

    async getMarkSnapshot(snapshotId: MarkSnapshotId): Promise<MarkSnapshot | null> {
      return getParsed(database, STORE.markSnapshots, snapshotId, MarkSnapshot);
    },

    async listMarkSnapshotsByTool(toolId: ToolId): Promise<readonly MarkSnapshot[]> {
      const raw = await database.getAllFromIndex(STORE.markSnapshots, 'toolId', toolId);
      return raw
        .map((item) => MarkSnapshot.parse(item))
        .sort((left, right) => (left.snapshotId < right.snapshotId ? -1 : 1));
    },

    async saveMarkSnapshot(snapshot: MarkSnapshot): Promise<void> {
      const parsed = MarkSnapshot.parse(snapshot);
      const tx = database.transaction(STORE.markSnapshots, 'readwrite');
      if ((await tx.store.get(parsed.snapshotId)) !== undefined) {
        tx.abort();
        await tx.done.catch(() => undefined);
        throw new PersistenceError(`mark snapshot ${parsed.snapshotId} already exists and is immutable`);
      }
      await tx.store.put(parsed);
      await tx.done;
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      const raw = await database.getAllFromIndex(STORE.markSnapshots, 'toolId', toolId);
      const tx = database.transaction(STORE.markSnapshots, 'readwrite');
      for (const snapshot of raw.map((item) => MarkSnapshot.parse(item))) {
        await tx.store.delete(snapshot.snapshotId);
      }
      await tx.done;
    },
  };
}
