import { describe, expect, it } from 'vitest';

import { createMemoryRepositories } from '../../src/adapters/persistence/memory';
import { interpretWritingPreference, respondToWritingDraft } from '../../src/core/coaching';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { approveWritingPreference, proposeWritingPreference, readWritingCoach } from '../../src/ui/flows/coaching';

function context() {
  return {
    repositories: createMemoryRepositories(),
    ids: createSequentialIdFactory(),
    clock: { now: () => '2026-09-07T09:00:00Z' },
    toolId: 'writing-coach-test',
    ownerChildId: 'child_writer_test',
  };
}

describe('child-owned writing preference', () => {
  it('asks for clarification instead of pretending to understand an unrelated sentence', () => {
    const result = interpretWritingPreference('Make it better', 'this_story');
    expect(result.understood).toBe(false);
  });

  it('keeps a proposal inactive until the child approves it, then changes executable behavior', async () => {
    const session = context();
    const interpreted = interpretWritingPreference(
      'Ask about my story first and fix spelling after I finish the draft.',
      'all_writing',
    );
    if (!interpreted.understood) throw new Error('test preference should be understood');

    const before = respondToWritingDraft(null, 'The moon dragon was scarred to leave home.');
    expect(before.kind).toBe('spelling_note');

    const proposed = await proposeWritingPreference(
      session,
      'Ask about my story first and fix spelling after I finish the draft.',
      interpreted.preference,
    );
    expect(proposed.saved).toBe(false);
    expect(proposed.version).toBeNull();
    expect(await session.repositories.tools.get(session.toolId)).toBeNull();

    const saved = await approveWritingPreference(session);
    expect(saved.saved).toBe(true);
    expect(saved.preference.scope).toBe('all_writing');
    expect(saved.version?.coachingPreference?.sourceEventId).toBe(saved.pendingId);
    expect((await session.repositories.tools.get(session.toolId))?.kind).toBe('coaching_preference');

    const after = respondToWritingDraft(saved.version, 'The moon dragon was scarred to leave home.');
    expect(after).toEqual({
      kind: 'story_question',
      text: 'What is the dragon afraid might happen after leaving home?',
      spellingDeferred: true,
    });
    expect((await readWritingCoach(session))?.saved).toBe(true);
  });

  it('is idempotent after activation', async () => {
    const session = context();
    const interpreted = interpretWritingPreference(
      'Ask about the plot first; correct spelling later when the draft is finished.',
      'this_story',
    );
    if (!interpreted.understood) throw new Error('test preference should be understood');
    await proposeWritingPreference(session, 'Ask about the plot first; correct spelling later when the draft is finished.', interpreted.preference);
    const first = await approveWritingPreference(session);
    const second = await approveWritingPreference(session);
    expect(second.version?.versionId).toBe(first.version?.versionId);
    expect(await session.repositories.ledger.listByTool(session.toolId)).toHaveLength(2);
  });

  it('records corrected words instead of reopening a stale proposal', async () => {
    const session = context();
    const firstWords = 'Ask about the plot first; correct spelling later when the draft is finished.';
    const first = interpretWritingPreference(firstWords, 'all_writing');
    if (!first.understood) throw new Error('test preference should be understood');
    await proposeWritingPreference(session, firstWords, first.preference);

    const correctedWords = 'Ask about my story first and fix spelling after I finish the draft.';
    const corrected = interpretWritingPreference(correctedWords, 'this_story');
    if (!corrected.understood) throw new Error('test preference should be understood');
    const next = await proposeWritingPreference(session, correctedWords, corrected.preference);

    expect(next.words).toBe(correctedWords);
    expect(next.preference.scope).toBe('this_story');
    expect(next.approved).toBe(false);
    expect(next.version).toBeNull();
    expect((await session.repositories.ledger.listByTool(session.toolId)).filter((entry) => entry.entryKind === 'candidate')).toHaveLength(2);
  });
});
