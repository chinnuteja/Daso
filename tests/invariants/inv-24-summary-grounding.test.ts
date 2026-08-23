import { describe, expect, it } from 'vitest';

import { createScriptedEvidenceSource } from '../../src/adapters/evidence/scripted';
import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import {
  EvidenceGroundingError,
  buildParentSummary,
  renderParentClauses,
  validateEvidenceSelection,
} from '../../src/core/evidence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabProjection } from '../support/evidenceGraph';

/**
 * INV-24 — a parent summary is created only from a valid local projection.
 */

describe('INV-24 — every parent-summary claim maps to an existing event id; fabricated summary rejected', () => {
  it('INV-24: scripted Flight Lab ids ground the rendered clauses and a second build is identical', async () => {
    const { projection } = flightLabProjection();
    const selection = await createScriptedEvidenceSource().select({ projection });
    expect(selection.evidenceEventIds).toEqual(
      expect.arrayContaining(['event_001', 'trial_004', 'event_014', 'tool_version_002']),
    );
    const ids = createSequentialIdFactory();
    const clock = createFixedClock('2026-08-18T10:36:00Z');
    const summary = buildParentSummary({
      projection,
      selection,
      childId: 'child_local_01',
      ids,
      clock,
    });
    const clauses = renderParentClauses(projection, { evidenceEventIds: summary.evidenceEventIds });
    expect(clauses.question).toContain('which paper airplane flies the farthest');
    expect(clauses.observation).toContain('Dart');
    expect(clauses.observation).toContain('touched something');
    expect(clauses.rule).toContain("shouldn't count because it hit the chair");
    expect(clauses.result).toContain('not counted');
    expect(clauses.conversation).toBe('Ask Maya what made that throw unfair.');
    expect(clauses.supporting.map((row) => row.referenceId).sort()).toEqual(
      [...summary.evidenceEventIds].sort(),
    );
    expect(summary.evidenceEventIds).toContain('event_001');
    expect(summary.evidenceEventIds).toContain('trial_004');
    expect(summary.evidenceEventIds).toContain('event_014');
    expect(summary.evidenceEventIds).toContain('tool_version_002');

    const again = buildParentSummary({
      projection,
      selection,
      childId: 'child_local_01',
      ids: createSequentialIdFactory(),
      clock,
    });
    expect(canonicalJson(again)).toBe(canonicalJson(summary));
  });

  it('INV-24: fabricated, foreign, duplicate, too-few, free-text, and extra-key selections are rejected without a save', async () => {
    const { graph, projection } = flightLabProjection();
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, graph);
    const before = canonicalJson(await repositories.summaries.listByTool('mayas-flight-lab'));

    const rejected = [
      { evidenceEventIds: ['trial_999'] },
      { evidenceEventIds: ['trial_101'] },
      { evidenceEventIds: ['trial_004', 'trial_004', 'event_014', 'tool_version_002'] },
      { evidenceEventIds: ['trial_004'] },
      { evidenceEventIds: ['trial_004', 'event_001', 'tool_version_002'] },
      'Maya taught a secret rule',
      { evidenceEventIds: ['event_001', 'trial_004', 'event_014', 'tool_version_002'], text: 'no' },
    ];
    for (const candidate of rejected) {
      expect(() => validateEvidenceSelection(projection, candidate)).toThrow(EvidenceGroundingError);
      expect(() =>
        buildParentSummary({
          projection,
          selection: candidate,
          childId: 'child_local_01',
          ids: createSequentialIdFactory(),
          clock: createFixedClock('2026-08-18T10:36:00Z'),
        }),
      ).toThrow(EvidenceGroundingError);
    }
    expect(canonicalJson(await repositories.summaries.listByTool('mayas-flight-lab'))).toBe(before);
  });
});
