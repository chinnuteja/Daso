import { describe, expect, it } from 'vitest';

import { drawTeachingRequestBody } from '../../../src/adapters/agents/drawTeaching';
import { buildTeachingRequestV2 } from '../../../src/core/capability';

describe('Draw teaching client boundary', () => {
  it('serializes only the minimized request, never a document, mark geometry, or identifiers from trusted context', async () => {
    const request = await buildTeachingRequestV2('Repeat my mark along here.', {
      kind: 'draw_pattern',
      toolId: 'my-dragon-scales',
      activeVersionId: null,
      ledgerSequence: 0,
      sourceDocumentId: 'draw_document_001',
      sourceRevision: 3,
      selectedMarkSnapshotId: 'mark_snapshot_001',
      guidePathId: 'draw_path_001',
      guidePathRevision: 2,
    });
    const body = JSON.stringify(drawTeachingRequestBody(request));

    expect(body).toContain('selectedMark');
    expect(body).not.toContain('draw_document_001');
    expect(body).not.toContain('mark_snapshot_001');
    expect(body).not.toContain('guide_path_001');
    expect(body).not.toContain('points');
  });
});
