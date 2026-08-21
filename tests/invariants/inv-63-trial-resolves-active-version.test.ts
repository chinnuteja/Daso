import { describe, expect, it } from 'vitest';

import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';
import { createMemoryRepositories } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { executeIntents, IntentExecutionError } from '../../src/ui/flows/executeIntents';
import { FLIGHT_LAB_TOOL_ID, FLIGHT_LAB_TRIAL_DRAFTS } from '../fixtures/script/flightLab';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

/**
 * INV-63 — trial capture stamps the repository-resolved active version.
 */

const DRAFT = FLIGHT_LAB_TRIAL_DRAFTS[0];

describe('INV-63 — trial capture resolves the active version', () => {
  it('INV-63: UI call sites cannot supply a capture version id', () => {
    const uiFiles = listSourceFiles(`${SRC_ROOT}/ui`);
    const supplied = uiFiles.filter(
      (file) =>
        file.path !== 'src/ui/flows/executeIntents.ts' && file.text.includes('toolVersionIdAtCapture'),
    );
    expect(supplied.map((file) => file.path)).toEqual([]);
    expect(uiFiles.some((file) => file.path === 'src/ui/flows/executeIntents.ts')).toBe(true);
  });

  it('INV-63: a captured trial is stamped with the stored active version', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: true });
    const trials = await result.repositories.trials.listByTool(FLIGHT_LAB_TOOL_ID);
    expect(trials.every((trial) => trial.toolVersionIdAtCapture === 'tool_version_001')).toBe(true);
  });

  it('INV-63: missing tool, dangling version, and cross-tool version are rejected before save', async () => {
    if (DRAFT === undefined) {
      throw new Error('fixture draft missing');
    }
    const missing = createMemoryRepositories();
    await expect(
      executeIntents({
        intents: ['record_trial'],
        repositories: missing,
        ids: createSequentialIdFactory(),
        clock: createFixedClock('2026-08-18T10:22:00Z'),
        toolId: FLIGHT_LAB_TOOL_ID,
        pendingCandidateId: null,
        trial: DRAFT,
      }),
    ).rejects.toBeInstanceOf(IntentExecutionError);
    expect(await missing.trials.listByTool(FLIGHT_LAB_TOOL_ID)).toEqual([]);

    const dangling = createMemoryRepositories();
    await dangling.tools.save({
      toolId: FLIGHT_LAB_TOOL_ID,
      ownerChildId: 'child_local_01',
      displayName: "Maya's Flight Lab",
      kind: 'experiment_comparator',
      currentVersionId: 'tool_version_001',
      createdAt: '2026-08-18T10:12:00Z',
    });
    await expect(
      executeIntents({
        intents: ['record_trial'],
        repositories: dangling,
        ids: createSequentialIdFactory(),
        clock: createFixedClock('2026-08-18T10:22:00Z'),
        toolId: FLIGHT_LAB_TOOL_ID,
        pendingCandidateId: null,
        trial: DRAFT,
      }),
    ).rejects.toBeInstanceOf(IntentExecutionError);
    expect(await dangling.trials.listByTool(FLIGHT_LAB_TOOL_ID)).toEqual([]);

    const crossed = createMemoryRepositories();
    await crossed.tools.save({
      toolId: FLIGHT_LAB_TOOL_ID,
      ownerChildId: 'child_local_01',
      displayName: "Maya's Flight Lab",
      kind: 'experiment_comparator',
      currentVersionId: 'tool_version_101',
      createdAt: '2026-08-18T10:12:00Z',
    });
    await crossed.versions.save({
      versionId: 'tool_version_101',
      toolId: 'other-paper-lab',
      version: 1,
      inputs: ['design_name'],
      metrics: ['median_distance'],
      rules: [],
      compiledAt: '2026-08-18T12:01:00Z',
    });
    await expect(
      executeIntents({
        intents: ['record_trial'],
        repositories: crossed,
        ids: createSequentialIdFactory(),
        clock: createFixedClock('2026-08-18T10:22:00Z'),
        toolId: FLIGHT_LAB_TOOL_ID,
        pendingCandidateId: null,
        trial: DRAFT,
      }),
    ).rejects.toBeInstanceOf(IntentExecutionError);
    expect(await crossed.trials.listByTool(FLIGHT_LAB_TOOL_ID)).toEqual([]);
  });
});
