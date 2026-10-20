import { describe, expect, it } from 'vitest';
import { chooseSavedDrawTool } from '../../../src/ui/draw/chooseSavedDrawTool';
import type { CapabilityDefinition } from '../../../src/core/capability/types';

describe('Saved Draw handoff across real and practice owners', () => {
  const real: CapabilityDefinition = {toolId:'real-tool',ownerChildId:'child_local_01',kind:'draw_pattern',displayName:'My tool',currentVersionId:'tool_version_001',createdAt:'2026-10-12T12:00:00Z'};
  const practice: CapabilityDefinition = {...real,toolId:'practice-tool',ownerChildId:'child_kale_practice_01',createdAt:'2026-10-12T10:00:00Z'};
  it('opens the newest tool, not the last owner group in the list', () => {
    expect(chooseSavedDrawTool([real,practice],null,null)).toBe(real.toolId);
    expect(chooseSavedDrawTool([practice,real],null,null)).toBe(real.toolId);
  });
  it('opens an explicit handoff but keeps a later deliberate selection on refresh', () => {
    expect(chooseSavedDrawTool([real,practice],null,practice.toolId)).toBe(practice.toolId);
    expect(chooseSavedDrawTool([real,practice],real.toolId,practice.toolId)).toBe(real.toolId);
  });
  it('falls back safely when a tool was removed and never mutates the list', () => {
    const input = [real,practice];
    expect(chooseSavedDrawTool(input,'removed-tool','removed-tool')).toBe(real.toolId);
    expect(input).toEqual([real,practice]);
    expect(chooseSavedDrawTool([],null,real.toolId)).toBeNull();
  });
});
