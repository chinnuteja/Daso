import { describe, expect, it } from 'vitest';

import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';

/**
 * INV-42 — the child interface is not an unrestricted chat.
 */

const FREE_TEXT_INPUT = /<(textarea|input)[^>]*?(?:type=["']text["']|name=["']note["']|(?<!type=)[\s>])/iu;

describe('INV-42 — the child interface is not an unrestricted chat (§5, §7.1)', () => {
  it('INV-42: no file that contains a free-text input also names append_candidate', () => {
    const files = listSourceFiles(SRC_ROOT).filter(
      (file) => file.path.startsWith('src/ui/') || file.path.startsWith('src/app/'),
    );
    const offenders = files
      .filter((file) => /<textarea\b|<input\b/u.test(file.text))
      .filter((file) => /append_candidate|candidateMutation/u.test(file.text))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('INV-42: CaptureTrialScreen records a note as an observation field, not as a mutation', () => {
    const files = listSourceFiles(SRC_ROOT);
    const capture = files.find((file) => file.path.endsWith('CaptureTrialScreen.tsx'));
    expect(capture).toBeDefined();
    expect(capture?.text).toMatch(FREE_TEXT_INPUT);
    expect(capture?.text.includes('append_candidate')).toBe(false);
    expect(capture?.text.includes('candidateMutation')).toBe(false);
  });
});
