import { z } from 'zod';

import type { DrawDocument, DrawGuidePath, DrawMarkSelection, DrawPoint, DrawStroke } from './schema';
import { DrawDocument as DrawDocumentSchema } from './schema';
import { Sha256Digest } from '../schema/primitives';

export const DRAW_WIDTH = 800;
export const DRAW_HEIGHT = 560;
export const MAX_POINTS_PER_STROKE = 2048;
export const MAX_STROKES_PER_DOCUMENT = 512;

export const EMPTY_DRAW_DIGEST = '0'.repeat(64) as z.infer<typeof Sha256Digest>;

/**
 * Practice is just ordinary editable vector work. It has no privileged semantic label such as
 * “tail”; the child will choose a mark and a path explicitly in later phases.
 */
export const PRACTICE_DRAGON_STROKES: readonly DrawStroke[] = [
  {
    strokeId: 'stroke_dragon_outline_001',
    color: '#294f46',
    width: 7,
    points: [
      { x: 140, y: 300 }, { x: 190, y: 220 }, { x: 285, y: 180 }, { x: 390, y: 195 },
      { x: 470, y: 155 }, { x: 550, y: 205 }, { x: 610, y: 188 }, { x: 650, y: 235 },
      { x: 620, y: 275 }, { x: 670, y: 318 }, { x: 616, y: 340 }, { x: 570, y: 410 },
      { x: 490, y: 438 }, { x: 400, y: 405 }, { x: 335, y: 435 }, { x: 250, y: 402 },
      { x: 188, y: 355 }, { x: 140, y: 300 },
    ],
  },
  {
    strokeId: 'stroke_dragon_wing_001',
    color: '#294f46',
    width: 6,
    points: [{ x: 315, y: 220 }, { x: 350, y: 92 }, { x: 425, y: 235 }, { x: 470, y: 155 }],
  },
  {
    strokeId: 'stroke_dragon_eye_001',
    color: '#c45b3f',
    width: 8,
    points: [{ x: 575, y: 240 }, { x: 584, y: 236 }, { x: 592, y: 241 }],
  },
  {
    strokeId: 'stroke_scale_001',
    color: '#c45b3f',
    width: 6,
    points: [{ x: 376, y: 300 }, { x: 389, y: 288 }, { x: 402, y: 300 }, { x: 389, y: 313 }, { x: 376, y: 300 }],
  },
  {
    strokeId: 'stroke_scale_002',
    color: '#c45b3f',
    width: 6,
    points: [{ x: 420, y: 325 }, { x: 433, y: 313 }, { x: 446, y: 325 }, { x: 433, y: 338 }, { x: 420, y: 325 }],
  },
  {
    strokeId: 'stroke_scale_003',
    color: '#c45b3f',
    width: 6,
    points: [{ x: 462, y: 342 }, { x: 475, y: 330 }, { x: 488, y: 342 }, { x: 475, y: 355 }, { x: 462, y: 342 }],
  },
];

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
}

export async function digestDrawSource(drawing: DrawDocument): Promise<z.infer<typeof Sha256Digest>> {
  const source = {
    documentId: drawing.documentId,
    ownerChildId: drawing.ownerChildId,
    width: drawing.width,
    height: drawing.height,
    strokes: drawing.strokes,
  };
  const bytes = new TextEncoder().encode(canonicalize(source));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Sha256Digest.parse(Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join(''));
}

export async function withDrawSourceDigest(drawing: DrawDocument): Promise<DrawDocument> {
  return DrawDocumentSchema.parse({ ...drawing, contentDigest: await digestDrawSource(drawing) });
}

export function createDrawDocument(input: {
  readonly documentId: DrawDocument['documentId'];
  readonly ownerChildId: DrawDocument['ownerChildId'];
  readonly now: DrawDocument['createdAt'];
  readonly strokes?: readonly DrawStroke[];
}): DrawDocument {
  return DrawDocumentSchema.parse({
    documentId: input.documentId,
    ownerChildId: input.ownerChildId,
    width: DRAW_WIDTH,
    height: DRAW_HEIGHT,
    revision: 1,
    strokes: input.strokes === undefined ? [] : [...input.strokes],
    contentDigest: EMPTY_DRAW_DIGEST,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function appendStroke(drawing: DrawDocument, stroke: DrawStroke, updatedAt: string): DrawDocument {
  if (drawing.strokes.length >= MAX_STROKES_PER_DOCUMENT) {
    throw new Error('This drawing has reached its stroke limit. Undo one line before adding another.');
  }
  return DrawDocumentSchema.parse({
    ...drawing,
    revision: drawing.revision + 1,
    strokes: [...drawing.strokes, stroke],
    updatedAt,
  });
}

export function removeLastStroke(drawing: DrawDocument, updatedAt: string): DrawDocument | null {
  if (drawing.strokes.length === 0) return null;
  return DrawDocumentSchema.parse({
    ...drawing,
    revision: drawing.revision + 1,
    strokes: drawing.strokes.slice(0, -1),
    updatedAt,
  });
}

export function restoreStroke(drawing: DrawDocument, stroke: DrawStroke, updatedAt: string): DrawDocument {
  return appendStroke(drawing, stroke, updatedAt);
}

export function clearStrokes(drawing: DrawDocument, updatedAt: string): DrawDocument | null {
  if (drawing.strokes.length === 0) return null;
  return DrawDocumentSchema.parse({ ...drawing, revision: drawing.revision + 1, strokes: [], updatedAt });
}

export function setMarkSelection(
  drawing: DrawDocument,
  strokeIds: readonly string[],
  selectedAt: string,
): DrawDocument {
  const unique = [...new Set(strokeIds)];
  const known = new Set(drawing.strokes.map((stroke) => stroke.strokeId));
  if (unique.length === 0 || unique.some((id) => !known.has(id))) {
    throw new Error('Choose a mark from this drawing before continuing.');
  }
  const selection: DrawMarkSelection = {
    strokeIds: unique as DrawMarkSelection['strokeIds'],
    sourceDigest: drawing.contentDigest,
    selectedAt,
  };
  return DrawDocumentSchema.parse({ ...drawing, selection, revision: drawing.revision + 1, updatedAt: selectedAt });
}

export function clearMarkSelection(drawing: DrawDocument, updatedAt: string): DrawDocument {
  return DrawDocumentSchema.parse({ ...drawing, selection: undefined, revision: drawing.revision + 1, updatedAt });
}

export function setGuidePath(
  drawing: DrawDocument,
  path: { readonly pathId: DrawGuidePath['pathId']; readonly points: readonly DrawPoint[] },
  updatedAt: string,
): DrawDocument {
  const previous = drawing.guidePath;
  const guidePath: DrawGuidePath = {
    pathId: path.pathId,
    points: [...path.points],
    revision: (previous?.revision ?? 0) + 1,
    createdAt: previous?.createdAt ?? updatedAt,
    updatedAt,
  };
  return DrawDocumentSchema.parse({ ...drawing, guidePath, revision: drawing.revision + 1, updatedAt });
}

export function isMarkSelectionCurrent(drawing: DrawDocument): boolean {
  return drawing.selection !== undefined && drawing.selection.sourceDigest === drawing.contentDigest;
}

export function samplePoint(points: readonly DrawPoint[], next: DrawPoint, minDistance: number = 1.5): DrawPoint[] {
  const last = points.at(-1);
  if (last === undefined) return [next];
  if (points.length >= MAX_POINTS_PER_STROKE) return [...points];
  const distance = Math.hypot(next.x - last.x, next.y - last.y);
  return distance >= minDistance ? [...points, next] : [...points];
}
