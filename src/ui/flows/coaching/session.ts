import type { CandidateEntry } from '../../../core/ledger/types';
import { transition } from '../../../core/orchestrator';
import type { Clock } from '../../../core/ports/clock';
import type { IdFactory } from '../../../core/ports/ids';
import type { Repositories } from '../../../core/ports/repositories';
import { ChildProfile } from '../../../core/schema/childProfile';
import type { ToolVersion } from '../../../core/schema/toolVersion';
import type { CoachingPreferenceDraft, CoachingScope } from '../../../core/schema/vocabulary';
import { executeIntents } from '../executeIntents';

export interface WritingCoachContext {
  readonly repositories: Repositories;
  readonly ids: IdFactory;
  readonly clock: Clock;
  readonly toolId: string;
  readonly ownerChildId: string;
}

export interface WritingCoachSnapshot {
  readonly words: string;
  readonly preference: CoachingPreferenceDraft;
  readonly pendingId: string;
  readonly approved: boolean;
  readonly version: ToolVersion | null;
  readonly saved: boolean;
}

export async function readWritingCoach(
  context: Pick<WritingCoachContext, 'repositories' | 'toolId' | 'ownerChildId'>,
): Promise<WritingCoachSnapshot | null> {
  const entries = await context.repositories.ledger.listByTool(context.toolId);
  const candidate = [...entries].reverse().find((entry): entry is CandidateEntry =>
    entry.entryKind === 'candidate' && entry.candidateMutation.operation === 'set_coaching_preference',
  );
  if (candidate === undefined || candidate.candidateMutation.operation !== 'set_coaching_preference') return null;
  const approved = entries.some((entry) =>
    entry.entryKind === 'approval' && entry.actor === 'child' && entry.approves === candidate.eventId,
  );
  const definition = await context.repositories.tools.get(context.toolId);
  if (definition !== null && definition.ownerChildId !== context.ownerChildId) return null;
  const version = definition === null
    ? null
    : await context.repositories.versions.get(definition.currentVersionId);
  return {
    words: candidate.originalInput,
    preference: candidate.candidateMutation.preference,
    pendingId: candidate.eventId,
    approved,
    version,
    saved: approved && version?.coachingPreference?.sourceEventId === candidate.eventId,
  };
}

export async function proposeWritingPreference(
  context: WritingCoachContext,
  words: string,
  preference: CoachingPreferenceDraft,
): Promise<WritingCoachSnapshot> {
  if (await context.repositories.profiles.get(context.ownerChildId) === null) {
    await context.repositories.profiles.save(ChildProfile.parse({
      childId: context.ownerChildId,
      displayName: 'Story maker',
      readingBand: 'developing',
      inputPreferences: ['touch', 'text'],
      createdAt: context.clock.now(),
    }));
  }
  const current = await readWritingCoach(context);
  if (current?.saved === true) return current;
  const matchesCurrent = current !== null
    && current.words === words
    && JSON.stringify(current.preference) === JSON.stringify(preference);
  if (!matchesCurrent) {
    const result = await executeIntents({
      ...context,
      intents: ['append_candidate'],
      pendingCandidateId: null,
      candidate: {
        actor: 'child',
        type: 'definition_decision',
        originalInput: words,
        mutation: { operation: 'set_coaching_preference', preference },
      },
      toolDraft: {
        ownerChildId: context.ownerChildId,
        displayName: 'How Kale helps me write',
        kind: 'coaching_preference',
      },
    });
    if (result.rejection !== null) throw new Error('Kale could not prepare that preference safely.');
  }
  const snapshot = await readWritingCoach(context);
  if (snapshot === null) throw new Error('The preference proposal could not be reopened.');
  return snapshot;
}

export async function approveWritingPreference(
  context: WritingCoachContext,
): Promise<WritingCoachSnapshot> {
  const snapshot = await readWritingCoach(context);
  if (snapshot === null) throw new Error('There is no preference waiting for review.');
  if (snapshot.saved) return snapshot;
  const next = transition('REVIEW_MUTATION', { kind: 'candidate_approved' });
  if (next.kind !== 'advanced') throw new Error('The preference cannot be approved in this state.');
  const result = await executeIntents({
    ...context,
    intents: snapshot.approved
      ? next.intents.filter((intent) => intent !== 'append_approval')
      : next.intents,
    pendingCandidateId: snapshot.pendingId,
    toolDraft: {
      ownerChildId: context.ownerChildId,
      displayName: 'How Kale helps me write',
      kind: 'coaching_preference',
    },
  });
  if (result.rejection !== null) throw new Error('The preference was not activated.');
  const saved = await readWritingCoach(context);
  if (saved === null || !saved.saved) throw new Error('The preference approval was recorded but is not active yet. Try saving again.');
  return saved;
}

export function scopeLabel(scope: CoachingScope): string {
  return scope === 'this_story' ? 'Only this story' : 'Every writing project';
}
