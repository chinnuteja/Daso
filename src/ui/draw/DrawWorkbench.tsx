'use client';

import Link from 'next/link';
import { pointerPoint } from './pointerPoint';
import { KeyboardPath } from './KeyboardPath';
import { DRAW_PRACTICE_OWNER } from './practiceSession';

import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react';

import { requestDrawInterpretation } from '../../adapters/agents/drawTeaching';
import { openBrowserDrawAssets } from '../../adapters/persistence';
import {
  buildDrawApprovalBundle,
  beginCapabilityReview,
  buildTeachingRequestV2,
  groundDrawInterpretation,
} from '../../core/capability';
import type { CapabilityLedgerEntry } from '../../core/capability/ledger';
import type { DrawPatternProposal, TeachingRequestV2 } from '../../core/capability';
import type { DrawTeachingContext } from '../../core/capability/types';
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
  proposal: DrawPatternProposal;
  childWords: string;
  origin: 'model' | 'manual';
  state: 'reviewing' | 'rejected' | 'saved';
  reviewedContext: DrawTeachingContext;
}>;

type ReviewSeed = Readonly<{
  proposal: DrawPatternProposal;
  childWords: string;
  origin: 'model' | 'manual';
  sourceDigest?: string;
  guidePathRevision?: number;
}>;

type GroundedDrawIdea = Readonly<{
  request: TeachingRequestV2;
  proposal: DrawPatternProposal;
  reasons: readonly string[];
  sourceDigest: string;
  guidePathRevision: number;
}>;

function timestamp(): string {
  return new Date().toISOString();
}

function pointFromEvent(event: PointerEvent<SVGSVGElement>): DrawPoint {
  return pointerPoint(event.currentTarget, event.clientX, event.clientY);
}

