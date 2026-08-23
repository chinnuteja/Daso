import { describe, expect, it } from 'vitest';

import { projectTrial } from '../../../src/core/runtime';
import type { ExperimentTrial } from '../../../src/core/schema/experimentTrial';
import type { ToolRule } from '../../../src/core/schema/vocabulary';

const RULE: ToolRule = {
  ruleId: 'exclude_obstructed_flight',
  when: { field: 'obstruction', equals: true },
  effect: { set: 'trial.valid', value: false },
  sourceEventId: 'event_014',
};

const OBSTRUCTED: ExperimentTrial = {
  trialId: 'trial_004',
  toolId: 'mayas-flight-lab',
  toolVersionIdAtCapture: 'tool_version_001',
  designName: 'Dart',
  distanceM: 8.9,
  obstruction: true,
  validAtCapture: true,
  validUnderCurrentVersion: true,
  createdAt: '2026-08-18T10:26:00Z',
};

describe('runtime rule application', () => {
  it('starts from validAtCapture and applies a matching equality rule without mutating the trial', () => {
    const before = { ...OBSTRUCTED };
    const projected = projectTrial(OBSTRUCTED, [RULE]);
    expect(projected.validUnderCurrentVersion).toBe(false);
    expect(OBSTRUCTED).toEqual(before);
  });

  it('leaves a non-matching trial valid', () => {
    const clear: ExperimentTrial = { ...OBSTRUCTED, trialId: 'trial_003', obstruction: false };
    expect(projectTrial(clear, [RULE]).validUnderCurrentVersion).toBe(true);
  });
});
