import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRepositories, openIndexedDbRepositories, setFailAfterVersionWrite } from '../../src/adapters/persistence';
import { createScriptedEvidenceSource } from '../../src/adapters/evidence/scripted';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { approveExperienceRule, createExperiencePreview, prepareExperience, proposeExperienceRule, readExperience, recordExperienceTrial, type ExperienceContext } from '../../src/ui/flows/experience/session';
import { createOrReuseFork, ensureSecondChildProfile } from '../../src/ui/flows/runner/reuseTool';
import { loadParentEvidence } from '../../src/ui/flows/parentEvidence/loadParentEvidence';
import { JourneyFlow } from '../../src/ui/flows/JourneyFlow';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

function context(): ExperienceContext {
  return { repositories: createMemoryRepositories(), ids: createSequentialIdFactory(), clock: { now: () => '2026-08-27T10:00:00Z' }, toolId: 'sample-lab-test', ownerChildId: 'child_sample_test' };
}

afterEach(() => setFailAfterVersionWrite(false));

describe('result-first experience — real consequence, minimal ceremony', () => {
  it('the full builder does not expose live controls before storage initialization', () => {
    const html = renderToStaticMarkup(createElement(JourneyFlow));
    expect(html).toMatch(/<fieldset[^>]*disabled/u);
    expect(html).toContain('Opening local store');
  });
  it('the initial preview is computed by the real runtime, with no saved correction', async () => {
    const preview = await createExperiencePreview();
    expect(preview.before.winner).toBe('Dart');
    expect(preview.before.ranking[0]?.medianDistanceMm).toBe(7500);
    expect(preview.sampleTrials).toHaveLength(4);
    expect(preview.saved).toBe(false);
    expect(preview.pendingId).toBeNull();
  });

  it('proposal cannot change the ranking; explicit approval changes behavior without rewriting trials', async () => {
    const session = context();
    const prepared = await prepareExperience(session);
    const observations = canonicalJson(prepared.trials);
    const proposed = await proposeExperienceRule(session);
    expect(proposed.saved).toBe(false);
    expect(proposed.approved).toBe(false);
    expect(proposed.after.winner).toBe('Dart');
    const approved = await approveExperienceRule(session);
    expect(approved.saved).toBe(true);
    expect(approved.after.winner).toBe('Falcon');
    expect(approved.before.winner).toBe('Dart');
    expect(canonicalJson(approved.trials)).toBe(observations);
    expect(approved.version.version).toBe(2);
  });

  it('cannot skip review, and repeated proposal/approval does not duplicate records', async () => {
    const session = context();
    await prepareExperience(session);
    await expect(approveExperienceRule(session)).rejects.toThrow('Review the rule');
    const one = await proposeExperienceRule(session);
    const two = await proposeExperienceRule(session);
    expect(two.ledger).toEqual(one.ledger);
    const saved = await approveExperienceRule(session);
    const again = await approveExperienceRule(session);
    expect(again.ledger).toEqual(saved.ledger);
    expect(again.version).toEqual(saved.version);
  });

  it('recovers an approved but uncompiled rule without adding a second approval', async () => {
    const session = context();
    await proposeExperienceRule(session);
    setFailAfterVersionWrite(true);
    await expect(approveExperienceRule(session)).rejects.toThrow();
    const failed = await readExperience(session);
    expect(failed?.approved).toBe(true);
    expect(failed?.saved).toBe(false);
    expect(failed?.after.winner).toBe('Dart');
    setFailAfterVersionWrite(false);
    const repaired = await approveExperienceRule(session);
    expect(repaired.saved).toBe(true);
    expect(repaired.ledger).toEqual(failed?.ledger);
  });

  it('new obstructed flights are excluded by runtime projection, not capture flags', async () => {
    const session = context();
    await proposeExperienceRule(session);
    await approveExperienceRule(session);
    const blocked = await recordExperienceTrial(session, { designName: 'Dart', distanceM: 10, obstruction: true });
    expect(blocked.trial.validAtCapture).toBe(true);
    expect(blocked.counted).toBe(false);
    expect(blocked.runtime.winner).toBe('Falcon');
    const clear = await recordExperienceTrial(session, { designName: 'Dart', distanceM: 10, obstruction: false });
    expect(clear.counted).toBe(true);
    expect(clear.runtime.winner).toBe('Dart');
    expect(clear.snapshot.sampleTrials).toHaveLength(4);
    expect(clear.snapshot.after.winner).toBe('Falcon');
  });

  it('the new entry point still supports real forks and grounded parent evidence', async () => {
    const session = context();
    await proposeExperienceRule(session);
    const saved = await approveExperienceRule(session);
    const parent = await loadParentEvidence({ ...session, rawToolId: session.toolId, evidence: createScriptedEvidenceSource() });
    expect(parent.status).toBe('ready');
    const targetOwner = await ensureSecondChildProfile(session.repositories);
    const fork = await createOrReuseFork({ ...session, sourceToolId: session.toolId, targetOwner });
    expect(fork.snapshot.definition.toolId).not.toBe(session.toolId);
    expect(fork.snapshot.version.rules.map((rule) => rule.ruleId)).toEqual(saved.version.rules.map((rule) => rule.ruleId));
    expect((await readExperience(session))?.version).toEqual(saved.version);
  });

  it('IndexedDB reload keeps the approved rule and original observations', async () => {
    const name = 'teach-daso-result-first-test';
    await deleteDB(name);
    const opened = await openIndexedDbRepositories(name);
    const session = { ...context(), repositories: opened.repositories };
    await proposeExperienceRule(session);
    const saved = await approveExperienceRule(session);
    opened.database.close();
    const reopened = await openIndexedDbRepositories(name);
    const restored = await readExperience({ ...session, repositories: reopened.repositories });
    expect(restored).toEqual(saved);
    reopened.database.close();
    await deleteDB(name);
  });
});
