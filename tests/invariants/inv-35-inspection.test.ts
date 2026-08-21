import { describe, expect, it } from 'vitest';

import * as inspection from '../../src/core/inspection';
import { authorshipExplanation, authorshipSummaryCounts } from '../../src/core/inspection';
import * as authorshipView from '../../src/core/inspection/authorshipView';
import * as summaryCounts from '../../src/core/inspection/summaryCounts';
import { flightLabLedger, flightLabTrials } from '../fixtures/ledger/flightLab';

/**
 * INV-35 — inspection is a projection, not a second source of truth (§4.1, §10, E.1).
 */

describe('INV-35 — inspection is a projection, not a second source of truth (§4.1, §10, E.1)', () => {
  it('INV-35: the inspection module exports no write, save, or persist function', () => {
    const exported = [
      ...Object.keys(inspection),
      ...Object.keys(authorshipView),
      ...Object.keys(summaryCounts),
    ];
    const writers = exported.filter((name) => /write|save|persist/iu.test(name));
    expect(writers).toEqual([]);
  });

  it('INV-35: the Flight Lab explanation contains exactly the approved behaviours with the required attributions', () => {
    const explanation = authorshipExplanation(flightLabLedger);

    const median = explanation.find(
      (entry) => entry.subject.kind === 'metric' && entry.subject.metric === 'median_distance',
    );
    const consistency = explanation.find(
      (entry) => entry.subject.kind === 'metric' && entry.subject.metric === 'consistency',
    );
    const rule = explanation.find(
      (entry) => entry.subject.kind === 'rule' && entry.subject.ruleId === 'exclude_obstructed_flight',
    );

    expect(median?.attribution).toBe('child_chosen');
    expect(consistency?.attribution).toBe('ai_suggested_child_accepted');
    expect(rule?.attribution).toBe('child_taught');

    expect(
      explanation.some((entry) => entry.subject.kind === 'input' && entry.subject.input === 'note'),
    ).toBe(false);
    expect(
      explanation.some(
        (entry) => entry.subject.kind === 'rule' && entry.subject.ruleId === 'exclude_distance_8_9',
      ),
    ).toBe(false);

    expect(explanation.map((entry) => entry.eventId)).toEqual([
      'event_001',
      'event_003',
      'event_005',
      'event_007',
      'event_009',
      'event_014',
    ]);
  });

  it('INV-35: summary counts report zero unapproved decisions in the compiled version', () => {
    const counts = authorshipSummaryCounts(flightLabLedger, flightLabTrials);
    expect(counts.unapprovedDecisionsInCompiledVersion).toBe(0);
    expect(counts.observedExamples).toBe(4);
    expect(counts.childDefinedDecisions).toBe(3);
    expect(counts.childCorrections).toBe(1);
    expect(counts.aiSuggestionsAccepted).toBe(2);
  });
});
