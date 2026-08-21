import { describe, expect, it } from 'vitest';

import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';
import { TeachingMove } from '../../src/core/ports/teaching';
import { foldApprovedEvents } from '../../src/core/ledger/fold';
import type { LedgerEntry } from '../../src/core/ledger/types';
import { EXCLUDE_OBSTRUCTED_MUTATION } from '../../src/adapters/teaching/scripted';

/**
 * INV-47 — The Teaching Agent cannot approve its own suggestion (§7.3, §12).
 */

describe('INV-47 — the Teaching Agent cannot approve its own suggestion (§7.3, §12)', () => {
  it('INV-47: TeachingMove has no member that expresses approval', () => {
    expect(TeachingMove.safeParse({ kind: 'approval', approves: 'event_001' }).success).toBe(false);
    const teachingPort = listSourceFiles(SRC_ROOT).find(
      (file) => file.path === 'src/core/ports/teaching.ts',
    );
    expect(teachingPort).toBeDefined();
    expect(teachingPort?.text).not.toMatch(/\bappend_approval\b/u);
    expect(teachingPort?.text).not.toMatch(/kind:\s*z\.literal\('approval'\)/u);
  });

  it('INV-47: the agent client emits no append_approval intent', () => {
    const agentFiles = listSourceFiles(SRC_ROOT).filter((file) =>
      file.path.startsWith('src/adapters/agents/'),
    );
    expect(agentFiles.length).toBeGreaterThan(0);
    const offenders = agentFiles
      .filter((file) => file.text.includes('append_approval'))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('INV-47: an AI-authored approval entry is still excluded by the fold (INV-10 remains)', () => {
    const candidate: LedgerEntry = {
      entryKind: 'candidate',
      eventId: 'event_001',
      sequence: 1,
      toolId: 'mayas-flight-lab',
      actor: 'ai',
      type: 'ai_suggestion',
      originalInput: 'exclude obstructed throws',
      candidateMutation: EXCLUDE_OBSTRUCTED_MUTATION,
      createdAt: '2026-08-18T10:00:00Z',
    };
    const aiApproval: LedgerEntry = {
      entryKind: 'approval',
      eventId: 'event_002',
      sequence: 2,
      toolId: 'mayas-flight-lab',
      actor: 'ai',
      approves: 'event_001',
      createdAt: '2026-08-18T10:00:01Z',
    };
    const body = foldApprovedEvents([candidate, aiApproval]);
    expect(body.rules).toEqual([]);
  });
});
