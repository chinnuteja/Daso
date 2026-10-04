import type { CapabilityLedgerEntry } from '../../core/capability/ledger';
import type { DrawDocument } from '../../core/draw/schema';
import { isMarkSelectionCurrent } from '../../core/draw/document';
import { PersistenceError } from './database';

/** Validate references in the same storage snapshot as the append, including reset races. */
export function assertCapabilityAppend(entry: CapabilityLedgerEntry, prior: readonly CapabilityLedgerEntry[], drawing: DrawDocument | null): void {
  if (entry.sequence !== prior.length + 1 || prior.some((item) => item.eventId === entry.eventId)) throw new PersistenceError('capability events must have unique, contiguous sequences');
  if (entry.type === 'child_intent' && entry.reviewedContext?.kind === 'draw_pattern') {
    const context = entry.reviewedContext;
    if (context.toolId !== entry.toolId || context.ledgerSequence !== prior.length || drawing === null || !isMarkSelectionCurrent(drawing) || drawing.revision !== context.sourceRevision || drawing.ownerChildId !== entry.ownerChildId || drawing.guidePath?.pathId !== context.guidePathId || drawing.guidePath.revision !== context.guidePathRevision) {
      throw new PersistenceError('This drawing changed or was removed. Download your drawing before reloading and prepare a fresh review.');
    }
  }
  if (entry.type === 'capability_candidate' && !prior.some((item) => item.type === 'child_intent' && item.eventId === entry.sourceIntentEventId)) throw new PersistenceError('The child’s intent is no longer available. Prepare a fresh review.');
  if ((entry.type === 'child_edit' || entry.type === 'child_rejection') && !prior.some((item) => item.type === 'capability_candidate' && item.eventId === entry.candidateEventId)) throw new PersistenceError('The reviewed idea is no longer available. Prepare a fresh review.');
}
