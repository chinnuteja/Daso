import type { DrawAssetRepository } from '../../../core/ports/repositories';
import { DrawDocument, MarkSnapshot } from '../../../core/draw/schema';
import type { ChildId, DrawDocumentId, MarkSnapshotId, ToolId } from '../../../core/schema/primitives';
import { PersistenceError } from '../database';
import type { MemoryRecords } from './store';

export function createMemoryDrawAssetRepository(records: MemoryRecords): DrawAssetRepository {
  return {
    async deleteDocument(documentId) { records.drawDocuments.delete(documentId); },
    async getDocument(documentId: DrawDocumentId): Promise<DrawDocument | null> {
      const raw = records.drawDocuments.get(documentId);
      return raw === undefined ? null : DrawDocument.parse(raw);
    },

    async listDocumentsByOwner(childId: ChildId): Promise<readonly DrawDocument[]> {
      return [...records.drawDocuments.values()]
        .map((raw) => DrawDocument.parse(raw))
        .filter((document) => document.ownerChildId === childId)
        .sort((left, right) =>
          left.updatedAt.localeCompare(right.updatedAt) || left.documentId.localeCompare(right.documentId),
        );
    },

    async saveDocument(document: DrawDocument): Promise<void> {
      const parsed = DrawDocument.parse(document);
      records.drawDocuments.set(parsed.documentId, parsed);
    },

    async getMarkSnapshot(snapshotId: MarkSnapshotId): Promise<MarkSnapshot | null> {
      const raw = records.markSnapshots.get(snapshotId);
      return raw === undefined ? null : MarkSnapshot.parse(raw);
    },

    async listMarkSnapshotsByTool(toolId: ToolId): Promise<readonly MarkSnapshot[]> {
      return [...records.markSnapshots.values()]
        .map((raw) => MarkSnapshot.parse(raw))
        .filter((snapshot) => snapshot.toolId === toolId)
        .sort((left, right) => (left.snapshotId < right.snapshotId ? -1 : 1));
    },

    async saveMarkSnapshot(snapshot: MarkSnapshot): Promise<void> {
      const parsed = MarkSnapshot.parse(snapshot);
      if (records.markSnapshots.has(parsed.snapshotId)) {
        throw new PersistenceError(`mark snapshot ${parsed.snapshotId} already exists and is immutable`);
      }
      records.markSnapshots.set(parsed.snapshotId, parsed);
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      for (const [snapshotId, raw] of records.markSnapshots.entries()) {
        if (MarkSnapshot.parse(raw).toolId === toolId) {
          records.markSnapshots.delete(snapshotId);
        }
      }
    },
  };
}
