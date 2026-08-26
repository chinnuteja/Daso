import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../support/sourceTree';

/**
 * INV-83 — demo script and frame manifest follow the real evidence path.
 */

interface DemoManifest {
  readonly thesis: string;
  readonly closingLine: string;
  readonly video: string | null;
  readonly videoBlocker: string | null;
  readonly requiredBeats: readonly string[];
  readonly frames: readonly {
    readonly file: string;
    readonly beat: string;
    readonly caption: string;
    readonly durationSeconds: number;
  }[];
}

describe('INV-83 — demo script and frame manifest', () => {
  it('INV-83: the finished 90-second demo has the required real-product beats', () => {
    const script = readFileSync(resolve(REPO_ROOT, 'docs/demo/README.md'), 'utf8');
    const manifest = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'docs/demo/manifest.json'), 'utf8'),
    ) as DemoManifest;

    expect(manifest.thesis).toBe(
      'The computer that grows with your child should grow because of your child.',
    );
    expect(manifest.closingLine).toBe("Maya didn't download this tool. She taught it.");
    expect(manifest.video).toBe('docs/demo/teach-daso-90s.webm');
    expect(manifest.videoBlocker).toBeNull();
    if (manifest.video === null) {
      throw new Error('The finished demo video path must be present.');
    }
    expect(existsSync(resolve(REPO_ROOT, manifest.video))).toBe(true);
    expect(script).toContain(manifest.thesis);
    expect(script).toContain(manifest.closingLine);
    expect(script).toContain('Finished video');
    expect(script).toContain('Human check: pending');
    expect(script).toContain('D-02');

    for (const beat of [
      'thesis',
      'correction',
      'v2 change',
      'Day-2 proof',
      'parent evidence',
      'closing line',
    ]) {
      expect(manifest.requiredBeats).toContain(beat);
      expect(`${script}\n${JSON.stringify(manifest)}`).toMatch(new RegExp(beat, 'u'));
    }

    expect(script).toContain('Yes — add this to the tool');
    expect(script).toContain('tool_version_002');
    expect(script).toContain('Make my copy');
    expect(script).toContain('Parent evidence');

    expect(manifest.frames.map((frame) => frame.beat)).toEqual([
      'thesis',
      'define',
      'correction',
      'v2 change',
      'Day-2 proof',
      'parent evidence',
    ]);
    for (const frame of manifest.frames) {
      expect(existsSync(resolve(REPO_ROOT, frame.file))).toBe(true);
      expect(frame.caption.length).toBeGreaterThan(0);
      expect(frame.durationSeconds).toBeGreaterThan(0);
    }
    expect(manifest.frames.reduce((total, frame) => total + frame.durationSeconds, 0)).toBe(90);
  });
});
