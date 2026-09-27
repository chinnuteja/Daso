import type { DrawDocument, DrawPoint, DrawStroke } from './schema';

import { isMarkSelectionCurrent } from './document';
import { isUsableGuidePath } from './interaction';

export const MAX_PREVIEW_STAMPS = 80;
export const MAX_PREVIEW_POINTS = 32_768;

/**
 * These controls are deliberately small. They are direct child-visible choices, not a hidden
 * interpretation of the drawing or its subject.
 */
export type DrawPreviewControls = Readonly<{
  spacing: number;
  startScale: number;
  endScale: number;
  followPath: boolean;
}>;

export const DEFAULT_DRAW_PREVIEW_CONTROLS: DrawPreviewControls = Object.freeze({
  spacing: 56,
  startScale: 1,
  endScale: 0.45,
  followPath: true,
});

export type DerivedPreviewStroke = Readonly<{
  previewStrokeId: string;
  sourceStrokeId: string;
  color: string;
  width: number;
  points: readonly DrawPoint[];
}>;

export type DrawPreview = Readonly<{
  sourceDigest: string;
  guidePathId: string;
  controls: DrawPreviewControls;
  stampCount: number;
  strokes: readonly DerivedPreviewStroke[];
}>;

type PathPlacement = Readonly<{ point: DrawPoint; angle: number; progress: number }>;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}

function normaliseControls(controls: Partial<DrawPreviewControls>): DrawPreviewControls {
  return {
    spacing: round(clamp(controls.spacing ?? DEFAULT_DRAW_PREVIEW_CONTROLS.spacing, 16, 240)),
    startScale: round(clamp(controls.startScale ?? DEFAULT_DRAW_PREVIEW_CONTROLS.startScale, 0.2, 2.5)),
    endScale: round(clamp(controls.endScale ?? DEFAULT_DRAW_PREVIEW_CONTROLS.endScale, 0.2, 2.5)),
    followPath: controls.followPath ?? DEFAULT_DRAW_PREVIEW_CONTROLS.followPath,
  };
}

function selectSourceStrokes(drawing: DrawDocument): readonly DrawStroke[] {
  if (!isMarkSelectionCurrent(drawing)) {
    throw new Error('Pick a current mark from your drawing before making a preview.');
  }
  const selected = new Set(drawing.selection?.strokeIds ?? []);
  return drawing.strokes.filter((stroke) => selected.has(stroke.strokeId));
}

function sourceCentre(strokes: readonly DrawStroke[]): DrawPoint {
  const points = strokes.flatMap((stroke) => stroke.points);
  if (points.length === 0) throw new Error('Pick a mark with at least one point before making a preview.');
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

function placements(points: readonly DrawPoint[], spacing: number): readonly PathPlacement[] {
  if (!isUsableGuidePath(points)) throw new Error('Show a longer path before making a preview.');
  const segments = points.slice(1).map((end, index) => {
    const start = points[index]!;
    return { start, end, length: Math.hypot(end.x - start.x, end.y - start.y) };
  }).filter((segment) => segment.length > 0);
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (total < 12) throw new Error('Show a longer path before making a preview.');
  const distances = [0];
  for (let distance = spacing; distance <= total && distances.length < MAX_PREVIEW_STAMPS; distance += spacing) {
    distances.push(distance);
  }
  if (distances.length === MAX_PREVIEW_STAMPS && distances.at(-1)! + spacing <= total) {
    throw new Error('That path would make too many repeats. Increase the spacing first.');
  }
  return distances.map((distance) => {
    let remaining = distance;
    const segment = segments.find((candidate) => {
      if (remaining <= candidate.length) return true;
      remaining -= candidate.length;
      return false;
    }) ?? segments.at(-1)!;
    const ratio = Math.min(1, remaining / segment.length);
    return {
      point: {
        x: round(segment.start.x + (segment.end.x - segment.start.x) * ratio),
        y: round(segment.start.y + (segment.end.y - segment.start.y) * ratio),
      },
      angle: Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x),
      progress: total === 0 ? 0 : distance / total,
    };
  });
}

function transformPoint(point: DrawPoint, centre: DrawPoint, placement: PathPlacement, scale: number, followPath: boolean): DrawPoint {
  const angle = followPath ? placement.angle : 0;
  const x = (point.x - centre.x) * scale;
  const y = (point.y - centre.y) * scale;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: round(placement.point.x + x * cos - y * sin),
    y: round(placement.point.y + x * sin + y * cos),
  };
}

/**
 * Pure local geometry: the output is derived from the selected source vectors and directed path.
 * It never writes a document, a capability, a version, or a ledger entry.
 */
export function buildDeterministicDrawPreview(
  drawing: DrawDocument,
  requestedControls: Partial<DrawPreviewControls> = {},
): DrawPreview {
  const sourceStrokes = selectSourceStrokes(drawing);
  const guidePath = drawing.guidePath;
  if (guidePath === undefined) throw new Error('Show where your mark should travel before making a preview.');
  const controls = normaliseControls(requestedControls);
  const route = placements(guidePath.points, controls.spacing);
  const totalPoints = route.length * sourceStrokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
  if (totalPoints > MAX_PREVIEW_POINTS) {
    throw new Error('That preview is too detailed to draw safely. Pick fewer marks or make the spacing wider.');
  }
  const centre = sourceCentre(sourceStrokes);
  const strokes = route.flatMap((placement, stampIndex) => {
    const scale = round(controls.startScale + (controls.endScale - controls.startScale) * placement.progress);
    return sourceStrokes.map((stroke) => ({
      previewStrokeId: `preview_${stampIndex + 1}_${stroke.strokeId}`,
      sourceStrokeId: stroke.strokeId,
      color: stroke.color,
      width: round(stroke.width * scale),
      points: stroke.points.map((point) => transformPoint(point, centre, placement, scale, controls.followPath)),
    }));
  });
  return {
    sourceDigest: drawing.contentDigest,
    guidePathId: guidePath.pathId,
    controls,
    stampCount: route.length,
    strokes,
  };
}
