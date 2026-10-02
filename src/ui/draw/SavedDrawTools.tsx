'use client';

import Link from 'next/link';
import { pointerPoint } from './pointerPoint';
import { type PointerEvent, useEffect, useRef, useState } from 'react';

import { openBrowserDrawAssets } from '../../adapters/persistence';
import { runSavedDrawCapability } from '../../core/capability';
import { DRAW_HEIGHT, DRAW_WIDTH, samplePoint } from '../../core/draw';
import type { DrawPoint, DrawPreview } from '../../core/draw';
import type { MarkSnapshot } from '../../core/draw/schema';
import type { DrawCapabilityVersion } from '../../core/capability/types';
import type { CapabilityDefinition } from '../../core/capability/types';

import styles from './SavedDrawTools.module.css';

const DRAW_OWNER_ID = 'child_local_01';

type SavedDrawTool = Readonly<{
  definition: CapabilityDefinition;
  version: DrawCapabilityVersion;
  snapshot: MarkSnapshot;
}>;

function pointFromEvent(event: PointerEvent<SVGSVGElement>): DrawPoint {
  return pointerPoint(event.currentTarget, event.clientX, event.clientY);
}

function renderStroke(stroke: { readonly previewStrokeId?: string; readonly strokeId?: string; readonly points: readonly DrawPoint[]; readonly color: string; readonly width: number }, opacity = 1) {
  const key = stroke.previewStrokeId ?? stroke.strokeId ?? 'stroke';
  if (stroke.points.length === 1) {
    return <circle key={key} cx={stroke.points[0]!.x} cy={stroke.points[0]!.y} r={Math.max(1, stroke.width / 2)} fill={stroke.color} opacity={opacity} />;
  }
  return <polyline key={key} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
}

