import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 9 parent surface contracts (supplemented by real-browser evidence)', () => {
  const source = readFileSync('src/ui/parent/CapabilityParentView.tsx', 'utf8');
  const css = readFileSync('src/ui/parent/CapabilityParentView.module.css', 'utf8');
  it('keeps story before receipts and destructive controls, with explicit local limits', () => {
    expect(source.indexOf('styles.storyLayout')).toBeLessThan(source.indexOf('styles.receipts'));
    expect(source.indexOf('styles.receipts')).toBeLessThan(source.indexOf('styles.rights'));
    expect(source).toContain('No AI-written assessment');
    expect(source).toContain('downloaded files');
    expect(source).not.toMatch(/requestCapabilityInterpretation|\/api\/agents|fetch\(/);
  });
  it('uses a labelled native modal, safe initial focus, Escape, busy guards and post-delete focus', () => {
    expect(source).toContain('<dialog'); expect(source).toContain('aria-describedby="delete-details"');
    expect(source).toContain('cancel.current?.focus()'); expect(source).toContain('onCancel=');
    expect(source).toContain('heading.current?.focus()'); expect(source).toContain('if (busyRef.current) return');
    expect(source).toContain('getGraph(view.tool.toolId)');
    expect(css).toContain(':focus-visible'); expect(css).toContain('max-width:750px');
  });
  it('keeps expanded navigation readable on a phone rather than squeezing six labels together', () => {
    const shellCss = readFileSync('src/ui/shell/TabletShell.module.css', 'utf8');
    expect(shellCss).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(shellCss).toContain('min-width: 0');
  });
});
