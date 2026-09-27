'use client';

import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react';

import { openBrowserDrawAssets } from '../../adapters/persistence';
import {
  appendStroke,
  clearStrokes,
  clearMarkSelection,
  createDrawDocument,
  DRAW_HEIGHT,
  DRAW_WIDTH,
  hitTestStroke,
  isMarkSelectionCurrent,
  isUsableGuidePath,
  PRACTICE_DRAGON_STROKES,
  removeLastStroke,
  restoreStroke,
  samplePoint,
  setGuidePath,
  setMarkSelection,
  withDrawSourceDigest,
} from '../../core/draw';
import type { DrawDocument, DrawPoint, DrawStroke } from '../../core/draw';
import type { DrawAssetRepository } from '../../core/ports/repositories';

import styles from './DrawWorkbench.module.css';

const DRAW_OWNER_ID = 'child_local_01';
const PRACTICE_ID = 'draw_document_practice_001';
const BLANK_ID = 'draw_document_canvas_001';
const PALETTE = ['#294f46', '#c45b3f', '#5c55a6', '#15737c', '#d18827'] as const;

type Mode = 'choose' | 'workbench';
type ToolMode = 'draw' | 'select' | 'path';

function timestamp(): string {
  return new Date().toISOString();
}

function nextStrokeId(): string {
  return `stroke_draw_${Date.now().toString(36)}`;
}

function pointFromEvent(event: PointerEvent<SVGSVGElement>): DrawPoint {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(DRAW_WIDTH, ((event.clientX - bounds.left) / bounds.width) * DRAW_WIDTH)),
    y: Math.max(0, Math.min(DRAW_HEIGHT, ((event.clientY - bounds.top) / bounds.height) * DRAW_HEIGHT)),
  };
}

