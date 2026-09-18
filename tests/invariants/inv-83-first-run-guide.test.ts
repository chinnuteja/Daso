import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../support/sourceTree';

describe('INV-83 — founder first-run guide', () => {
  it('INV-83: explains the proof, navigation, approval boundary, and scoped reset', () => {
    const guide = readFileSync(
      resolve(REPO_ROOT, 'src/ui/coaching/ExperienceGuide.tsx'),
      'utf8',
    );
    const controls = readFileSync(
      resolve(REPO_ROOT, 'src/ui/coaching/ExperienceControls.tsx'),
      'utf8',
    );
    const reset = readFileSync(
      resolve(REPO_ROOT, 'src/ui/flows/experience/browserSession.ts'),
      'utf8',
    );

    expect(guide).toContain('A two-minute interactive proof');
    expect(guide).toContain('Nothing changes before the child approves it.');
    expect(guide).toContain('Writing preference');
    expect(guide).toContain('Bridge Bench');
    expect(guide).toContain('Saved tools');
    expect(guide).toContain('role="dialog"');
    expect(guide).toContain('aria-modal="true"');
    expect(controls).toContain('Start fresh');
    expect(controls).toContain('resetWritingCoach');
    expect(reset).toContain('deleteProfileGraph(pointer.ownerChildId)');
    expect(reset).toContain("database.delete('meta', WRITING_COACH_IDENTITY.pointerKey)");
  });
});
