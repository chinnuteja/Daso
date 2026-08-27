import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openIndexedDbRepositories } from '../../src/adapters/persistence';
import { withExperience } from '../../src/ui/flows/experience/browserSession';
import { approveExperienceRule, proposeExperienceRule, readExperience } from '../../src/ui/flows/experience/session';
import { createOrReuseFork, ensureSecondChildProfile } from '../../src/ui/flows/runner/reuseTool';

const TEST_DATABASE = 'teach-daso-ux-storage-test-only';
beforeEach(async () => { await deleteDB(TEST_DATABASE); vi.stubGlobal('navigator', {}); });
afterEach(async () => { await deleteDB(TEST_DATABASE); vi.unstubAllGlobals(); });

describe('example storage ownership and recovery', () => {
  it('opening the landing page does not create sample profiles or a saved tool', async () => {
    const result = await withExperience(false, async (context) => context, TEST_DATABASE);
    expect(result).toBeNull();
    const { database } = await openIndexedDbRepositories(TEST_DATABASE);
    expect(await database.count('tools')).toBe(0);
    expect(await database.count('childProfiles')).toBe(0);
    database.close();
  });

  it('persists the selected example and reloads the approved version', async () => {
    const proposed = await withExperience(true, async (context) => {
      if (context === null) throw new Error('missing context');
      return proposeExperienceRule(context);
    }, TEST_DATABASE);
    const saved = await withExperience(true, async (context) => {
      if (context === null) throw new Error('missing context');
      return approveExperienceRule(context);
    }, TEST_DATABASE);
    const restored = await withExperience(false, async (context) => context === null ? null : readExperience(context), TEST_DATABASE);
    expect(saved.toolId).toBe(proposed.toolId);
    expect(restored).toEqual(saved);
    expect(saved.saved).toBe(true);
  });

  it('a new example cannot resurrect a deleted source profile or relabel its surviving fork', async () => {
    const old = await withExperience(true, async (context) => {
      if (context === null) throw new Error('missing context');
      await proposeExperienceRule(context);
      await approveExperienceRule(context);
      const targetOwner = await ensureSecondChildProfile(context.repositories);
      const fork = await createOrReuseFork({ ...context, sourceToolId: context.toolId, targetOwner });
      await context.repositories.profiles.deleteProfileGraph(context.ownerChildId);
      return { owner: context.ownerChildId, fork: fork.snapshot.definition.toolId };
    }, TEST_DATABASE);
    const next = await withExperience(true, async (context) => {
      if (context === null) throw new Error('missing context');
      const result = await proposeExperienceRule(context);
      expect(await context.repositories.profiles.get(old.owner)).toBeNull();
      expect((await context.repositories.tools.get(old.fork))?.displayName).toBe('A copied tool');
      return result;
    }, TEST_DATABASE);
    expect(next.ownerChildId).not.toBe(old.owner);
  });
});
