import { buildDeterministicDrawPreview, isMarkSelectionCurrent, isUsableGuidePath } from '../../core/draw';
import type { DrawDocument, DrawPoint, DrawPreview, DrawPreviewControls } from '../../core/draw';

/** A transient pointer path is only a preview, never a source edit or an approval. */
export function liveDrawPreview(document: DrawDocument, controls: DrawPreviewControls, draft: readonly DrawPoint[] | null): DrawPreview | null {
  if (!isMarkSelectionCurrent(document)) return null;
  if (draft !== null) {
    if (!isUsableGuidePath(draft)) return null;
    return buildDeterministicDrawPreview({ ...document, guidePath: { pathId: 'draw_path_pointer_preview', revision: document.guidePath?.revision ?? 1, points: [...draft], createdAt: document.updatedAt, updatedAt: document.updatedAt } }, controls);
  }
  return document.guidePath === undefined ? null : buildDeterministicDrawPreview(document, controls);
}
