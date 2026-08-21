import { foldAuthorshipRecords } from '../../../core/ledger/fold';
import { LedgerEntry } from '../../../core/ledger/types';
import type { AuthorshipLedgerRepository } from '../../../core/ports/repositories';
import type { AuthorshipEvent } from '../../../core/schema/authorshipEvent';
import type { ToolId } from '../../../core/schema/primitives';
import { STORE, type TeachDasoDatabase } from '../database';
import { guardedAppend, guardLedgerOnLoad } from '../integrityGuard';
import { listByToolIndex } from './access';

export function createIndexedDbLedgerRepository(
  database: TeachDasoDatabase,
): AuthorshipLedgerRepository {
  return {
    async append(entry: LedgerEntry): Promise<void> {
      const existing = await listByToolIndex(database, STORE.ledgerEntries, entry.toolId, LedgerEntry);
      const next = guardedAppend(existing, entry);
      const written = next[next.length - 1];
      if (written === undefined) {
        return;
      }
      await database.put(STORE.ledgerEntries, written);
    },

    async listByTool(toolId: ToolId): Promise<readonly LedgerEntry[]> {
      const found = await listByToolIndex(database, STORE.ledgerEntries, toolId, LedgerEntry);
      return guardLedgerOnLoad(found);
    },

    async listRecordsByTool(toolId: ToolId): Promise<readonly AuthorshipEvent[]> {
      return foldAuthorshipRecords(await this.listByTool(toolId));
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      const found = await listByToolIndex(database, STORE.ledgerEntries, toolId, LedgerEntry);
      const tx = database.transaction(STORE.ledgerEntries, 'readwrite');
      for (const entry of found) {
        await tx.store.delete(entry.eventId);
      }
      await tx.done;
    },
  };
}
