import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../support/sourceTree';

/**
 * INV-81 — target, focus, reduced-motion, and no horizontal overflow contract.
 */

function readCss(relative: string): string {
  return readFileSync(resolve(REPO_ROOT, relative), 'utf8');
}

describe('INV-81 — accessibility contract', () => {
  it('INV-81: tokens and interactive CSS meet target, focus, reduced-motion, and overflow rules', () => {
    const tokens = readCss('src/ui/shell/tokens.css');
    const buttons = readCss('src/ui/components/ChoiceButton.module.css');
    const shell = readCss('src/ui/shell/TabletShell.module.css');
    const screens = readCss('src/ui/screens/screens.module.css');
    const rail = readCss('src/ui/components/ProgressRail.module.css');

    expect(tokens).toMatch(/--target:\s*44px/u);
    expect(tokens).toContain('prefers-reduced-motion');
    expect(tokens).toContain('overflow-x: hidden');
    expect(tokens).toContain(':focus-visible');

    expect(buttons).toContain('min-height: var(--target)');
    expect(buttons).toContain(':focus-visible');
    expect(buttons).toContain('prefers-reduced-motion');

    expect(shell).toContain('overflow-x: hidden');
    expect(shell).toContain('flex-wrap');
    expect(shell).toContain('min-height: var(--target)');
    expect(shell).toContain(':focus-visible');

    expect(screens).toContain('minmax(min(100%, 14rem), 1fr)');
    expect(screens).toContain('overflow-x: hidden');
    expect(screens).toContain('min-height: var(--target)');
    expect(screens).toContain(':focus-visible');

    expect(rail).toContain('flex-wrap');
    expect(rail).toContain('min-height: var(--target)');
  });
});
