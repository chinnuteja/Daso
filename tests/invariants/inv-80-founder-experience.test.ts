import { describe, expect, it } from 'vitest';

import { ORCHESTRATOR_STATES } from '../../src/core/orchestrator/states';
import {
  PROGRESS_STEP_LABELS,
  progressRailView,
  whyThisMatters,
} from '../../src/ui/copy/progressRail';

/**
 * INV-80 — every persisted orchestrator state maps to one truthful progress-rail view.
 */

const EXPECTED: Record<
  (typeof ORCHESTRATOR_STATES)[number],
  { readonly current: string; readonly completedBefore: number }
> = {
  IMAGINE: { current: 'Question', completedBefore: 0 },
  DEFINE_METRICS: { current: 'Decide', completedBefore: 1 },
  DEFINE_INPUTS: { current: 'Decide', completedBefore: 1 },
  PREDICT: { current: 'Predict', completedBefore: 2 },
  COLLECT_TRIALS: { current: 'Test', completedBefore: 3 },
  INSPECT_ANOMALY: { current: 'Notice', completedBefore: 4 },
  PROPOSE_CORRECTION: { current: 'Teach', completedBefore: 5 },
  REVIEW_MUTATION: { current: 'Teach', completedBefore: 5 },
  COMPILE: { current: 'See the change', completedBefore: 6 },
  RUN: { current: 'See the change', completedBefore: 6 },
};

describe('INV-80 — truthful journey progress rail', () => {
  it('INV-80: every persisted state maps to one rail view without inventing a prediction', () => {
    expect(ORCHESTRATOR_STATES).toHaveLength(10);
    expect(PROGRESS_STEP_LABELS).toEqual([
      'Question',
      'Decide',
      'Predict',
      'Test',
      'Notice',
      'Teach',
      'See the change',
    ]);

    for (const state of ORCHESTRATOR_STATES) {
      const view = progressRailView(state);
      const expected = EXPECTED[state];
      expect(view.currentLabel).toBe(expected.current);
      expect(view.nextAction.length).toBeGreaterThan(0);
      expect(whyThisMatters(state).length).toBeGreaterThan(0);
      expect(view.steps).toHaveLength(7);
      expect(view.steps.filter((step) => step.status === 'complete')).toHaveLength(
        expected.completedBefore,
      );
      expect(view.steps.filter((step) => step.status === 'current')).toHaveLength(1);
      expect(view.steps[expected.completedBefore]?.status).toBe('current');
      expect(JSON.stringify(view)).not.toMatch(/Falcon will/u);
      expect(JSON.stringify(view)).not.toMatch(/predicted design/iu);
      expect(whyThisMatters(state)).not.toMatch(/Falcon will/u);
    }
  });
});
