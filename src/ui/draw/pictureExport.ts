import { DRAW_HEIGHT, DRAW_WIDTH } from '../../core/draw';
import type { DrawPoint } from '../../core/draw';
import { MAX_PREVIEW_POINTS, MAX_PREVIEW_STAMPS } from '../../core/draw/preview';
import { MAX_WORKBENCH_POINTS } from './drawingBudget';

type PictureLine = Readonly<{ color: string; width: number; points: readonly DrawPoint[] }>;
const escapeXml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);

/** Artwork only: no child/profile identifiers, ledger, AI text, links, scripts or guide overlays. */
export function pictureSvg(lines: readonly PictureLine[]): string {
  // A valid source drawing and its derived output can both be at their respective limits.
  if (lines.length > 512 + MAX_PREVIEW_STAMPS * 32 || lines.reduce((total, line) => total + line.points.length, 0) > MAX_WORKBENCH_POINTS + MAX_PREVIEW_POINTS) throw new Error('This picture is too large to download.');
  const shapes = lines.map(line => {
    if (!/^#[\da-f]{6}$/i.test(line.color) || !Number.isFinite(line.width) || line.width <= 0 ||
        line.points.length === 0 || line.points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) throw new Error('This picture has an invalid line.');
    const colour = escapeXml(line.color);
    return line.points.length === 1
      ? `<circle cx="${line.points[0]!.x}" cy="${line.points[0]!.y}" r="${line.width / 2}" fill="${colour}"/>`
      : `<polyline points="${line.points.map(point => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="${colour}" stroke-width="${line.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${DRAW_WIDTH}" height="${DRAW_HEIGHT}" viewBox="0 0 ${DRAW_WIDTH} ${DRAW_HEIGHT}"><title>My picture</title><rect width="100%" height="100%" fill="#fffdf7"/>${shapes.join('')}</svg>`;
}

export function downloadPicture(lines: readonly PictureLine[]): void {
  const url = URL.createObjectURL(new Blob([pictureSvg(lines)], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'my-picture.svg'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
