import type { DrawAssetRepository } from '../../../core/ports/repositories';
import { DrawDocument, MarkSnapshot } from '../../../core/draw/schema';
import type { ChildId, DrawDocumentId, MarkSnapshotId, ToolId } from '../../../core/schema/primitives';
import { PersistenceError, STORE, type TeachDasoDatabase } from '../database';
import { getParsed } from './access';

export function createIndexedDbDrawAssetRepository(database: TeachDasoDatabase): DrawAssetRepository {
  return {
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

    async saveDocument(document: DrawDocument): Promise<void> {
      await database.put(STORE.drawDocuments, DrawDocument.parse(document));
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
