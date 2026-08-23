import { describe, expect, it } from 'vitest';

import {
  EvidenceGroundingError,
  buildEvidenceProjection,
  buildParentSummary,
  renderParentClauses,
  validateEvidenceSelection,
} from '../../../src/core/evidence';
import { createFixedClock } from '../../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../../src/core/ports/ids';
import { canonicalJson } from '../../../src/core/serialization/canonicalJson';
import { flightLabProjection } from '../../support/evidenceGraph';
import { otherToolGraph } from '../../fixtures/persistence/flightLab';

describe('core/evidence', () => {
  it('projects one tool, sorts ids, and omits grants and foreign tools', () => {
    const { projection, graph } = flightLabProjection();
    const ids = projection.items.map((item) => item.referenceId);
    expect(ids).toEqual([...ids].sort());
    expect(new Set(ids).size).toBe(ids.length);
    expect(projection.ownerDisplayName).toBe('Maya');
    expect(projection.items.some((item) => item.kind === 'trial' && item.referenceId === 'trial_004')).toBe(
      true,
    );
    expect(graph.grants[0]?.grantId).toBeDefined();
    expect(ids).not.toContain(graph.grants[0]?.grantId);
    const other = otherToolGraph();
    expect(ids).not.toContain(other.trials[0]?.trialId);
  });

  it('rejects a selection that is missing a required Flight Lab fact', () => {
    const { projection } = flightLabProjection();
    expect(() =>
      validateEvidenceSelection(projection, {
        evidenceEventIds: ['event_001', 'trial_004', 'tool_version_002'],
      }),
    ).toThrow(EvidenceGroundingError);
  });

  it('renders only from the validated selection', () => {
    const { projection } = flightLabProjection();
    const clauses = renderParentClauses(projection, {
      evidenceEventIds: ['event_001', 'trial_004', 'event_014', 'tool_version_002'],
    });
    expect(clauses.question).toContain('flies the farthest');
    expect(clauses.result).toContain('not counted');
    expect(clauses.conversation).toContain('Ask Maya');
  });

  it('buildParentSummary is byte-identical for the same inputs', () => {
    const { projection } = flightLabProjection();
    const selection = {
      evidenceEventIds: ['event_014', 'event_001', 'tool_version_002', 'trial_004'],
    };
    const left = buildParentSummary({
      projection,
      selection,
      childId: 'child_local_01',
      ids: createSequentialIdFactory(),
      clock: createFixedClock('2026-08-18T10:36:00Z'),
    });
    const right = buildParentSummary({
      projection,
      selection,
      childId: 'child_local_01',
      ids: createSequentialIdFactory(),
      clock: createFixedClock('2026-08-18T10:36:00Z'),
    });
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(left.evidenceEventIds).toEqual(['event_001', 'event_014', 'tool_version_002', 'trial_004']);
    expect(buildEvidenceProjection).toBeTypeOf('function');
  });
});
