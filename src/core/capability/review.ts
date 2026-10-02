import type { CapabilityLifecycleRepository } from '../ports/repositories';
import type { DrawGuidePath } from '../draw/schema';
import { digestCapabilityContext } from './context';
import type { CapabilityTeachingContext, CapabilityProposal } from './types';
import type { CapabilityLedgerEntry } from './ledger';

/** Both vertical slices enter the exact same ordered child-intent / candidate stream. */
export async function beginCapabilityReview(repository: CapabilityLifecycleRepository, input: { readonly context: CapabilityTeachingContext; readonly ownerChildId: string; readonly sourcePath?: DrawGuidePath; readonly childWords: string; readonly proposal: CapabilityProposal; readonly origin: 'manual' | 'model'; readonly intentEventId: string; readonly candidateEventId: string; readonly occurredAt: string }): Promise<readonly CapabilityLedgerEntry[]> {
  const current = await repository.listEntriesByTool(input.context.toolId);
  const definition = await repository.getDefinition(input.context.toolId);
  if (definition !== null && definition.ownerChildId !== input.ownerChildId) throw new Error('This tool belongs to another child.');
  if (input.sourcePath !== undefined && (input.context.kind !== 'draw_pattern' || input.sourcePath.pathId !== input.context.guidePathId || input.sourcePath.revision !== input.context.guidePathRevision)) throw new Error('This path does not belong to the reviewed drawing context.');
  if (current.length !== input.context.ledgerSequence || (definition?.currentVersionId ?? null) !== input.context.activeVersionId || input.proposal.kind !== input.context.kind) throw new Error('This review changed. Prepare a fresh preview.');
  const intent: CapabilityLedgerEntry = { type: 'child_intent', actor: 'child', toolId: input.context.toolId, eventId: input.intentEventId, sequence: current.length + 1, occurredAt: input.occurredAt, childWords: input.childWords, contextDigest: await digestCapabilityContext(input.context), ownerChildId: input.ownerChildId, reviewedContext: input.context, ...(input.sourcePath === undefined ? {} : { sourcePath: input.sourcePath }) };
  const candidate: CapabilityLedgerEntry = { type: 'capability_candidate', actor: input.origin === 'model' ? 'ai' : 'child', origin: input.origin, toolId: input.context.toolId, eventId: input.candidateEventId, sequence: current.length + 2, occurredAt: input.occurredAt, sourceIntentEventId: intent.eventId, proposal: input.proposal };
  await repository.append(intent);
  await repository.append(candidate);
  return [...current, intent, candidate];
}
