import { foldAuthorshipRecords } from '../../../core/ledger/fold';
import { LedgerEntry } from '../../../core/ledger/types';
import type { AuthorshipLedgerRepository } from '../../../core/ports/repositories';
import type { AuthorshipEvent } from '../../../core/schema/authorshipEvent';
import type { ToolId } from '../../../core/schema/primitives';
import { guardedAppend, guardLedgerOnLoad } from '../integrityGuard';
import type { MemoryRecords } from './store';

export function createMemoryLedgerRepository(records: MemoryRecords): AuthorshipLedgerRepository {
  return {
    async append(entry: LedgerEntry): Promise<void> {
      const existing = entriesFor(records, entry.toolId);
      const next = guardedAppend(existing, entry);
      const written = next[next.length - 1];
      if (written === undefined) {
        return;
      }
      records.ledger.set(written.eventId, written);
    },

    async listByTool(toolId: ToolId): Promise<readonly LedgerEntry[]> {
      return guardLedgerOnLoad(entriesFor(records, toolId));
    },

    async listRecordsByTool(toolId: ToolId): Promise<readonly AuthorshipEvent[]> {
      return foldAuthorshipRecords(await this.listByTool(toolId));
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      for (const [eventId, raw] of records.ledger.entries()) {
        const parsed = LedgerEntry.parse(raw);
        if (parsed.toolId === toolId) {
          records.ledger.delete(eventId);
        }
      }
    },
  };
}

function entriesFor(records: MemoryRecords, toolId: ToolId): LedgerEntry[] {
  const found: LedgerEntry[] = [];
  for (const raw of records.ledger.values()) {
    const parsed = LedgerEntry.parse(raw);
    if (parsed.toolId === toolId) {
      found.push(parsed);
    }
  }
  return found;
}