export function DrawWorkbench({ onSaved }: { onSaved?: () => void } = {}) {
  const [mode, setMode] = useState<Mode>('workbench');
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
  const [childWords, setChildWords] = useState('');
  const [groundedIdea, setGroundedIdea] = useState<GroundedDrawIdea | null>(null);
  const [interpretationNote, setInterpretationNote] = useState<string | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [toolName, setToolName] = useState('My repeating mark');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Opening your drawing desk…');
  const [error, setError] = useState<string | null>(null);
  const [guidance, setGuidance] = useState(true);
  const [durable, setDurable] = useState(true);
  const [reviewBusy, setReviewBusy] = useState(false);
  const wordsInput = useRef<HTMLTextAreaElement>(null);
  const reviewBusyRef = useRef(false);
  const interpretationGeneration = useRef(0);
  const savedRef = useRef<HTMLDivElement>(null);
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
      const documents = [...await repository.current.listDocumentsByOwner(DRAW_OWNER_ID), ...await repository.current.listDocumentsByOwner(DRAW_PRACTICE_OWNER)].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      if (cancelled) return;
      const latest = documents.at(-1) ?? null;
      if (latest !== null) {
        documentRef.current = latest;
        setDocument(latest);
        setMode('workbench');
        if (isMarkSelectionCurrent(latest)) { setToolMode(latest.guidePath === undefined ? 'select' : 'path'); setPreviewVisible(latest.guidePath !== undefined); }
        setStatus('Your drawing is right where you left it.');
      } else {
        const fresh = createDrawDocument({ documentId: `${BLANK_ID}_${Date.now().toString(36)}`, ownerChildId: DRAW_OWNER_ID, now: timestamp() });
        documentRef.current = fresh; setDocument(fresh);
        setStatus('Draw something small, or try the labelled practice example.');
      }
      setDurable(opened.durable);
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

  function clearInterpretation(): void {
    interpretationGeneration.current += 1;
    setInterpreting(false);
    setGroundedIdea(null);
    setInterpretationNote(null);
  }

  function proposalFromControls(): DrawPatternProposal {
    return {
      type: 'propose_capability',
      kind: 'draw_pattern',
      operation: 'repeat_selected_mark',
      spacing: previewControls.spacing <= 44 ? 'close' : previewControls.spacing >= 76 ? 'wide' : 'even',
      sizeProfile: previewControls.endScale < previewControls.startScale * 0.9 ? 'smaller_toward_end' : 'constant',
    };
  }

  function applyProposalToPreview(proposal: DrawPatternProposal): void {
    setPreviewControls({
      ...DEFAULT_DRAW_PREVIEW_CONTROLS,
      spacing: proposal.spacing === 'close' ? 36 : proposal.spacing === 'wide' ? 92 : 56,
      endScale: proposal.sizeProfile === 'smaller_toward_end' ? 0.45 : 1,
    });
  }

  function editPreviewControls(change: (controls: DrawPreviewControls) => DrawPreviewControls): void {
    setPreviewControls(change);
    if (groundedIdea !== null) {
      setGroundedIdea(null);
      setInterpretationNote('You changed the settings, so they are now your own starting choice.');
    }
  }

  async function start(kind: 'practice' | 'blank'): Promise<void> {
    const suffix = Date.now().toString(36);
    const created = createDrawDocument({
      documentId: kind === 'practice' ? `${PRACTICE_ID}_${suffix}` : `${BLANK_ID}_${suffix}`,
      ownerChildId: kind === 'practice' ? DRAW_PRACTICE_OWNER : DRAW_OWNER_ID,
      now: timestamp(),
      strokes: kind === 'practice' ? PRACTICE_DRAGON_STROKES : [],
    });
    setActive(created);
    setRedo([]);
    setPreviewVisible(false);
    setAuthority(null);
    clearInterpretation();
    setMode('workbench');
    setToolMode(kind === 'practice' ? 'select' : 'draw');
    setChildWords(''); setPreviewControls(DEFAULT_DRAW_PREVIEW_CONTROLS);
    setStatus(kind === 'practice' ? 'Practice drawing loaded. Every line is still yours to change.' : 'A blank page is ready for your mark.');
    await persist(created, kind === 'practice' ? 'Practice drawing saved on this device.' : 'Blank drawing saved on this device.');
  }

  function startStroke(event: PointerEvent<SVGSVGElement>): void {
    if (document === null || !ready || saving || reviewBusy || authority?.state === 'saved' || event.button !== 0) return;
    if (toolMode === 'select') {
      const stroke = hitTestStroke(document.strokes, pointFromEvent(event), 18);
      if (stroke === null) {
        setStatus('Tap a line you made. The practice scale is one small orange diamond.');
        return;
      }
      selectMark(stroke.strokeId);
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
      setAuthority(null);
      clearInterpretation();
      void persist(next, 'Path saved. It starts at the dot and ends at the arrow.');
      setPreviewVisible(true);
      setToolMode('path');
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
    clearInterpretation();
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
    setAuthority(null);
    clearInterpretation();
    void persist(next, 'Last stroke removed.');
  }

  function redoStroke(): void {
    if (documentRef.current === null) return;
    const stroke = redo.at(-1);
    if (stroke === undefined) return;
    const next = restoreStroke(documentRef.current, stroke, timestamp());
    setActive(next);
    setRedo((items) => items.slice(0, -1));
    setAuthority(null);
    clearInterpretation();
    void persist(next, 'Stroke returned.');
  }

  function clear(): void {
    if (documentRef.current === null) return;
    const next = clearStrokes(documentRef.current, timestamp());
    if (next === null) return;
    setActive(next);
    setRedo([]);
    setAuthority(null);
    clearInterpretation();
    void persist(next, 'Canvas cleared. Your earlier version is not saved as a tool.');
  }

  function changeMark(): void {
    if (documentRef.current === null) return;
    const next = clearMarkSelection(documentRef.current, timestamp());
    setActive(next);
    setToolMode('select');
    setPreviewVisible(false);
    setAuthority(null);
    clearInterpretation();
    void persist(next, 'Tap the exact mark you want to use.');
  }

  function selectMark(strokeId: string): void {
    if (documentRef.current === null || saving || reviewBusy) return;
    const next = setMarkSelection(documentRef.current, [strokeId], timestamp());
    setActive(next); setToolMode('select'); setPreviewVisible(false); setAuthority(null); clearInterpretation();
    void persist(next, 'Mark highlighted. Choose “Use this mark” if it is the one you meant.');
  }

  function choosePath(points: readonly DrawPoint[]): void {
    if (documentRef.current === null || !isMarkSelectionCurrent(documentRef.current) || saving) return;
    const next = setGuidePath(documentRef.current, { pathId: 'draw_path_workbench_001', points: [...points] }, timestamp());
    setActive(next); setAuthority(null); clearInterpretation(); setPreviewVisible(true);
    void persist(next, 'You chose a path. The preview is not a saved tool yet.');
    requestAnimationFrame(() => wordsInput.current?.focus());
  }

  async function askKaleToReadWords(): Promise<void> {
    if (document === null || !isMarkSelectionCurrent(document) || document.guidePath === undefined) return;
    const words = childWords.trim();
    if (words.length === 0) {
      setInterpretationNote('Write what you want your mark to do first. Kale only works from your words.');
      return;
    }
    setInterpreting(true);
    const requestGeneration = ++interpretationGeneration.current;
    setInterpretationNote(null);
    try {
      const request = await buildTeachingRequestV2(words, {
        toolId: 'draw-review',
        activeVersionId: null,
        ledgerSequence: 0,
        kind: 'draw_pattern',
        sourceDocumentId: document.documentId,
        sourceRevision: document.revision,
        selectedMarkSnapshotId: 'mark_snapshot_review_001',
        guidePathId: document.guidePath.pathId,
        guidePathRevision: document.guidePath.revision,
      });
      const intent = await requestDrawInterpretation(request);
      if (requestGeneration !== interpretationGeneration.current || documentRef.current?.contentDigest !== document.contentDigest || documentRef.current?.guidePath?.revision !== document.guidePath.revision) return;
      const grounded = groundDrawInterpretation(request, intent);
      if (!grounded.ok) {
        setGroundedIdea(null);
        setInterpretationNote(grounded.question);
        return;
      }
      applyProposalToPreview(grounded.proposal);
      setGroundedIdea({
        request,
        proposal: grounded.proposal,
        reasons: grounded.reasons,
        sourceDigest: document.contentDigest,
        guidePathRevision: document.guidePath.revision,
      });
      setStatus('Kale made a bounded starting suggestion. Read it, change it, or ignore it.');
    } catch (caught) {
      if (requestGeneration !== interpretationGeneration.current) return;
      setGroundedIdea(null);
      setInterpretationNote(caught instanceof Error ? caught.message : 'Kale is unavailable right now. You can still review your own settings.');
    } finally {
      if (requestGeneration === interpretationGeneration.current) setInterpreting(false);
    }
  }

  async function beginReview(seed: ReviewSeed): Promise<void> {
    if (reviewBusyRef.current) return;
    if (document === null || !isMarkSelectionCurrent(document) || document.guidePath === undefined || capabilityRepository.current === null) return;
    if (seed.sourceDigest !== undefined && (seed.sourceDigest !== document.contentDigest || seed.guidePathRevision !== document.guidePath.revision)) {
      clearInterpretation();
      setStatus('Your source changed, so Kale’s suggestion was cleared. Read your words again when you are ready.');
      return;
    }
    const nonce = `${Date.now()}${(++strokeCounter.current).toString().padStart(2, '0')}`;
    const toolId = `my-repeat-${nonce}`;
    const snapshotId = `mark_snapshot_${nonce}`;
    const occurredAt = timestamp();
    const intentEventId = `event_${nonce}`;
    const candidateEventId = `event_${Number(nonce) + 1}`;
    const reviewedContext: DrawTeachingContext = { toolId, activeVersionId: null, ledgerSequence: 0, kind: 'draw_pattern', sourceDocumentId: document.documentId, sourceRevision: document.revision, selectedMarkSnapshotId: snapshotId, guidePathId: document.guidePath.pathId, guidePathRevision: document.guidePath.revision };
    const proposal = seed.proposal;
    reviewBusyRef.current = true; setReviewBusy(true);
    try {
      const events = await beginCapabilityReview(capabilityRepository.current, { context: reviewedContext, ownerChildId: document.ownerChildId, sourcePath: document.guidePath, childWords: seed.childWords, proposal, origin: seed.origin, intentEventId, candidateEventId, occurredAt });
      setAuthority({ toolId, snapshotId, candidateEventId, events, proposal, childWords: seed.childWords, origin: seed.origin, state: 'reviewing', reviewedContext });
      applyProposalToPreview(proposal);
      clearInterpretation();
      setStatus('Here is a starting idea. Change it, reject it, or save it only if it feels like yours.');
    } catch { setError('We could not prepare that review yet. Your drawing and preview are still safe.'); }
    finally { reviewBusyRef.current = false; setReviewBusy(false); }
  }

  async function editProposal(patch: { readonly spacing?: 'close' | 'wide'; readonly sizeProfile?: 'constant' | 'smaller_toward_end' }): Promise<void> {
    if (authority === null || authority.state !== 'reviewing' || capabilityRepository.current === null) return;
    const proposal = { ...authority.proposal, ...patch };
    const edit: CapabilityLedgerEntry = { type: 'child_edit', eventId: `event_${Date.now()}${(++strokeCounter.current).toString().padStart(2, '0')}`, toolId: authority.toolId, sequence: authority.events.length + 1, occurredAt: timestamp(), actor: 'child', candidateEventId: authority.candidateEventId, proposal };
    try {
      await capabilityRepository.current.append(edit);
      setAuthority({ ...authority, events: [...authority.events, edit], proposal });
      applyProposalToPreview(proposal);
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
      const bundle = await buildDrawApprovalBundle({ drawing: document, toolId: authority.toolId, ownerChildId: document.ownerChildId, displayName: toolName, existingVersionCount: existing.length, snapshotId: authority.snapshotId, versionId: `tool_version_${Date.now()}`, approvalEvent: approval, entries: authority.events, createdAt: timestamp(), reviewedContext: authority.reviewedContext });
      await capabilityRepository.current.commitApprovedCapability({ ...bundle, approval, reviewedContext: authority.reviewedContext });
      setAuthority({ ...authority, events: [...authority.events, approval], state: 'saved' });
      setStatus(`Saved ${toolName}. It is a local tool now, not a preview.`);
      requestAnimationFrame(() => savedRef.current?.focus());
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
  const isPractice = document?.ownerChildId === DRAW_PRACTICE_OWNER || document?.documentId.startsWith(PRACTICE_ID);
  const startingIdea = authority?.events.find((entry) => entry.type === 'capability_candidate');
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
          <p className={styles.eyebrow}>{isPractice ? 'Labelled practice drawing · you choose the behavior' : 'Your drawing · your choices'}</p>
          <h2 id="draw-workbench-title">One little mark. Your own tool.</h2>
          <p className={styles.intro}>Choose a mark. Show where it goes. Keep the behavior you decide on.</p>
        </div>
        <div className={styles.startActions}><button className={styles.swap} type="button" disabled={!ready || saving} onClick={() => { void start('practice'); }}>Try a 90-second example</button><button className={styles.swap} type="button" disabled={!ready || saving} onClick={() => { void start('blank'); }}>New blank drawing</button></div>
      </header>

      {!durable ? <p className={styles.error} role="status">Local storage is unavailable. You can try drawing, but this session will not survive refresh and cannot be claimed as a durable saved tool.</p> : null}
      <div className={styles.thread} role="group" aria-label="Your tool’s authorship"><span data-done={(document?.strokes.length ?? 0) > 0}>{document?.ownerChildId === DRAW_PRACTICE_OWNER ? 'Practice mark' : 'Your marks'}</span><span data-done={selectionCurrent}>Your choice</span><span data-done={canPreview}>Local preview</span><span data-done={authority !== null}>{authority?.origin === 'model' ? 'Kale suggested' : 'Your settings'}</span><span data-done={authority?.state === 'saved'}>{authority?.state === 'saved' ? 'Saved tool ✓' : 'Not saved yet'}</span></div>

      <div className={styles.stage}>
        <aside className={styles.dock} aria-label="Drawing tools">
          {guidance ? <div className={styles.guide}><b>{authority?.state === 'saved' ? 'Now use it somewhere new.' : canPreview ? 'See the effect. Decide what it should keep.' : selectionCurrent ? 'Choose “Use this mark”, then show its path.' : toolMode === 'select' ? 'Choose one line, not the whole drawing.' : 'Draw a small mark, then pick it.'}</b><p>{authority?.state === 'saved' ? 'The behavior is locked in a saved version. A new path is all you need to use it again.' : isPractice ? 'This dragon is supplied practice art, not a drawing you made. Tap an orange diamond or choose a line below.' : 'Your original drawing never gets replaced. Kale can suggest a behavior, not redraw your work.'}</p><button type="button" onClick={() => setGuidance(false)}>Hide tips</button></div> : <button className={styles.tipsButton} type="button" onClick={() => setGuidance(true)}>Show tips</button>}
          {authority?.state === 'saved' ? <div className={styles.savedCard} ref={savedRef} tabIndex={-1}><b>Saved ✓ {toolName}</b><p>Your exact mark and approved behavior are kept on this device. Try a different path now—no AI needed.</p>{onSaved ? <button className={styles.previewButton} type="button" onClick={onSaved}>Use my saved tool on a new path</button> : <Link href="/draw/library">Use on a new path →</Link>}</div> : null}
          {authority?.state !== 'saved' ? <>
          <div className={styles.steps} role="group" aria-label="Make this tool steps">
            <button type="button" data-active={toolMode === 'draw'} disabled={saving || reviewBusy} onClick={() => setToolMode('draw')}>
              <span>1</span> Draw
            </button>
            <button type="button" data-active={toolMode === 'select'} disabled={saving || reviewBusy || (document?.strokes.length ?? 0) === 0} onClick={() => { setToolMode('select'); setStatus('Tap a source mark or choose one below.'); }}>
              <span>2</span> Pick a mark
            </button>
            <button type="button" data-active={toolMode === 'path'} disabled={!selectionCurrent || saving || reviewBusy} onClick={() => setToolMode('path')}>
              <span>3</span> Show its path
            </button>
          </div>
          <p className={styles.modePrompt}>
            {toolMode === 'draw' ? 'Add or change your source drawing.' : toolMode === 'select' ? 'Tap exactly the mark you want to keep.' : 'Drag from where the pattern starts to where it ends.'}
          </p>
          </> : null}
          {toolMode === 'draw' && authority?.state !== 'saved' ? <div className={styles.inkControls}>
          <div>
            <p className={styles.toolLabel}>Ink</p>
            <div className={styles.palette}>
              {PALETTE.map((value, index) => (
                <button
                  key={value}
                  type="button"
                  className={styles.swatch}
                  data-selected={color === value}
                  style={{ '--swatch': value } as CSSProperties}
                  aria-label={`Use ${['forest', 'terracotta', 'violet', 'teal', 'gold'][index]} ink`}
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
          </div> : null}
          {!canPreview || toolMode === 'select' ? <div className={styles.selectionCard} data-stale={document?.selection !== undefined && !selectionCurrent}>
            <b>{selectionCurrent ? 'Your selected mark' : document?.selection !== undefined ? 'Your mark changed' : 'No mark selected yet'}</b>
            <span>{authority?.state === 'saved' ? 'Your saved tool keeps its own exact mark copy. The original drawing is unchanged.' : selectionCurrent ? 'Kept in your drawing. Nothing has been copied or saved as a tool.' : document?.selection !== undefined ? 'You changed the source drawing. Pick the mark again before using it.' : 'Pick a source mark when you are ready.'}</span>
            <button type="button" onClick={changeMark}>{selectionCurrent ? 'Change mark' : 'Pick a mark'}</button>
            {toolMode === 'select' ? <><label>Choose a source mark<select aria-label="Choose a source mark" value={document?.selection?.strokeIds[0] ?? ''} disabled={saving || reviewBusy} onChange={(event) => { if (event.target.value) selectMark(event.target.value); }}><option value="">Choose a line…</option>{document?.strokes.map((stroke, index) => <option key={stroke.strokeId} value={stroke.strokeId}>{stroke.strokeId.startsWith('stroke_scale') ? `Practice orange diamond ${stroke.strokeId.endsWith('001') ? '1' : stroke.strokeId.endsWith('002') ? '2' : '3'}` : `Line ${index + 1}`}</option>)}</select></label>{selectionCurrent ? <button className={styles.previewButton} type="button" onClick={() => { setToolMode('path'); setStatus('Mark confirmed. Drag a path from the dot toward the arrow.'); }}>Use this mark</button> : null}</> : null}
          </div> : null}
          {toolMode === 'path' && selectionCurrent && !canPreview ? <KeyboardPath onChoose={choosePath} disabled={saving} /> : null}
          {canPreview && authority?.state !== 'saved' ? <div className={styles.previewCard} data-ready={canPreview}>
            <div>
              <b>Your live preview · not saved yet</b>
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
            {previewVisible && canPreview && authority?.state !== 'reviewing' ? <details className={styles.previewControls}><summary>Adjust the preview</summary>
              <label>
                <span>Space between <b>{previewControls.spacing}</b></span>
                <input aria-label="Repeat spacing" type="range" min="16" max="160" step="4" value={previewControls.spacing} onChange={(event) => editPreviewControls((controls) => ({ ...controls, spacing: Number(event.target.value) }))} />
              </label>
              <label>
                <span>First size <b>{previewControls.startScale.toFixed(1)}×</b></span>
                <input aria-label="First repeat size" type="range" min="0.2" max="2" step="0.1" value={previewControls.startScale} onChange={(event) => editPreviewControls((controls) => ({ ...controls, startScale: Number(event.target.value) }))} />
              </label>
              <label>
                <span>Last size <b>{previewControls.endScale.toFixed(1)}×</b></span>
                <input aria-label="Last repeat size" type="range" min="0.2" max="2" step="0.1" value={previewControls.endScale} onChange={(event) => editPreviewControls((controls) => ({ ...controls, endScale: Number(event.target.value) }))} />
              </label>
              <label className={styles.followPath}><input aria-label="Turn repeats along path" type="checkbox" checked={previewControls.followPath} onChange={(event) => editPreviewControls((controls) => ({ ...controls, followPath: event.target.checked }))} /> Turn marks along my path</label>
                <p>This is a temporary local preview. The review shows the bounded settings your tool will keep. Your drawing stays unchanged.</p>
            </details> : null}
            {previewError !== null ? <p className={styles.previewError} role="alert">{previewError}</p> : null}
          </div> : null}
          {previewVisible && canPreview ? <div className={styles.authorityCard}>
            <div><b>{authority?.state === 'saved' ? 'How this became yours' : 'Make this a tool'}</b>{authority?.state !== 'saved' ? <span>Describe what you want. Kale can suggest one small behavior, but you decide whether it belongs in your tool.</span> : null}</div>
            {authority === null ? <div className={styles.intentStart}>
              <label>
                <span>What should your selected mark do?</span>
                <textarea
                  ref={wordsInput}
                  aria-label="What should your selected mark do?"
                  value={childWords}
                  maxLength={800}
                  placeholder="Repeat my scale along this path, smaller toward the end."
                  onChange={(event) => { setChildWords(event.target.value); clearInterpretation(); }}
                />
              </label>
              <button className={styles.previewButton} type="button" disabled={childWords.trim().length === 0 || interpreting} onClick={() => { void askKaleToReadWords(); }}>
                {interpreting ? 'Kale is reading…' : 'Let Kale read this'}
              </button>
              {interpretationNote !== null ? <p className={styles.interpretationNote} role="status">Kale’s response: {interpretationNote}</p> : null}
              {groundedIdea !== null ? <div className={styles.groundingCard}>
                <p><b>You said</b> “{groundedIdea.request.childWords}”</p>
                <p><b>Kale thinks</b> Repeat your selected mark along your path with {groundedIdea.proposal.spacing} spacing and {groundedIdea.proposal.sizeProfile.replaceAll('_', ' ')}.</p>
                <ul>{groundedIdea.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                <button className={styles.previewButton} type="button" disabled={reviewBusy} onClick={() => { void beginReview({ proposal: groundedIdea.proposal, childWords: groundedIdea.request.childWords, origin: 'model', sourceDigest: groundedIdea.sourceDigest, guidePathRevision: groundedIdea.guidePathRevision }); }}>Review Kale’s suggestion</button>
              </div> : null}
              <div className={styles.manualChoice}>
                <p>Your current settings: {proposalFromControls().spacing} spacing, {proposalFromControls().sizeProfile.replaceAll('_', ' ')}.</p>
                <button type="button" disabled={childWords.trim().length === 0 || reviewBusy} onClick={() => { void beginReview({ proposal: proposalFromControls(), childWords: childWords.trim(), origin: 'manual' }); }}>{reviewBusy ? 'Opening your review…' : 'Review my settings instead'}</button>
              </div>
              <small>Kale receives your typed sentence plus only “a selected mark exists” and “a path exists.” It never receives your drawing.</small>
            </div> : null}
            {authority !== null ? <ol className={styles.provenanceRail}>
              <li data-done>{isPractice ? 'You chose a practice mark and directed its path.' : 'You made the mark and chose its path.'}</li>
              <li data-done>You said: “{authority.childWords}”</li>
              <li>{authority.origin === 'model' ? 'Kale suggested' : 'You chose'}: {startingIdea?.proposal.kind === 'draw_pattern' ? `${startingIdea.proposal.spacing} spacing, ${startingIdea.proposal.sizeProfile.replaceAll('_', ' ')}` : 'a bounded repeat'}.</li>
              <li data-done={authority.events.some((entry) => entry.type === 'child_edit') ? '' : undefined}>{authority.events.some((entry) => entry.type === 'child_edit') ? `You changed it to ${authority.proposal.spacing} spacing, ${authority.proposal.sizeProfile.replaceAll('_', ' ')}.` : 'Your changes stay separate from the starting idea.'}</li>
              <li data-done={authority.state === 'saved' ? '' : undefined}>{authority.state === 'saved' ? <>You saved an immutable local version. <Link href={`/parent/tools?tool=${encodeURIComponent(authority.toolId)}`}>Show its story →</Link></> : authority.state === 'rejected' ? 'You rejected it. Nothing was saved.' : 'Only you can save it.'}</li>
            </ol> : null}
            {authority?.state === 'reviewing' ? <div className={styles.authorityActions}>
              <p>Change the starting idea</p>
              <div><button type="button" onClick={() => { void editProposal({ spacing: 'close' }); }}>Closer</button><button type="button" onClick={() => { void editProposal({ spacing: 'wide' }); }}>Farther</button></div>
              <div><button type="button" onClick={() => { void editProposal({ sizeProfile: 'constant' }); }}>Same size</button><button type="button" onClick={() => { void editProposal({ sizeProfile: 'smaller_toward_end' }); }}>Smaller at the end</button></div>
              <label>Tool name<input aria-label="Tool name" value={toolName} maxLength={80} onChange={(event) => setToolName(event.target.value)} /></label>
              <p>This tool keeps an exact copy of this mark and your approved settings. The original drawing stays unchanged.</p>
              <button className={styles.saveButton} type="button" disabled={saving || !durable || toolName.trim().length === 0} onClick={() => { void approveProposal(); }}>{saving ? 'Saving your tool…' : 'Save my tool'}</button>
              <button className={styles.rejectButton} type="button" disabled={saving} onClick={() => { void rejectProposal(); }}>Reject this idea</button>
              <small>This browser treats your choice as the product authority. It is local-device authority, not a login or identity check.</small>
            </div> : null}
            {authority?.state === 'rejected' ? <div className={styles.authorityActions}><b>Not saved. Your drawing stays.</b><button type="button" onClick={() => { setAuthority(null); requestAnimationFrame(() => wordsInput.current?.focus()); }}>Change my words and try again</button></div> : null}
          </div> : null}
          <p className={styles.layerNote}><b>Original marks stay intact.</b> Guide and preview layers never change them.</p>
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
            <g data-layer="source" role="group" aria-label="Your source marks">
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
            <g data-layer="guide" role="group" aria-label="Child-directed guide path">
              {pathPoints.length >= 2 ? <polyline points={pathPoints.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#a65636" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="13 10" markerEnd="url(#guide-arrow)" /> : null}
              {pathPoints[0] !== undefined ? <><circle cx={pathPoints[0].x} cy={pathPoints[0].y} r="10" fill="#fffdf7" stroke="#a65636" strokeWidth="5" /><text x={pathPoints[0].x + 15} y={pathPoints[0].y - 14} fill="#8d432d" fontSize="20" fontWeight="700">starts here</text></> : null}
              {pathPoints.at(-1) !== undefined && pathPoints.length >= 2 ? <text x={pathPoints.at(-1)!.x + 15} y={pathPoints.at(-1)!.y + 28} fill="#8d432d" fontSize="20" fontWeight="700">ends here</text> : null}
            </g>
            <g data-layer="derived-preview" role="group" aria-label="Temporary repeat preview" pointerEvents="none">
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
        <p><span aria-hidden="true">●</span> {document?.strokes.length ?? 0} original marks{preview === null ? '' : ` · ${preview.stampCount} preview repeats`} · {authority?.state === 'saved' ? 'Tool saved on this device' : 'Current draft not saved as a tool'}</p>
        <p role="status">{status}</p>
      </footer>
      {error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
