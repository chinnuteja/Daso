import { describe, expect, it } from 'vitest';

import { ORCHESTRATOR_EVENT_KINDS, transition } from '../../src/core/orchestrator';
import { foldApprovedEvents } from '../../src/core/ledger/fold';
import { FLIGHT_LAB_TOOL_ID } from '../fixtures/script/flightLab';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

/**
 * INV-41 — no material mutation without explicit approval.
 */
describe('INV-41 — no material mutation without explicit approval (§7.1, §7.3)', () => {
  it('INV-41: only candidate_approved from REVIEW_MUTATION produces append_approval', () => {
    const producing: string[] = [];

    for (const kind of ORCHESTRATOR_EVENT_KINDS) {
      const result = transition('REVIEW_MUTATION', { kind });
      const intents = result.kind === 'advanced' ? result.intents : [];
      if (intents.includes('append_approval')) {
        producing.push(kind);
      }
    }

    expect(producing).toEqual(['candidate_approved']);

    const otherProducers: string[] = [];
    for (const state of ['IMAGINE', 'DEFINE_METRICS', 'DEFINE_INPUTS', 'PREDICT', 'COLLECT_TRIALS', 'INSPECT_ANOMALY', 'PROPOSE_CORRECTION', 'COMPILE', 'RUN'] as const) {
      for (const kind of ORCHESTRATOR_EVENT_KINDS) {
        if (kind === 'candidate_approved') {
          continue;
        }
        const result = transition(state, { kind });
        const intents = result.kind === 'advanced' ? result.intents : [];
        if (intents.includes('append_approval')) {
          otherProducers.push(`${state}+${kind}`);
        }
      }
    }
    expect(otherProducers).toEqual([]);
  });

  it('INV-41: declining the correction leaves the rule absent from the fold', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: false });
    const entries = await result.repositories.ledger.listByTool(FLIGHT_LAB_TOOL_ID);
    const body = foldApprovedEvents(entries);
    expect(body.rules).toEqual([]);
    expect(body.metrics).toEqual(['median_distance', 'consistency']);
  });
});
