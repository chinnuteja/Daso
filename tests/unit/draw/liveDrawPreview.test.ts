import { describe, expect, it, vi } from 'vitest';
import { createDrawDocument, setMarkSelection, DEFAULT_DRAW_PREVIEW_CONTROLS } from '../../../src/core/draw';
import { liveDrawPreview } from '../../../src/ui/draw/liveDrawPreview';

describe('Live child-directed repeat preview', () => {
  const blank = createDrawDocument({ documentId:'draw_document_live_001', ownerChildId:'child_local_01', now:'2026-10-12T00:00:00Z', strokes:[{ strokeId:'stroke_live_001', color:'#294f46', width:7, points:[{x:100,y:100},{x:120,y:110}] }] });
  const source = setMarkSelection(blank,['stroke_live_001'],'2026-10-12T00:00:01Z');
  it('requires an explicit child selection and a usable gesture', () => {
    expect(liveDrawPreview(blank,DEFAULT_DRAW_PREVIEW_CONTROLS,[{x:200,y:200},{x:500,y:200}])).toBeNull();
    expect(liveDrawPreview(source,DEFAULT_DRAW_PREVIEW_CONTROLS,[{x:200,y:200}])).toBeNull();
    expect(liveDrawPreview(source,DEFAULT_DRAW_PREVIEW_CONTROLS,null)).toBeNull();
  });
  it('changes immediately with the gesture, without editing the source or calling a model', () => {
    const fetchSpy = vi.fn(() => { throw new Error('No network'); });
    vi.stubGlobal('fetch',fetchSpy);
    try {
      const before = structuredClone(source);
      const path = [{x:200,y:200},{x:500,y:200}];
      const preview = liveDrawPreview(source,DEFAULT_DRAW_PREVIEW_CONTROLS,path)!;
      expect(preview.stampCount).toBeGreaterThan(1);
      expect(liveDrawPreview(source,DEFAULT_DRAW_PREVIEW_CONTROLS,[...path,{x:700,y:200}])!.stampCount).toBeGreaterThan(preview.stampCount);
      expect(liveDrawPreview(source,DEFAULT_DRAW_PREVIEW_CONTROLS,path)).toEqual(preview);
      expect(source).toEqual(before);
      expect(source.guidePath).toBeUndefined();
      expect(preview.strokes.every(stroke => stroke.sourceStrokeId === 'stroke_live_001')).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
  it('retains the geometry budget rather than masking an oversized gesture', () => {
    expect(() => liveDrawPreview(source,DEFAULT_DRAW_PREVIEW_CONTROLS,Array.from({length:2049},(_,i) => ({x:i%800,y:200})))).toThrow(/oversized/);
  });
});
