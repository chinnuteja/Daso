'use client';

import Link from 'next/link';
import { pointerPoint } from './pointerPoint';
import { KeyboardPath } from './KeyboardPath';
import { SourceMark } from './SourceMark';
import { assertCapabilityGraph } from '../../core/capability/graph';
import type { CapabilityLifecycleRepository } from '../../core/ports/repositories';
import { DRAW_PRACTICE_OWNER } from './practiceSession';
import { type PointerEvent, useEffect, useRef, useState } from 'react';

import { openBrowserDrawAssets } from '../../adapters/persistence';
import { runSavedDrawCapability } from '../../core/capability';
import { DRAW_HEIGHT, DRAW_WIDTH, samplePoint } from '../../core/draw';
import type { DrawPoint, DrawPreview } from '../../core/draw';
import type { MarkSnapshot } from '../../core/draw/schema';
import type { DrawCapabilityVersion } from '../../core/capability/types';
import type { CapabilityDefinition } from '../../core/capability/types';

import styles from './SavedDrawTools.module.css';
import polish from './ReusePolish.module.css';

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

export function SavedDrawTools({ embedded = false }: { embedded?: boolean } = {}) {
  const [tools, setTools] = useState<readonly SavedDrawTool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [path, setPath] = useState<readonly DrawPoint[]>([]);
  const [draftPath, setDraftPath] = useState<readonly DrawPoint[] | null>(null);
  const [preview, setPreview] = useState<DrawPreview | null>(null);
  const [status, setStatus] = useState('Opening your saved tools…');
  const [error, setError] = useState<string | null>(null);
  const drawing = useRef(false);
  const repository = useRef<CapabilityLifecycleRepository | null>(null);
  const applying = useRef(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadedSignature = useRef('');

  useEffect(() => {
    let cancelled = false;
    let close: (() => void) | undefined;
    let refresh: (() => void) | undefined;
    let channel: BroadcastChannel | undefined;
    let loadGeneration = 0;
    void (async () => {
      const opened = await openBrowserDrawAssets();
      close = opened.close;
      if (cancelled) { opened.close(); return; }
      const load = async () => {
      const requestGeneration = ++loadGeneration;
      const definitions = [...await opened.capabilities.listDefinitionsByOwner(DRAW_OWNER_ID), ...await opened.capabilities.listDefinitionsByOwner(DRAW_PRACTICE_OWNER)]
        .filter((definition) => definition.kind === 'draw_pattern' && definition.currentVersionId !== null);
      repository.current = opened.capabilities;
      const resolved = await Promise.all(definitions.map(async (definition) => {
        try {
          const raw = await opened.capabilities.getGraph(definition.toolId);
          if (raw === null) return null;
          const graph = assertCapabilityGraph(raw);
          const version = graph.versions.find((item) => item.versionId === graph.tool.currentVersionId);
          if (version?.kind !== 'draw_pattern') return null;
          const snapshot = graph.snapshots.find((item) => item.snapshotId === version.markSnapshotId);
          return snapshot === undefined ? null : { definition: graph.tool, version, snapshot } satisfies SavedDrawTool;
        } catch { return null; }
      }));
      if (cancelled || requestGeneration !== loadGeneration) return;
      const loaded = resolved.filter((tool): tool is SavedDrawTool => tool !== null);
      setLoading(false);
      const signature = JSON.stringify(loaded);
      const changed = loadedSignature.current !== signature;
      loadedSignature.current = signature;
      if (changed) {
        setTools(loaded);
        setSelectedToolId((current) => loaded.some((tool) => tool.definition.toolId === current) ? current : loaded.at(-1)?.definition.toolId ?? null);
        setPreview(null); setError(null);
        setStatus(loaded.length === 0 ? 'No saved Draw tools yet.' : 'Pick a saved tool, then draw a new path for it.');
      }
      if (loaded.length !== definitions.length) setError('A saved tool has missing records and cannot be used safely. Other verified tools are shown; we did not recreate the missing mark.');
      };
      await load();
      refresh = () => {
        void load().catch(() => { if (!cancelled) { setTools([]); setPreview(null); setLoading(false); setError('Saved records changed or could not be opened. Nothing was applied. Reload to try again.'); } });
      };
      window.addEventListener('focus', refresh); window.addEventListener('kale-data-changed', refresh);
      if (typeof BroadcastChannel !== 'undefined') { channel = new BroadcastChannel('kale-data-rights'); channel.onmessage = refresh; }
    })().catch(() => {
      if (!cancelled) {
        setLoading(false);
        setError('Your saved tools could not be opened. Reload to try again.');
        setStatus('Nothing was changed.');
      }
    });
    return () => { cancelled = true; loadGeneration++; repository.current = null; close?.(); channel?.close(); if (refresh) { window.removeEventListener('focus', refresh); window.removeEventListener('kale-data-changed', refresh); } };
  }, []);

  const selected = tools.find((tool) => tool.definition.toolId === selectedToolId) ?? null;
  const livePath = draftPath ?? path;

  function chooseTool(toolId: string): void {
    if (applying.current) return;
    setSelectedToolId(toolId);
    setPreview(null);
    setStatus('This tool stays exactly as it was saved. Draw a fresh path to use it.');
    setError(null);
  }

  function startPath(event: PointerEvent<SVGSVGElement>): void {
    if (event.button !== 0 || selected === null || applying.current) return;
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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const completed = samplePoint(draftPath ?? [], pointFromEvent(event), 0);
    setDraftPath(null);
    setPath(completed);
    setStatus(completed.length >= 2 ? 'New path ready. Apply your saved tool whenever you are ready.' : 'Make a longer path with one smooth drag.');
  }

  async function applySavedTool(): Promise<void> {
    if (selected === null || applying.current || repository.current === null) return;
    applying.current = true; setBusy(true);
    try {
      const raw = await repository.current.getGraph(selected.definition.toolId);
      if (raw === null) throw new Error('This tool was removed in another tab. Choose another saved tool or make a new one.');
      const graph = assertCapabilityGraph(raw);
      const version = graph.versions.find((item) => item.versionId === graph.tool.currentVersionId);
      if (version?.kind !== 'draw_pattern') throw new Error('The active saved version is missing.');
      const snapshot = graph.snapshots.find((item) => item.snapshotId === version.markSnapshotId);
      if (snapshot === undefined) throw new Error('The saved mark is missing. Nothing was recreated.');
      const fresh = { definition: graph.tool, version, snapshot };
      setTools((items) => items.map((item) => item.definition.toolId === fresh.definition.toolId ? fresh : item));
      const result = runSavedDrawCapability({
        snapshot,
        version,
        pathId: 'draw_reuse_path_local_001',
        path,
      });
      setPreview(result);
      setError(null);
      setStatus(`Applied locally: ${result.stampCount} repeats from your original mark. Kale was not asked.`);
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? caught.message : 'This tool could not be applied yet.');
    } finally { applying.current = false; setBusy(false); }
  }

  if (tools.length === 0 && error === null) {
    return (
      <section className={styles.empty} aria-labelledby="saved-draw-title">
        <p className={styles.eyebrow}>My stamps</p>
        <h2 id="saved-draw-title">{loading ? 'Opening your stamps…' : 'Your stamps will live here.'}</h2>
        {!loading ? <><p>Draw a piece. Make a stamp. Use it again!</p><Link href="/draw" className={styles.primary}>Draw my first stamp →</Link></> : null}
        <p role="status">{status}</p>
      </section>
    );
  }

  return (
    <section className={`${styles.library} ${polish.library}`} aria-labelledby="saved-draw-title">
      <header className={`${styles.header} ${polish.header}`}>
        <div>
          <p className={styles.eyebrow}>My stamps</p>
          <h2 id="saved-draw-title">Where will your stamp go?</h2>
          <p>Pick a stamp. Draw a trail.</p>
        </div>
        {!embedded ? <Link href="/draw" className={styles.quietLink}>Make another tool</Link> : null}
      </header>

      <div className={styles.layout}>
        <aside className={styles.toolList} aria-label="Saved Draw tools">
          {tools.map((tool) => (
            <button key={tool.definition.toolId} type="button" className={styles.toolCard} data-selected={selected?.definition.toolId === tool.definition.toolId} aria-pressed={selected?.definition.toolId === tool.definition.toolId} disabled={busy} onClick={() => chooseTool(tool.definition.toolId)}>
              <SourceMark strokes={tool.snapshot.strokes} label="Exact saved source mark" />
              <span><b>{tool.definition.displayName}</b><small>{tool.definition.ownerChildId === DRAW_PRACTICE_OWNER ? 'Practice piece · your choices' : 'Made from your drawing'}</small></span>
            </button>
          ))}
        </aside>

        <div className={`${styles.workspace} ${polish.workspace}`}>
          <div className={styles.instruction}>
            <span aria-hidden="true">↝</span><p><b>Draw a trail here.</b></p>
            <button type="button" disabled={busy} onClick={() => { setPath([]); setDraftPath(null); setPreview(null); setStatus('Path cleared. Draw a fresh path.'); }}>Clear path</button>
          </div>
          <svg className={`${styles.canvas} ${polish.canvas}`} viewBox={`0 0 ${DRAW_WIDTH} ${DRAW_HEIGHT}`} role="img" aria-label="New path canvas. Drag to draw where the saved mark should repeat." onPointerDown={startPath} onPointerMove={extendPath} onPointerUp={finishPath} onPointerCancel={() => { drawing.current = false; setDraftPath(null); setStatus('Unfinished path left out. Your saved tool is unchanged.'); }}>
            <rect x="0" y="0" width={DRAW_WIDTH} height={DRAW_HEIGHT} rx="26" className={styles.paper} />
            {livePath.length >= 2 ? <polyline points={livePath.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#a65636" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 10" /> : null}
            {preview?.strokes.map((stroke) => renderStroke(stroke, .82))}
            {path.length < 2 && draftPath === null ? <text x="400" y="275" textAnchor="middle" className={styles.canvasHint}>Draw a trail</text> : null}
          </svg>
          <KeyboardPath disabled={busy} onChoose={(points) => { setPath(points); setPreview(null); setStatus('You chose a new path. Apply your saved tool when ready.'); }} />
          <div className={styles.applyBar}>
            <div><b>{selected?.definition.displayName ?? 'Pick a stamp'}</b><span>{selected === null ? 'Pick one above.' : 'Your piece. Your saved look.'}</span></div>
            <button className={styles.primary} type="button" disabled={busy || selected === null || path.length < 2} onClick={() => { void applySavedTool(); }}>{busy ? 'Opening…' : 'Stamp here!'}</button>
          </div>
          {selected !== null ? <details className={styles.provenance}><summary>How I made it</summary><b>{selected.definition.ownerChildId === DRAW_PRACTICE_OWNER ? 'Practice mark · your approved behavior.' : 'Your original mark remains the source.'}</b><span>Saved version {selected.version.version} · runs locally without AI</span><Link href={`/parent/tools?tool=${encodeURIComponent(selected.definition.toolId)}`}>Show its story →</Link></details> : null}
        </div>
      </div>
      <p className={styles.status} role="status">{status}</p>
      {error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
