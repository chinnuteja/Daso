export { DrawDocument, DrawPoint, DrawStroke, MarkSnapshot } from './schema';
export type {
  DrawDocument as DrawDocumentType,
  DrawPoint as DrawPointType,
  DrawStroke as DrawStrokeType,
  MarkSnapshot as MarkSnapshotType,
} from './schema';
export {
  appendStroke,
  clearStrokes,
  createDrawDocument,
  digestDrawSource,
  DRAW_HEIGHT,
  DRAW_WIDTH,
  PRACTICE_DRAGON_STROKES,
  removeLastStroke,
  restoreStroke,
  samplePoint,
  setGuidePath,
  setMarkSelection,
  clearMarkSelection,
  isMarkSelectionCurrent,
  withDrawSourceDigest,
} from './document';
export { distanceToSegment, hitTestStroke, isUsableGuidePath } from './interaction';
