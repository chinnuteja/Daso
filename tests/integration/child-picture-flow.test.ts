import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryPersistence, openIndexedDbRepositories } from '../../src/adapters/persistence';
import { beginCapabilityReview, buildDrawApprovalBundle, runSavedDrawCapability } from '../../src/core/capability';
import type { DrawPatternProposal } from '../../src/core/capability';
import { buildCapabilityParentEvidence } from '../../src/core/evidence/capability';
import { pictureInstruction } from '../../src/ui/draw/pictureInstruction';
import { restoreKeptStamp } from '../../src/ui/draw/restoreKeptStamp';
import { seedKaleCapabilities } from '../support/kaleCapabilityGraph';

describe.each(['memory','idb'] as const)('Picture-led child choices in %s', adapter => {
  it('keeps all six visual choices child-authored, inactive until approval, and locally reusable', async () => {
    const databaseName = `child-picture-${adapter}`;
    const opened = adapter === 'idb' ? await openIndexedDbRepositories(databaseName) : null;
    const repos = opened?.repositories ?? createMemoryPersistence().repositories;
    const fetchSpy = vi.fn(() => { throw new Error('No model access'); });
    vi.stubGlobal('fetch',fetchSpy);
    try {
      const source = await seedKaleCapabilities(repos);
      let i = 0;
      for (const spacing of ['close','even','wide'] as const) for (const sizeProfile of ['constant','smaller_toward_end'] as const) {
        i++;
        const toolId = `picture-tool-${i}`;
        const context = { ...source.context, toolId, selectedMarkSnapshotId: `mark_snapshot_${10000+i}` };
        const proposal: DrawPatternProposal = { ...source.proposal,spacing,sizeProfile };
        const words = pictureInstruction(proposal);
        expect(words).toContain('Chosen with picture buttons:');
        expect(words).toContain(`${spacing} spacing`);
        const entries = await beginCapabilityReview(repos.capabilities,{context,ownerChildId:source.ownerChildId,sourcePath:source.drawing.guidePath,childWords:words,proposal,origin:'manual',intentEventId:`event_${10000+i*10+1}`,candidateEventId:`event_${10000+i*10+2}`,occurredAt:'2026-10-12T00:00:00Z'});
        expect(await repos.capabilities.getGraph(toolId)).toBeNull();
        const approval = {type:'child_approval' as const,actor:'child' as const,eventId:`event_${10000+i*10+3}`,toolId,sequence:3,occurredAt:'2026-10-12T00:00:00Z',candidateEventId:`event_${10000+i*10+2}`,approvedProposal:proposal,idempotencyKey:`keep_picture_${i}`};
        const bundle = await buildDrawApprovalBundle({drawing:source.drawing,toolId,ownerChildId:source.ownerChildId,displayName:'My stamp',existingVersionCount:0,snapshotId:context.selectedMarkSnapshotId,versionId:`tool_version_${10000+i}`,approvalEvent:approval,entries,createdAt:'2026-10-12T00:00:00Z',reviewedContext:context});
        await repos.capabilities.commitApprovedCapability({...bundle,approval,reviewedContext:context});
        const graph = (await repos.capabilities.getGraph(toolId))!;
        expect(restoreKeptStamp(graph,source.drawing)?.session.state).toBe('saved');
        expect(restoreKeptStamp(graph,{...source.drawing,revision:source.drawing.revision+1})).toBeNull();
        expect(restoreKeptStamp(graph,{...source.drawing,ownerChildId:'child_other_01'})).toBeNull();
        const view = await buildCapabilityParentEvidence(graph);
        expect(view.steps.find(step => step.title === 'Their picture choices')?.text).toBe(words);
        expect(view.steps.some(step => step.actor === 'ai')).toBe(false);
        expect(graph.snapshots[0]!.strokes).toEqual(source.drawing.strokes);
        const version = graph.versions[0]!;
        if(version.kind !== 'draw_pattern') throw new Error('Wrong kind');
        expect(version.controls.spacing).toBe(spacing === 'close' ? 36 : spacing === 'wide' ? 92 : 56);
        expect(version.controls.endScale).toBe(sizeProfile === 'constant' ? 1 : .45);
        const path = [{x:100,y:300},{x:600,y:330}];
        const input = {snapshot:graph.snapshots[0]!,version,pathId:'draw_path_picture_reuse',path};
        expect(runSavedDrawCapability(input)).toEqual(runSavedDrawCapability(input));
        expect(runSavedDrawCapability(input).stampCount).toBeGreaterThan(1);
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); opened?.database.close(); if(opened) await deleteDB(databaseName); }
  });
});