export function DrawWorkbench() {
  const [mode, setMode] = useState<Mode>('choose');
  const [document, setDocument] = useState<DrawDocument | null>(null);
  const [draftStroke, setDraftStroke] = useState<DrawStroke | null>(null);
  const [guideDraft, setGuideDraft] = useState<readonly DrawPoint[] | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('draw');
  const [redo, setRedo] = useState<readonly DrawStroke[]>([]);
  const [color, setColor] = useState<(typeof PALETTE)[number]>('#294f46');
  const [width, setWidth] = useState(7);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Opening your drawing desk…');
  const [error, setError] = useState<string | null>(null);
  const repository = useRef<DrawAssetRepository | null>(null);
  const documentRef = useRef<DrawDocument | null>(null);
  const draftRef = useRef<DrawStroke | null>(null);
  const guideRef = useRef<readonly DrawPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let close: (() => void) | null = null;
    void (async () => {
      const opened = await openBrowserDrawAssets();
      close = opened.close;
      repository.current = opened.drawAssets;
      const documents = await repository.current.listDocumentsByOwner(DRAW_OWNER_ID);
      if (cancelled) return;
      const latest = documents.at(-1) ?? null;
      if (latest !== null) {
        documentRef.current = latest;
        setDocument(latest);
        setMode('workbench');
        setStatus('Your drawing is right where you left it.');
      } else {
        setStatus(opened.durable ? 'Choose a starting point. Your drawing stays on this device.' : 'This browser preview cannot keep local data after refresh. Your drawing is still fully interactive.');
      }
      setReady(true);
    })().catch(() => {
      if (!cancelled) setError('Your drawing desk could not open. Reload to try again; no work has been changed.');
    });
    return () => {
      cancelled = true;
      close?.();
    };
  }, []);

  async function persist(next: DrawDocument, savedMessage: string): Promise<void> {
    try {
      const withDigest = await withDrawSourceDigest(next);
      await repository.current?.saveDocument(withDigest);
      if (documentRef.current?.revision === next.revision) {
        documentRef.current = withDigest;
        setDocument(withDigest);
      }
      setStatus(savedMessage);
      setError(null);
    } catch {
      setError('We could not save that stroke yet. Keep drawing is safe; try again in a moment.');
    }
  }

  function setActive(next: DrawDocument): void {
    documentRef.current = next;
    setDocument(next);
  }

  async function start(kind: 'practice' | 'blank'): Promise<void> {
    const created = createDrawDocument({
      documentId: kind === 'practice' ? PRACTICE_ID : BLANK_ID,
      ownerChildId: DRAW_OWNER_ID,
      now: timestamp(),
      strokes: kind === 'practice' ? PRACTICE_DRAGON_STROKES : [],
    });
    setActive(created);
    setRedo([]);
    setMode('workbench');
    setStatus(kind === 'practice' ? 'Practice drawing loaded. Every line is still yours to change.' : 'A blank page is ready for your mark.');
    await persist(created, kind === 'practice' ? 'Practice drawing saved on this device.' : 'Blank drawing saved on this device.');
  }

  function startStroke(event: PointerEvent<SVGSVGElement>): void {
    if (document === null || event.button !== 0) return;
    if (toolMode === 'select') {
      const stroke = hitTestStroke(document.strokes, pointFromEvent(event), 18);
      if (stroke === null) {
        setStatus('Tap a line you made. The practice scale is one small orange diamond.');
        return;
      }
      const next = setMarkSelection(document, [stroke.strokeId], timestamp());
      setActive(next);
      void persist(next, 'That mark is yours. Now show where it should travel.');
      setToolMode('path');
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    if (toolMode === 'path') {
      const points = [pointFromEvent(event)];
      guideRef.current = points;
      setGuideDraft(points);
      setStatus('Draw the direction: start here, end there.');
      return;
    }
    const stroke: DrawStroke = {
      strokeId: nextStrokeId(),
      color,
      width,
      points: [pointFromEvent(event)],
    };
    draftRef.current = stroke;
    setDraftStroke(stroke);
    setStatus('Drawing…');
  }

  function extendStroke(event: PointerEvent<SVGSVGElement>): void {
    if (toolMode === 'path') {
      const activePath = guideRef.current;
      if (activePath === null) return;
      const nextPath = samplePoint(activePath, pointFromEvent(event), 3);
      guideRef.current = nextPath;
      setGuideDraft(nextPath);
      return;
    }
    const active = draftRef.current;
    if (active === null) return;
    const next = { ...active, points: samplePoint(active.points, pointFromEvent(event)) };
    draftRef.current = next;
    setDraftStroke(next);
  }

  function finishStroke(event: PointerEvent<SVGSVGElement>): void {
    if (toolMode === 'path') {
      const activePath = guideRef.current;
      guideRef.current = null;
      setGuideDraft(null);
      if (documentRef.current === null || activePath === null) return;
      if (!isUsableGuidePath(activePath)) {
        setStatus('Make that path a little longer so its direction is clear.');
        return;
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      const next = setGuidePath(documentRef.current, { pathId: 'draw_path_workbench_001', points: [...activePath] }, timestamp());
      setActive(next);
      void persist(next, 'Path saved. It starts at the dot and ends at the arrow.');
      setToolMode('draw');
      return;
    }
    const active = draftRef.current;
    if (active === null || documentRef.current === null) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    draftRef.current = null;
    setDraftStroke(null);
    const next = appendStroke(documentRef.current, active, timestamp());
    setActive(next);
    setRedo([]);
    void persist(next, 'Stroke saved locally.');
  }

  function cancelStroke(event: PointerEvent<SVGSVGElement>): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    draftRef.current = null;
    setDraftStroke(null);
    guideRef.current = null;
    setGuideDraft(null);
    setStatus('That unfinished stroke was left out.');
  }

  function undo(): void {
    if (documentRef.current === null) return;
    const last = documentRef.current.strokes.at(-1);
    const next = removeLastStroke(documentRef.current, timestamp());
    if (next === null || last === undefined) return;
    setActive(next);
    setRedo((items) => [...items, last]);
    void persist(next, 'Last stroke removed.');
  }

  function redoStroke(): void {
    if (documentRef.current === null) return;
    const stroke = redo.at(-1);
    if (stroke === undefined) return;
    const next = restoreStroke(documentRef.current, stroke, timestamp());
    setActive(next);
    setRedo((items) => items.slice(0, -1));
    void persist(next, 'Stroke returned.');
  }

  function clear(): void {
    if (documentRef.current === null) return;
    const next = clearStrokes(documentRef.current, timestamp());
    if (next === null) return;
    setActive(next);
    setRedo([]);
    void persist(next, 'Canvas cleared. Your earlier version is not saved as a tool.');
  }

  function changeMark(): void {
    if (documentRef.current === null) return;
    const next = clearMarkSelection(documentRef.current, timestamp());
    setActive(next);
    setToolMode('select');
    void persist(next, 'Tap the exact mark you want to use.');
  }

  if (mode === 'choose') {
    return (
      <section className={styles.choose} aria-labelledby="draw-start-title">
        <p className={styles.eyebrow}>Make a tool from a mark you make</p>
        <h2 id="draw-start-title">Start with something you can point to.</h2>
        <p>Draw freely, or open a practice dragon. Later, you’ll choose one mark and show where it should travel. Kale will never replace your drawing.</p>
        <div className={styles.choiceGrid}>
          <button type="button" className={styles.choice} disabled={!ready} onClick={() => { void start('practice'); }}>
            <span className={styles.choiceArt} aria-hidden="true">◈</span>
            <strong>Practice dragon</strong>
            <small>Try a tiny scale on an editable drawing.</small>
          </button>
          <button type="button" className={styles.choice} disabled={!ready} onClick={() => { void start('blank'); }}>
            <span className={styles.choiceArt} aria-hidden="true">✦</span>
            <strong>Blank drawing</strong>
            <small>Start with your own mark from the first line.</small>
          </button>
        </div>
        <p className={styles.localNote}>Saved only on this device · no AI looks at this drawing</p>
        <p className={styles.status} role="status">{status}</p>
        {error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
      </section>
    );
  }

  const strokes = document === null ? [] : [...document.strokes, ...(draftStroke === null ? [] : [draftStroke])];
  const selectionCurrent = document !== null && isMarkSelectionCurrent(document);
  const selectedIds = selectionCurrent ? new Set(document.selection?.strokeIds ?? []) : new Set<string>();
  const pathPoints = guideDraft ?? document?.guidePath?.points ?? [];
  return (
    <section className={styles.workbench} aria-labelledby="draw-workbench-title">
      <header className={styles.workbenchHeader}>
        <div>
          <p className={styles.eyebrow}>Your source drawing</p>
          <h2 id="draw-workbench-title">Draw a mark you want to use again.</h2>
        </div>
        <button className={styles.swap} type="button" onClick={() => setMode('choose')}>Choose another start</button>
      </header>

      <div className={styles.stage}>
        <aside className={styles.dock} aria-label="Drawing tools">
          <div className={styles.steps} aria-label="Make this tool steps">
            <button type="button" data-active={toolMode === 'draw'} onClick={() => setToolMode('draw')}>
              <span>1</span> Draw
            </button>
            <button type="button" data-active={toolMode === 'select'} onClick={() => setToolMode('select')}>
              <span>2</span> Pick a mark
            </button>
            <button type="button" data-active={toolMode === 'path'} disabled={!selectionCurrent} onClick={() => setToolMode('path')}>
              <span>3</span> Show its path
            </button>
          </div>
          <p className={styles.modePrompt}>
            {toolMode === 'draw' ? 'Add or change your source drawing.' : toolMode === 'select' ? 'Tap exactly the mark you made.' : 'Drag from where the pattern starts to where it ends.'}
          </p>
          <div>
            <p className={styles.toolLabel}>Ink</p>
            <div className={styles.palette}>
              {PALETTE.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={styles.swatch}
                  data-selected={color === value}
                  style={{ '--swatch': value } as CSSProperties}
                  aria-label={`Use ${value} ink`}
                  aria-pressed={color === value}
                  onClick={() => setColor(value)}
                />
              ))}
            </div>
          </div>
          <label className={styles.width}>
            <span>Line weight <b>{width}</b></span>
            <input aria-label="Line weight" type="range" min="3" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} />
          </label>
          <div className={styles.history}>
            <button type="button" onClick={undo} disabled={(document?.strokes.length ?? 0) === 0}>Undo</button>
            <button type="button" onClick={redoStroke} disabled={redo.length === 0}>Redo</button>
            <button type="button" onClick={clear} disabled={(document?.strokes.length ?? 0) === 0}>Clear</button>
          </div>
          <div className={styles.selectionCard} data-stale={document?.selection !== undefined && !selectionCurrent}>
            <b>{selectionCurrent ? 'Your selected mark' : document?.selection !== undefined ? 'Your mark changed' : 'No mark selected yet'}</b>
            <span>{selectionCurrent ? 'Kept in your drawing. Nothing has been copied or saved as a tool.' : document?.selection !== undefined ? 'You changed the source drawing. Pick the mark again before using it.' : 'Pick a source mark when you are ready.'}</span>
            <button type="button" onClick={changeMark}>{selectionCurrent ? 'Change mark' : 'Pick a mark'}</button>
          </div>
          <p className={styles.layerNote}><b>Source</b> is your drawing. Guide and preview layers arrive later—and will never change it.</p>
        </aside>

        <div className={styles.canvasFrame}>
          <svg
            className={styles.canvas}
            viewBox={`0 0 ${DRAW_WIDTH} ${DRAW_HEIGHT}`}
            role="img"
            aria-label="Your vector drawing surface. Drag to add a line."
            onPointerDown={startStroke}
            onPointerMove={extendStroke}
            onPointerUp={finishStroke}
            onPointerCancel={cancelStroke}
            onPointerLeave={(event) => { if (draftRef.current !== null && event.buttons === 0) cancelStroke(event); }}
          >
            <defs>
              <marker id="guide-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 12 6 L 0 12 z" fill="#a65636" />
              </marker>
            </defs>
            <rect x="0" y="0" width={DRAW_WIDTH} height={DRAW_HEIGHT} rx="26" className={styles.canvasPaper} />
            <g data-layer="source" aria-label="Your source marks">
              {strokes.filter((stroke) => selectedIds.has(stroke.strokeId)).map((stroke) => (
                <polyline key={`highlight-${stroke.strokeId}`} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#8bd5c0" strokeWidth={stroke.width + 14} strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
              ))}
              {strokes.map((stroke) => (
                <polyline
                  key={stroke.strokeId}
                  points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
                  fill="none"
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>
            <g data-layer="guide" aria-label="Child-directed guide path">
              {pathPoints.length >= 2 ? <polyline points={pathPoints.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#a65636" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="13 10" markerEnd="url(#guide-arrow)" /> : null}
              {pathPoints[0] !== undefined ? <><circle cx={pathPoints[0].x} cy={pathPoints[0].y} r="10" fill="#fffdf7" stroke="#a65636" strokeWidth="5" /><text x={pathPoints[0].x + 15} y={pathPoints[0].y - 14} fill="#8d432d" fontSize="20" fontWeight="700">starts here</text></> : null}
              {pathPoints.at(-1) !== undefined && pathPoints.length >= 2 ? <text x={pathPoints.at(-1)!.x + 15} y={pathPoints.at(-1)!.y + 28} fill="#8d432d" fontSize="20" fontWeight="700">ends here</text> : null}
            </g>
            <g data-layer="derived-preview" aria-hidden="true" />
          </svg>
          {document?.strokes.length === 0 && draftStroke === null ? <p className={styles.emptyCanvas}>Make one little mark. It can become something useful later.</p> : null}
        </div>
      </div>

      <footer className={styles.footer}>
        <p><span aria-hidden="true">●</span> {document?.strokes.length ?? 0} marks · source hash {document?.contentDigest.slice(0, 10) ?? '…'}…</p>
        <p role="status">{status}</p>
      </footer>
      {error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
