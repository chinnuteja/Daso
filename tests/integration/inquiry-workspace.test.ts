import { describe, expect, it } from 'vitest';

import { createMemoryRepositories } from '../../src/adapters/persistence';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import {
  approveFairTestRule,
  prepareInquiry,
  proposeFairTestRule,
  recordBridgeTrial,
  type InquiryContext,
} from '../../src/ui/flows/inquiry/session';

function context(): InquiryContext {
  return {
    repositories: createMemoryRepositories(),
    ids: createSequentialIdFactory(),
    clock: { now: () => '2026-09-05T10:00:00Z' },
    toolId: 'bridge-bench-test',
    ownerChildId: 'child_bridge_test',
  };
}

describe('inquiry workspace', () => {
  it('preserves a child hypothesis as intent without treating it as an active rule', async () => {
    const session = context();
    const snapshot = await prepareInquiry(session, 'Only thicker paper can make a bridge strong.');

    expect(snapshot.question).toBe('Only thicker paper can make a bridge strong.');
    expect(snapshot.version.metrics).toEqual(['median_load']);
    expect(snapshot.version.rules).toEqual([]);
    expect(snapshot.after.ranking).toEqual([]);
    expect(snapshot.trials).toEqual([]);
  });

  it('keeps a changed-setup observation visible until the child deliberately saves a scoped fair-test rule', async () => {
    const session = context();
    await prepareInquiry(session, 'More folds will carry more coins.');
    await recordBridgeTrial(session, { designName: 'flat', loadCount: 8, setupChanged: false });
    const changed = await recordBridgeTrial(session, { designName: 'accordion', loadCount: 25, setupChanged: true, note: 'The gap was wider.' });

    expect(changed.snapshot.before.winner).toBe('accordion');
    expect(changed.trial.distanceM).toBeUndefined();
    expect(changed.trial.loadCount).toBe(25);
    const proposed = await proposeFairTestRule(session);
    expect(proposed).toMatchObject({ saved: false, after: { winner: 'accordion' } });

    const saved = await approveFairTestRule(session);
    expect(saved.saved).toBe(true);
    expect(saved.after.winner).toBe('flat');
    expect(saved.after.projections.find((entry) => entry.trialId === changed.trial.trialId)?.validUnderCurrentVersion).toBe(false);
    expect(saved.trials).toHaveLength(2);
  });

  it('refuses to manufacture a fair-test rule when no child recorded a changed setup', async () => {
    const session = context();
    await prepareInquiry(session, 'A wider base might help.');
    await recordBridgeTrial(session, { designName: 'wide', loadCount: 12, setupChanged: false });

    await expect(proposeFairTestRule(session)).rejects.toThrow('Record what changed');
  });
});
