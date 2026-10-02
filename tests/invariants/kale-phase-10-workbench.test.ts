import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 10 presentation boundaries (real browser checks supplement these)', () => {
  it('lands in Draw and preserves the writing experiment at a separate route', () => {
    expect(readFileSync('src/app/page.tsx', 'utf8')).toContain('DrawStudio');
    expect(readFileSync('src/app/writing/page.tsx', 'utf8')).toContain('WritingPreferenceFlow');
  });
  it('keeps the artifact before the context dock and provides keyboard mark/path choices', () => {
    const source = readFileSync('src/ui/draw/DrawWorkbench.tsx', 'utf8');
    expect(source).toContain('KeyboardPath');
    expect(source).toContain('Use this mark');
    expect(source).toContain('aria-label="Choose a source mark"');
    expect(source).not.toContain('source hash {');
    expect(source).toContain('startingIdea?.proposal.kind');
    expect(source).toContain('You changed it to');
    expect(source).toContain("'Practice mark' : 'Your marks'");
    expect(source).not.toContain('Tap exactly the mark you made.');
    expect(source).toContain('Current draft not saved as a tool');
    expect(readFileSync('src/ui/parent/CapabilityParentView.tsx', 'utf8')).toContain('A supplied practice mark, selected by the learner.');
    const css = readFileSync('src/ui/draw/DrawWorkbench.module.css', 'utf8');
    expect(css).toContain('grid-area: canvas');
    expect(css).toContain('"canvas" "dock"');
    expect(css).toContain('prefers-reduced-motion');
  });
  it('targets only the dedicated practice identity, never a database-wide clear', () => {
    const reset = readFileSync('src/ui/draw/practiceSession.ts', 'utf8');
    expect(reset).toContain('deleteProfileGraph(DRAW_PRACTICE_OWNER)');
    expect(reset).not.toMatch(/deleteDatabase|\.clear\(/);
    const studio = readFileSync('src/ui/draw/DrawStudio.tsx', 'utf8');
    expect(studio).toContain('<dialog');
    expect(studio).toContain('cancel.current?.focus()');
    expect(studio).toContain('onCancel=');
    expect(studio).toContain('Blank drawings and your other tools stay');
  });
});
