'use client';

import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react';

import { openBrowserDrawAssets } from '../../adapters/persistence';
import { buildDrawApprovalBundle, digestCapabilityContext } from '../../core/capability';
import type { CapabilityLedgerEntry } from '../../core/capability/ledger';
import {
  appendStroke,
  buildDeterministicDrawPreview,
  clearStrokes,
  clearMarkSelection,
  createDrawDocument,
  DEFAULT_DRAW_PREVIEW_CONTROLS,
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
import type { DrawDocument, DrawPoint, DrawPreviewControls, DrawStroke } from '../../core/draw';
import type { CapabilityLifecycleRepository, DrawAssetRepository } from '../../core/ports/repositories';

import styles from './DrawWorkbench.module.css';

const DRAW_OWNER_ID = 'child_local_01';
const PRACTICE_ID = 'draw_document_practice_001';
const BLANK_ID = 'draw_document_canvas_001';
const PALETTE = ['#294f46', '#c45b3f', '#5c55a6', '#15737c', '#d18827'] as const;

type Mode = 'choose' | 'workbench';
type ToolMode = 'draw' | 'select' | 'path';

type AuthoritySession = Readonly<{
  toolId: string;
  snapshotId: string;
  candidateEventId: string;
  events: readonly CapabilityLedgerEntry[];
  proposal: Extract<Extract<CapabilityLedgerEntry, { type: 'capability_candidate' }>['proposal'], { kind: 'draw_pattern' }>;
  state: 'reviewing' | 'rejected' | 'saved';
}>;

function timestamp(): string {
  return new Date().toISOString();
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
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewControls, setPreviewControls] = useState<DrawPreviewControls>(DEFAULT_DRAW_PREVIEW_CONTROLS);
  const [authority, setAuthority] = useState<AuthoritySession | null>(null);
  const [toolName, setToolName] = useState('My repeating mark');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Opening your drawing desk…');
  const [error, setError] = useState<string | null>(null);
  const repository = useRef<DrawAssetRepository | null>(null);
  const capabilityRepository = useRef<CapabilityLifecycleRepository | null>(null);
  const documentRef = useRef<DrawDocument | null>(null);
  const draftRef = useRef<DrawStroke | null>(null);
  const guideRef = useRef<readonly DrawPoint[] | null>(null);
  const strokeCounter = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let close: (() => void) | null = null;
    void (async () => {
      const opened = await openBrowserDrawAssets();
      close = opened.close;
      repository.current = opened.drawAssets;
      capabilityRepository.current = opened.capabilities;
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
    const suffix = Date.now().toString(36);
    const created = createDrawDocument({
      documentId: kind === 'practice' ? `${PRACTICE_ID}_${suffix}` : `${BLANK_ID}_${suffix}`,
      ownerChildId: DRAW_OWNER_ID,
      now: timestamp(),
      strokes: kind === 'practice' ? PRACTICE_DRAGON_STROKES : [],
    });
    setActive(created);
    setRedo([]);
    setPreviewVisible(false);
    setAuthority(null);
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
      setPreviewVisible(false);
      setAuthority(null);
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
      strokeId: `stroke_draw_${Date.now().toString(36)}_${(++strokeCounter.current).toString(36)}`,
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
    setPreviewVisible(false);
    setAuthority(null);
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
    setPreviewVisible(false);
    setAuthority(null);
    void persist(next, 'Tap the exact mark you want to use.');
  }

  async function beginReview(): Promise<void> {
    if (document === null || !isMarkSelectionCurrent(document) || document.guidePath === undefined || capabilityRepository.current === null) return;
    const nonce = `${Date.now()}${(++strokeCounter.current).toString().padStart(2, '0')}`;
    const toolId = `my-repeat-${nonce}`;
    const snapshotId = `mark_snapshot_${nonce}`;
    const occurredAt = timestamp();
    const intentEventId = `event_${nonce}`;
    const candidateEventId = `event_${Number(nonce) + 1}`;
    const contextDigest = await digestCapabilityContext({ toolId, activeVersionId: null, ledgerSequence: 0, kind: 'draw_pattern', sourceDocumentId: document.documentId, sourceRevision: document.revision, selectedMarkSnapshotId: snapshotId, guidePathId: document.guidePath.pathId, guidePathRevision: document.guidePath.revision });
    const proposal = { type: 'propose_capability' as const, kind: 'draw_pattern' as const, operation: 'repeat_selected_mark' as const, spacing: 'even' as const, sizeProfile: 'smaller_toward_end' as const };
    const intent: CapabilityLedgerEntry = { type: 'child_intent', eventId: intentEventId, toolId, sequence: 1, occurredAt, actor: 'child', childWords: 'Repeat my selected mark along this path, smaller at the end.', contextDigest };
    const candidate: CapabilityLedgerEntry = { type: 'capability_candidate', eventId: candidateEventId, toolId, sequence: 2, occurredAt, actor: 'ai', sourceIntentEventId: intentEventId, proposal };
    try {
      await capabilityRepository.current.append(intent);
      await capabilityRepository.current.append(candidate);
      setAuthority({ toolId, snapshotId, candidateEventId, events: [intent, candidate], proposal, state: 'reviewing' });
      setStatus('Here is a starting idea. Change it, reject it, or save it only if it feels like yours.');
    } catch { setError('We could not prepare that review yet. Your drawing and preview are still safe.'); }
  }

  async function editProposal(patch: { readonly spacing?: 'close' | 'wide'; readonly sizeProfile?: 'constant' | 'smaller_toward_end' }): Promise<void> {
    if (authority === null || authority.state !== 'reviewing' || capabilityRepository.current === null) return;
    const proposal = { ...authority.proposal, ...patch };
    const edit: CapabilityLedgerEntry = { type: 'child_edit', eventId: `event_${Date.now()}${(++strokeCounter.current).toString().padStart(2, '0')}`, toolId: authority.toolId, sequence: authority.events.length + 1, occurredAt: timestamp(), actor: 'child', candidateEventId: authority.candidateEventId, proposal };
    try {
      await capabilityRepository.current.append(edit);
      setAuthority({ ...authority, events: [...authority.events, edit], proposal });
      setPreviewControls((controls) => ({ ...controls, spacing: proposal.spacing === 'close' ? 36 : proposal.spacing === 'wide' ? 92 : 56, endScale: proposal.sizeProfile === 'smaller_toward_end' ? .45 : 1 }));
      setStatus('Your change is recorded separately. The starting idea did not overwrite your choice.');
    } catch { setError('We could not record that change. Try it again; nothing has been saved.'); }
  }

  async function rejectProposal(): Promise<void> {
    if (authority === null || authority.state !== 'reviewing' || capabilityRepository.current === null) return;
    const rejection: CapabilityLedgerEntry = { type: 'child_rejection', eventId: `event_${Date.now()}${(++strokeCounter.current).toString().padStart(2, '0')}`, toolId: authority.toolId, sequence: authority.events.length + 1, occurredAt: timestamp(), actor: 'child', candidateEventId: authority.candidateEventId, reason: 'I do not want to save this starting idea.' };
    try {
      await capabilityRepository.current.append(rejection);
      setAuthority({ ...authority, events: [...authority.events, rejection], state: 'rejected' });
      setStatus('Rejected. Nothing became a tool. You can keep drawing or start a new review.');
    } catch { setError('We could not record the rejection. Nothing has been saved.'); }
  }

  async function approveProposal(): Promise<void> {
    if (authority === null || authority.state !== 'reviewing' || document === null || capabilityRepository.current === null) return;
    setSaving(true);
    const approval: CapabilityLedgerEntry = { type: 'child_approval', eventId: `event_${Date.now()}${(++strokeCounter.current).toString().padStart(2, '0')}`, toolId: authority.toolId, sequence: authority.events.length + 1, occurredAt: timestamp(), actor: 'child', candidateEventId: authority.candidateEventId, approvedProposal: authority.proposal, idempotencyKey: `save_${authority.toolId}` };
    try {
      const existing = await capabilityRepository.current.listDrawVersionsByTool(authority.toolId);
      const bundle = await buildDrawApprovalBundle({ drawing: document, toolId: authority.toolId, ownerChildId: DRAW_OWNER_ID, displayName: toolName, existingVersionCount: existing.length, snapshotId: authority.snapshotId, versionId: `tool_version_${Date.now()}`, approvalEvent: approval, entries: authority.events, createdAt: timestamp() });
      const version = await capabilityRepository.current.commitDrawApproval({ ...bundle, approval });
      setAuthority({ ...authority, events: [...authority.events, approval], state: 'saved' });
      setStatus(`Saved ${toolName} as ${version.versionId}. It is a local tool now, not a preview.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'We could not save that tool. Your drawing is still safe.'); }
    finally { setSaving(false); }
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
  const canPreview = selectionCurrent && document?.guidePath !== undefined;
  let previewError: string | null = null;
  let preview = null;
  if (previewVisible && document !== null && canPreview) {
    try {
      preview = buildDeterministicDrawPreview(document, previewControls);
    } catch (caught) {
      previewError = caught instanceof Error ? caught.message : 'That preview could not be made yet.';
    }
  }
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
          <div className={styles.previewCard} data-ready={canPreview}>
            <div>
              <b>Try your repeat</b>
              <span>{canPreview ? 'See your exact mark travel along your path.' : 'First pick your mark, then draw where it should travel.'}</span>
            </div>
            <button
              type="button"
              className={styles.previewButton}
              disabled={!canPreview}
              onClick={() => {
                setPreviewVisible((visible) => !visible);
                setStatus(previewVisible ? 'Preview hidden. Your source drawing is untouched.' : 'Preview shown. Change the controls to make it feel right.');
              }}
            >
              {previewVisible ? 'Hide preview' : 'Preview my repeats'}
            </button>
            {previewVisible && canPreview ? <div className={styles.previewControls}>
              <label>
                <span>Space between <b>{previewControls.spacing}</b></span>
                <input aria-label="Repeat spacing" type="range" min="16" max="160" step="4" value={previewControls.spacing} onChange={(event) => setPreviewControls((controls) => ({ ...controls, spacing: Number(event.target.value) }))} />
              </label>
              <label>
                <span>First size <b>{previewControls.startScale.toFixed(1)}×</b></span>
                <input aria-label="First repeat size" type="range" min="0.2" max="2" step="0.1" value={previewControls.startScale} onChange={(event) => setPreviewControls((controls) => ({ ...controls, startScale: Number(event.target.value) }))} />
              </label>
              <label>
                <span>Last size <b>{previewControls.endScale.toFixed(1)}×</b></span>
                <input aria-label="Last repeat size" type="range" min="0.2" max="2" step="0.1" value={previewControls.endScale} onChange={(event) => setPreviewControls((controls) => ({ ...controls, endScale: Number(event.target.value) }))} />
              </label>
              <label className={styles.followPath}><input aria-label="Turn repeats along path" type="checkbox" checked={previewControls.followPath} onChange={(event) => setPreviewControls((controls) => ({ ...controls, followPath: event.target.checked }))} /> Turn marks along my path</label>
              <p>This is a temporary local preview. It has not changed your drawing or become a tool.</p>
            </div> : null}
            {previewError !== null ? <p className={styles.previewError} role="alert">{previewError}</p> : null}
          </div>
          {previewVisible && canPreview ? <div className={styles.authorityCard}>
            <div><b>Make this a tool</b><span>Nothing is saved until you choose it.</span></div>
            {authority === null ? <button className={styles.previewButton} type="button" onClick={() => { void beginReview(); }}>Review this idea</button> : null}
            {authority !== null ? <ol className={styles.provenanceRail}>
              <li data-done>You drew the mark and path.</li>
              <li data-done>You asked for a repeat that shrinks at the end.</li>
              <li>A starting idea: {authority.proposal.spacing} spacing, {authority.proposal.sizeProfile.replaceAll('_', ' ')}.</li>
              <li data-done={authority.events.some((entry) => entry.type === 'child_edit') ? '' : undefined}>Your changes stay separate from the starting idea.</li>
              <li data-done={authority.state === 'saved' ? '' : undefined}>{authority.state === 'saved' ? 'You saved an immutable local version.' : authority.state === 'rejected' ? 'You rejected it. Nothing was saved.' : 'Only you can save it.'}</li>
            </ol> : null}
            {authority?.state === 'reviewing' ? <div className={styles.authorityActions}>
              <p>Change the starting idea</p>
              <div><button type="button" onClick={() => { void editProposal({ spacing: 'close' }); }}>Closer</button><button type="button" onClick={() => { void editProposal({ spacing: 'wide' }); }}>Farther</button></div>
              <div><button type="button" onClick={() => { void editProposal({ sizeProfile: 'constant' }); }}>Same size</button><button type="button" onClick={() => { void editProposal({ sizeProfile: 'smaller_toward_end' }); }}>Smaller at the end</button></div>
              <label>Tool name<input aria-label="Tool name" value={toolName} maxLength={80} onChange={(event) => setToolName(event.target.value)} /></label>
              <button className={styles.saveButton} type="button" disabled={saving || toolName.trim().length === 0} onClick={() => { void approveProposal(); }}>{saving ? 'Saving your tool…' : 'Save my tool'}</button>
              <button className={styles.rejectButton} type="button" disabled={saving} onClick={() => { void rejectProposal(); }}>Reject this idea</button>
              <small>This browser treats your choice as the product authority. It is local-device authority, not a login or identity check.</small>
            </div> : null}
          </div> : null}
          <p className={styles.layerNote}><b>Source</b> is your drawing. Guide and preview layers never change it.</p>
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
            <g data-layer="derived-preview" aria-label="Temporary repeat preview" pointerEvents="none">
              {preview?.strokes.map((stroke) => stroke.points.length === 1 ? (
                <circle key={stroke.previewStrokeId} cx={stroke.points[0]!.x} cy={stroke.points[0]!.y} r={Math.max(1, stroke.width / 2)} fill={stroke.color} opacity=".72" />
              ) : (
                <polyline key={stroke.previewStrokeId} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" opacity=".72" />
              ))}
            </g>
          </svg>
          {document?.strokes.length === 0 && draftStroke === null ? <p className={styles.emptyCanvas}>Make one little mark. It can become something useful later.</p> : null}
        </div>
      </div>

      <footer className={styles.footer}>
        <p><span aria-hidden="true">●</span> {document?.strokes.length ?? 0} marks{preview === null ? '' : ` · ${preview.stampCount} temporary repeats`} · source hash {document?.contentDigest.slice(0, 10) ?? '…'}…</p>
        <p role="status">{status}</p>
      </footer>
      {error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
