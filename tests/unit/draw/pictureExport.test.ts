import { describe, expect, it } from 'vitest';
import { pictureSvg } from '../../../src/ui/draw/pictureExport';

describe('picture-only export', () => {
  it('preserves exact geometry and colours without exporting private graph fields', () => {
    const source = { strokeId: 'private_source_id', ownerChildId: 'private_child', color: '#15737c', width: 7, points: [{ x: 12.5, y: 20 }, { x: 43, y: 51 }] };
    const before = JSON.stringify(source);
    const svg = pictureSvg([source, { color: '#294f46', width: 4, points: [{ x: 60, y: 70 }] }]);
    expect(svg).toContain('points="12.5,20 43,51"');
    expect(svg).toContain('stroke="#15737c" stroke-width="7"');
    expect(svg).toContain('<circle cx="60" cy="70" r="2"');
    expect(svg).not.toMatch(/private_|script|foreignObject|href|guide/);
    expect(JSON.stringify(source)).toBe(before);
  });
  it('rejects markup injection, invalid geometry and oversized output', () => {
    const line = { color: '#15737c', width: 7, points: [{ x: 12, y: 20 }] };
    expect(() => pictureSvg([{ ...line, color: 'red" onload="alert(1)' }])).toThrow();
    expect(() => pictureSvg([{ ...line, points: [{ x: NaN, y: 0 }] }])).toThrow();
    expect(() => pictureSvg([{ ...line, width: Infinity }])).toThrow();
    expect(() => pictureSvg(Array.from({ length: 3073 }, () => line))).toThrow();
    expect(() => pictureSvg([{ ...line, points: Array.from({ length: 98_305 }, () => ({ x: 0, y: 0 })) }])).toThrow();
  });
  it('allows a maximum-size visible source plus a bounded repeat without truncating either', () => {
    const line = { color: '#15737c', width: 7, points: Array.from({ length: 2048 }, () => ({ x: 12, y: 20 })) };
    const lines = Array.from({ length: 48 }, () => line);
    const svg = pictureSvg(lines);
    expect(svg.match(/12,20/g)).toHaveLength(98_304);
    expect(svg.match(/<polyline/g)).toHaveLength(48);
  });
});
