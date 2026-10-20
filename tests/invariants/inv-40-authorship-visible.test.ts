import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AuthorshipAttribution } from '../../src/core/inspection/authorshipView';
import type { ReadingBand } from '../../src/core/schema/vocabulary';
import { AuthorshipRow, type AuthorshipRowProps } from '../../src/ui/components/AuthorshipRow';
import { attributionCopy } from '../../src/ui/copy/attribution';

/**
 * INV-40 — AI suggestions are visibly distinguishable from child decisions.
 */

const BANDS: readonly ReadingBand[] = ['emerging', 'developing', 'fluent'];
const KINDS: readonly AuthorshipAttribution[] = [
  'child_chosen',
  'ai_suggested_child_accepted',
  'child_taught',
];

describe('INV-40 — AI suggestions are visibly distinguishable from child decisions (§7.1, §17 Authorship)', () => {
  it('INV-40: AuthorshipRow requires an attribution and will not type-check without one', () => {
    expectTypeOf<AuthorshipRowProps>().toHaveProperty('attribution');
    expectTypeOf<{
      subjectLabel: string;
      readingBand: ReadingBand;
      childName: string;
    }>().not.toExtend<AuthorshipRowProps>();
  });

  it('INV-40: child_chosen and ai_suggested_child_accepted produce different non-empty copy in every reading band', () => {
    for (const band of BANDS) {
      const child = attributionCopy('child_chosen', band, 'Maya');
      const suggested = attributionCopy('ai_suggested_child_accepted', band, 'Maya');
      const taught = attributionCopy('child_taught', band, 'Maya');
      expect(child.length).toBeGreaterThan(0);
      expect(suggested.length).toBeGreaterThan(0);
      expect(taught.length).toBeGreaterThan(0);
      expect(child).not.toBe(suggested);
      expect(suggested).not.toBe(taught);
      expect(child).not.toBe(taught);
    }
  });

  it('INV-40: a rendered row carries its attribution and differs by kind', () => {
    const rendered = Object.fromEntries(
      KINDS.map((attribution) => [
        attribution,
        renderToStaticMarkup(
          createElement(AuthorshipRow, {
            attribution,
            subjectLabel: 'Distance',
            readingBand: 'developing',
            childName: 'Maya',
          }),
        ),
      ]),
    );

    expect(rendered.child_chosen).toContain('data-attribution="child_chosen"');
    expect(rendered.ai_suggested_child_accepted).toContain(
      'data-attribution="ai_suggested_child_accepted"',
    );
    expect(rendered.child_chosen).not.toBe(rendered.ai_suggested_child_accepted);
    expect(rendered.child_chosen).toContain('Maya chose this.');
    expect(rendered.ai_suggested_child_accepted).toContain('Kale suggested this. Maya said yes.');
  });
});
