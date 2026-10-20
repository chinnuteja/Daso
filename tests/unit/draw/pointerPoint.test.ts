import { describe, expect, it } from 'vitest';
import { pointerPoint } from '../../../src/ui/draw/pointerPoint';

describe('authored SVG pointer mapping', () => {
  it('inverts tall-view letterboxing rather than stretching coordinates over the whole element', () => {
    const surface = { getScreenCTM: () => ({ a: .77, b: 0, c: 0, d: .77, e: 306, f: 664 }) };
    const point = pointerPoint(surface, 306 + 251 * .77, 664 + 212 * .77);
    expect(point.x).toBeCloseTo(251); expect(point.y).toBeCloseTo(212);
  });
  it('supports scroll, translation and non-axis-aligned transforms', () => {
    const surface = { getScreenCTM: () => ({ a: 0, b: 2, c: -2, d: 0, e: 600, f: -300 }) };
    expect(pointerPoint(surface, 540, -260)).toEqual({ x: 20, y: 30 });
  });
  it('clamps points outside the artwork and rejects a missing transform', () => {
    expect(pointerPoint({ getScreenCTM: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }, -10, 900)).toEqual({ x: 0, y: 560 });
    expect(() => pointerPoint({ getScreenCTM: () => null }, 0, 0)).toThrow(/not ready/);
  });
});
