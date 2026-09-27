import { describe, expect, it } from 'vitest';

import { buildTeachingRequestV2, groundDrawInterpretation } from '../../../src/core/capability';

const CONTEXT = {
  kind: 'draw_pattern' as const,
  toolId: 'my-dragon-scales',
  activeVersionId: null,
  ledgerSequence: 0,
  sourceDocumentId: 'draw_document_001',
  sourceRevision: 3,
  selectedMarkSnapshotId: 'mark_snapshot_001',
  guidePathId: 'draw_path_001',
  guidePathRevision: 2,
};

describe('Draw semantic grounding', () => {
  it('accepts only the closed repeat behavior actually supported by the child words', async () => {
    const request = await buildTeachingRequestV2(
      'Repeat my scale along here, smaller toward the tail.',
      CONTEXT,
    );
    const result = groundDrawInterpretation(request, {
      type: 'propose_capability',
      kind: 'draw_pattern',
      operation: 'repeat_selected_mark',
      spacing: 'even',
      sizeProfile: 'smaller_toward_end',
    });

    expect(result).toMatchObject({ ok: true, proposal: { operation: 'repeat_selected_mark', sizeProfile: 'smaller_toward_end' } });
  });

  it('asks for clarification instead of smuggling an unsupported spacing or size claim into a valid shape', async () => {
    const request = await buildTeachingRequestV2('Repeat my scale along here.', CONTEXT);
    const smaller = groundDrawInterpretation(request, {
      type: 'propose_capability',
      kind: 'draw_pattern',
      operation: 'repeat_selected_mark',
      spacing: 'close',
      sizeProfile: 'smaller_toward_end',
    });
    expect(smaller).toMatchObject({ ok: false, reason: 'unsupported_meaning' });

    const vague = await buildTeachingRequestV2('Make it nicer.', CONTEXT);
    const unrelated = groundDrawInterpretation(vague, {
      type: 'propose_capability',
      kind: 'draw_pattern',
      operation: 'repeat_selected_mark',
      spacing: 'even',
      sizeProfile: 'constant',
    });
    expect(unrelated).toMatchObject({ ok: false, reason: 'unsupported_meaning' });
  });

  it('rejects a different capability kind even when its schema is valid', async () => {
    const request = await buildTeachingRequestV2('Repeat my scale along here.', CONTEXT);
    expect(groundDrawInterpretation(request, {
      type: 'propose_capability',
      kind: 'flight_validity',
      rule: 'exclude_obstructed_trial',
    })).toMatchObject({ ok: false, reason: 'kind_mismatch' });
  });
});
