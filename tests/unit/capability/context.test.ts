import { describe, expect, it } from 'vitest';

import {
  buildTeachingRequestV2,
  checkIntentGrounding,
  digestCapabilityContext,
  ModelIntent,
} from '../../../src/core/capability';

const DRAW_CONTEXT = {
  kind: 'draw_pattern' as const,
  toolId: 'my-dragon-scales',
  activeVersionId: null,
  ledgerSequence: 0,
  sourceDocumentId: 'draw_document_001',
  sourceRevision: 3,
  selectedMarkSnapshotId: 'mark_snapshot_001',
  guidePathId: 'draw_path_tail_001',
  guidePathRevision: 2,
};

const FLIGHT_CONTEXT = {
  kind: 'flight_validity' as const,
  toolId: 'mayas-flight-lab',
  activeVersionId: 'tool_version_002',
  ledgerSequence: 15,
  selectedTrial: {
    trialId: 'trial_004',
    obstruction: true,
    setupChanged: false,
    distanceM: 8.9,
  },
  counterexampleTrialId: 'trial_003',
};

describe('Capability context and bounded model intent', () => {
  it('hashes trusted context canonically and changes the digest when relevant facts change', async () => {
    const first = await digestCapabilityContext(DRAW_CONTEXT);
    const sameValuesDifferentOrder = {
      guidePathRevision: 2,
      sourceRevision: 3,
      ledgerSequence: 0,
      kind: 'draw_pattern' as const,
      toolId: 'my-dragon-scales',
      activeVersionId: null,
      guidePathId: 'draw_path_tail_001',
      selectedMarkSnapshotId: 'mark_snapshot_001',
      sourceDocumentId: 'draw_document_001',
    };
    expect(await digestCapabilityContext(sameValuesDifferentOrder)).toBe(first);
    expect(await digestCapabilityContext({ ...DRAW_CONTEXT, guidePathRevision: 3 })).not.toBe(first);
  });

  it('sends an interpretation model bounded context, never the drawing document or source vectors', async () => {
    const request = await buildTeachingRequestV2(
      'Repeat my scale along here, smaller toward the tail.',
      DRAW_CONTEXT,
    );
    expect(request.context).toEqual({
      kind: 'draw_pattern',
      selectedMark: 'available',
      guidePath: 'available',
    });
    expect(JSON.stringify(request.context)).not.toContain('draw_document_001');
    expect(JSON.stringify(request.context)).not.toContain('mark_snapshot_001');
  });

  it('rejects model-shaped approval and unsupported capability types at the schema boundary', () => {
    expect(ModelIntent.safeParse({ type: 'approve', kind: 'draw_pattern' }).success).toBe(false);
    expect(
      ModelIntent.safeParse({
        type: 'propose_capability',
        kind: 'draw_pattern',
        operation: 'regenerate_dragon',
        spacing: 'even',
        sizeProfile: 'constant',
      }).success,
    ).toBe(false);
  });

  it('fails closed when a Flight proposal does not match the selected trial facts', () => {
    const proposal = {
      type: 'propose_capability' as const,
      kind: 'flight_validity' as const,
      rule: 'exclude_obstructed_trial' as const,
    };
    expect(checkIntentGrounding(proposal, FLIGHT_CONTEXT)).toEqual({ ok: true });
    expect(
      checkIntentGrounding(proposal, {
        ...FLIGHT_CONTEXT,
        selectedTrial: { ...FLIGHT_CONTEXT.selectedTrial, obstruction: false },
      }),
    ).toEqual({ ok: false, reason: 'unsupported_context' });
  });
});
