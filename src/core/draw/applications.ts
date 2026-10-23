import { assertCapabilityGraph, type CapabilityGraph } from '../capability/graph';
import { runSavedDrawCapability } from '../capability/drawReuse';
import { MAX_PREVIEW_POINTS, MAX_PREVIEW_STAMPS } from './preview';
import { DrawDocument, DrawToolApplication } from './schema';
import type { DrawPreview } from './preview';

export function appendToolApplication(drawing: DrawDocument, application: DrawToolApplication): DrawDocument {
  return DrawDocument.parse({ ...drawing, revision: drawing.revision + 1,
    applications: [...(drawing.applications ?? []), DrawToolApplication.parse(application)],
    updatedAt: application.createdAt });
}

/** Replays pinned, approved versions. Deleted/missing graphs are disclosed, not reconstructed. */
export function renderToolApplications(drawing: DrawDocument, graphs: ReadonlyMap<string, CapabilityGraph>) {
  const strokes: DrawPreview['strokes'][number][] = [];
  const unavailable: string[] = [];
  let pointCount = 0;
  for (const application of drawing.applications ?? []) {
    try {
      const raw = graphs.get(application.toolId);
      if (!raw) throw new Error('missing tool');
      const graph = assertCapabilityGraph(raw);
      if (graph.tool.toolId !== application.toolId) throw new Error('wrong tool');
      const version = graph.versions.find(item => item.versionId === application.versionId);
      if (version?.kind !== 'draw_pattern') throw new Error('missing version');
      const snapshot = graph.snapshots.find(item => item.snapshotId === version.markSnapshotId);
      if (!snapshot) throw new Error('missing mark');
      const result = runSavedDrawCapability({ snapshot, version, pathId: 'draw_path_picture_application', path: application.path });
      const points = result.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
      if (pointCount + points > MAX_PREVIEW_POINTS || strokes.length + result.strokes.length > MAX_PREVIEW_STAMPS * 32) throw new Error('picture budget');
      pointCount += points;
      strokes.push(...result.strokes.map(stroke => ({ ...stroke, previewStrokeId: `${application.applicationId}_${stroke.previewStrokeId}` })));
    } catch { unavailable.push(application.applicationId); }
  }
  return { strokes, unavailable, pointCount };
}