export function SavedDrawTools() {
  const [tools, setTools] = useState<readonly SavedDrawTool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [path, setPath] = useState<readonly DrawPoint[]>([]);
  const [draftPath, setDraftPath] = useState<readonly DrawPoint[] | null>(null);
  const [preview, setPreview] = useState<DrawPreview | null>(null);
  const [status, setStatus] = useState('Opening your saved tools…');
  const [error, setError] = useState<string | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let close: (() => void) | undefined;
    void (async () => {
      const opened = await openBrowserDrawAssets();
      close = opened.close;
      const definitions = (await opened.capabilities.listDefinitionsByOwner(DRAW_OWNER_ID))
        .filter((definition) => definition.kind === 'draw_pattern' && definition.currentVersionId !== null);
      const resolved = await Promise.all(definitions.map(async (definition) => {
        const version = await opened.capabilities.getDrawVersion(definition.currentVersionId!);
        if (version === null) return null;
        const snapshot = await opened.drawAssets.getMarkSnapshot(version.markSnapshotId);
        return snapshot === null ? null : { definition, version, snapshot } satisfies SavedDrawTool;
      }));
      if (cancelled) return;
      const loaded = resolved.filter((tool): tool is SavedDrawTool => tool !== null);
      setTools(loaded);
      setSelectedToolId(loaded[0]?.definition.toolId ?? null);
      setStatus(loaded.length === 0 ? 'No saved Draw tools yet.' : 'Pick a saved tool, then draw a new path for it.');
    })().catch(() => {
      if (!cancelled) {
        setError('Your saved tools could not be opened. Reload to try again.');
        setStatus('Nothing was changed.');
      }
    });
    return () => { cancelled = true; close?.(); };
  }, []);

  const selected = tools.find((tool) => tool.definition.toolId === selectedToolId) ?? null;
  const livePath = draftPath ?? path;

  function chooseTool(toolId: string): void {
    setSelectedToolId(toolId);
    setPreview(null);
    setStatus('This tool stays exactly as it was saved. Draw a fresh path to use it.');
    setError(null);
  }

  function startPath(event: PointerEvent<SVGSVGElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    setDraftPath([pointFromEvent(event)]);
    setPreview(null);
    setError(null);
    setStatus('Keep dragging to show where this saved mark should travel.');
  }

  function extendPath(event: PointerEvent<SVGSVGElement>): void {
    if (!drawing.current) return;
    // React clears its synthetic event after this handler. Read the coordinate before queuing
    // state work, otherwise a real drag can dereference a cleared currentTarget.
    const point = pointFromEvent(event);
    setDraftPath((current) => current === null ? current : samplePoint(current, point, 4));
  }

  function finishPath(event: PointerEvent<SVGSVGElement>): void {
    if (!drawing.current) return;
    drawing.current = false;
    const completed = samplePoint(draftPath ?? [], pointFromEvent(event), 0);
    setDraftPath(null);
    setPath(completed);
    setStatus(completed.length >= 2 ? 'New path ready. Apply your saved tool whenever you are ready.' : 'Make a longer path with one smooth drag.');
  }

  function applySavedTool(): void {
    if (selected === null) return;
    try {
      const result = runSavedDrawCapability({
        snapshot: selected.snapshot,
        version: selected.version,
        pathId: 'draw_reuse_path_local_001',
        path,
      });
      setPreview(result);
      setError(null);
      setStatus(`Applied locally: ${result.stampCount} repeats from your original mark. Kale was not asked.`);
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? caught.message : 'This tool could not be applied yet.');
    }
  }

  if (tools.length === 0 && error === null) {
    return (
      <section className={styles.empty} aria-labelledby="saved-draw-title">
        <p className={styles.eyebrow}>Your saved Draw tools</p>
        <h2 id="saved-draw-title">A mark becomes useful after you save it.</h2>
        <p>Make one small mark, choose it, try it on a path, and approve it. It will appear here as a tool you can use later without asking Kale again.</p>
        <Link href="/draw" className={styles.primary}>Make a Draw tool</Link>
        <p role="status">{status}</p>
      </section>
    );
  }

  return (
    <section className={styles.library} aria-labelledby="saved-draw-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Your saved Draw tools</p>
          <h2 id="saved-draw-title">Use something you already made.</h2>
          <p>These tools keep your original mark and your approved settings. A new path is the only thing you add today.</p>
        </div>
        <Link href="/draw" className={styles.quietLink}>Make another tool</Link>
      </header>

      <div className={styles.layout}>
        <aside className={styles.toolList} aria-label="Saved Draw tools">
          {tools.map((tool) => (
            <button key={tool.definition.toolId} type="button" className={styles.toolCard} data-selected={selected?.definition.toolId === tool.definition.toolId} onClick={() => chooseTool(tool.definition.toolId)}>
              <svg viewBox="0 0 100 70" aria-hidden="true">{tool.snapshot.strokes.map((stroke) => renderStroke({ ...stroke, points: stroke.points.map((point) => ({ x: point.x / 8, y: point.y / 8 })) }))}</svg>
              <span><b>{tool.definition.displayName}</b><small>Version {tool.version.version} · your original mark</small></span>
            </button>
          ))}
        </aside>

        <div className={styles.workspace}>
          <div className={styles.instruction}>
            <span>1</span><p><b>Draw a new path.</b> This is only where the tool will go; it cannot change the tool you saved.</p>
            <button type="button" onClick={() => { setPath([]); setDraftPath(null); setPreview(null); setStatus('Path cleared. Draw a fresh path.'); }}>Clear path</button>
          </div>
          <svg className={styles.canvas} viewBox={`0 0 ${DRAW_WIDTH} ${DRAW_HEIGHT}`} role="img" aria-label="New path canvas. Drag to draw where the saved mark should repeat." onPointerDown={startPath} onPointerMove={extendPath} onPointerUp={finishPath} onPointerCancel={finishPath}>
            <rect x="0" y="0" width={DRAW_WIDTH} height={DRAW_HEIGHT} rx="26" className={styles.paper} />
            {livePath.length >= 2 ? <polyline points={livePath.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#a65636" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 10" /> : null}
            {preview?.strokes.map((stroke) => renderStroke(stroke, .82))}
            {path.length < 2 && draftPath === null ? <text x="400" y="275" textAnchor="middle" className={styles.canvasHint}>Drag a fresh path here</text> : null}
          </svg>
          <div className={styles.applyBar}>
            <div><b>{selected?.definition.displayName ?? 'Choose a tool'}</b><span>{selected === null ? 'Choose a saved tool first.' : `Uses your saved Version ${selected.version.version}; no AI call.`}</span></div>
            <button className={styles.primary} type="button" disabled={selected === null || path.length < 2} onClick={applySavedTool}>Use on this path</button>
          </div>
          {selected !== null ? <div className={styles.provenance}><b>Your original mark remains the source.</b><span>Saved from version {selected.version.version} · selected mark snapshot {selected.snapshot.snapshotId}</span><Link href={`/parent/tools?tool=${encodeURIComponent(selected.definition.toolId)}`}>Show how this became a tool →</Link></div> : null}
        </div>
      </div>
      <p className={styles.status} role="status">{status}</p>
      {error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
