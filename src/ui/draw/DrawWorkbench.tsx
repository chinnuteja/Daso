'use client';

import Link from 'next/link';
import { pointerPoint } from './pointerPoint';
import { KeyboardPath } from './KeyboardPath';
import { DRAW_PRACTICE_OWNER } from './practiceSession';
import { DrawWriteQueue } from './DrawWriteQueue';
import { SourceMark } from './SourceMark';
import { KeyboardInk } from './KeyboardInk';
import { PatternChoice } from './PatternChoice';
import { DrawSymbol } from './DrawSymbol';
import { pictureInstruction } from './pictureInstruction';
import { restoreKeptStamp } from './restoreKeptStamp';
import { assertCanAddLine, exceedsDrawingBudget } from './drawingBudget';

import { type CSSProperties, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';

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
} from '../../core/draw';
import type { DrawDocument, DrawPoint, DrawPreviewControls, DrawStroke } from '../../core/draw';
import type { CapabilityLifecycleRepository, DrawAssetRepository } from '../../core/ports/repositories';

import styles from './DrawWorkbench.module.css';

const DRAW_OWNER_ID = 'child_local_01';
const PRACTICE_ID = 'draw_document_practice_001';
const BLANK_ID = 'draw_document_canvas_001';
const PALETTE = ['#294f46', '#c45b3f', '#5c55a6', '#15737c', '#d18827'] as const;

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
  const [toolName, setToolName] = useState('My stamp');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Opening your drawing desk…');
  const [error, setError] = useState<string | null>(null);
  const [durable, setDurable] = useState(true);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const actionBusyRef = useRef(false);
  const writeQueue = useRef<DrawWriteQueue | null>(null);
  const pendingWrites = useRef(0);
  const reviewHeading = useRef<HTMLDivElement>(null);
  const wordsInput = useRef<HTMLTextAreaElement>(null);
  const reviewBusyRef = useRef(false);
  const interpretationGeneration = useRef(0);
  const savedRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
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
      if (cancelled) { opened.close(); return; }
      close = opened.close;
      repository.current = opened.drawAssets;
      capabilityRepository.current = opened.capabilities;
      const documents = [...await repository.current.listDocumentsByOwner(DRAW_OWNER_ID), ...await repository.current.listDocumentsByOwner(DRAW_PRACTICE_OWNER)].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      if (cancelled) return;
      const latest = documents.at(-1) ?? null;
      const queue = new DrawWriteQueue(opened.drawAssets);
      await queue.track(latest?.ownerChildId === DRAW_OWNER_ID ? latest : null, DRAW_OWNER_ID);
      await queue.track(latest?.ownerChildId === DRAW_PRACTICE_OWNER ? latest : null, DRAW_PRACTICE_OWNER);
      if (cancelled) return;
      writeQueue.current = queue;
      if (latest !== null) {
        documentRef.current = latest;
        setDocument(latest);
        if (isMarkSelectionCurrent(latest)) { setToolMode(latest.guidePath === undefined ? 'select' : 'path'); setPreviewVisible(latest.guidePath !== undefined); }
        else if (latest.ownerChildId === DRAW_PRACTICE_OWNER) setToolMode('select');
        setStatus('Your drawing is right where you left it.');
        if (isMarkSelectionCurrent(latest) && latest.guidePath !== undefined) {
          const definitions = (await opened.capabilities.listDefinitionsByOwner(latest.ownerChildId)).filter(item => item.kind === 'draw_pattern').reverse();
          for (const definition of definitions) {
            if (cancelled) return;
            try {
              const graph = await opened.capabilities.getGraph(definition.toolId);
              if (graph === null) continue;
              const kept = restoreKeptStamp(graph,latest);
              if (kept === null) continue;
              if (cancelled) return;
              setAuthority(kept.session); setToolName(kept.name); setPreviewControls(kept.controls);
              setStatus('Your stamp is kept. Use it on another trail!');
              break;
            } catch { /* A damaged record is never presented as kept. The drawing remains usable. */ }
          }
        }
      } else {
        const fresh = createDrawDocument({ documentId: `${BLANK_ID}_${new Date(timestamp()).getTime().toString(36)}`, ownerChildId: DRAW_OWNER_ID, now: timestamp() });
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
    pendingWrites.current += 1; setWriting(true);
    try {
      if (writeQueue.current === null) throw new Error('The drawing desk is not ready.');
      const withDigest = await writeQueue.current.write(next);
      if (documentRef.current?.documentId === next.documentId && documentRef.current?.revision === next.revision) {
        documentRef.current = withDigest;
        setDocument(withDigest);
      }
      if (documentRef.current?.documentId === next.documentId) { setStatus(savedMessage); setError(null); setSaveFailed(false); }
    } catch (caught) {
      setSaveFailed(true); setStatus('Changes in this tab are not saved.');
      setError(caught instanceof Error ? caught.message : 'Local save failed. Keep this tab open and download your drawing before reloading.');
    } finally { pendingWrites.current -= 1; setWriting(pendingWrites.current > 0); }
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
    if (saveFailed) { setError('Download your unsaved drawing, then reload before opening a new drawing.'); return; }
    if (actionBusyRef.current || reviewBusyRef.current || pendingWrites.current > 0) return;
    actionBusyRef.current = true; setActionBusy(true);
    try {
    await writeQueue.current?.track(null, kind === 'practice' ? DRAW_PRACTICE_OWNER : DRAW_OWNER_ID);
    const suffix = new Date(timestamp()).getTime().toString(36);
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
    setToolMode(kind === 'practice' ? 'select' : 'draw');
    setChildWords(''); setPreviewControls(DEFAULT_DRAW_PREVIEW_CONTROLS);
    setStatus(kind === 'practice' ? 'Practice drawing loaded. Every line is still yours to change.' : 'A blank page is ready for your mark.');
    await persist(created, kind === 'practice' ? 'Practice drawing saved on this device.' : 'Blank drawing saved on this device.');
    } catch { setError('A new drawing could not open. Your current drawing is kept.'); }
    finally { actionBusyRef.current = false; setActionBusy(false); }
  }

  function startStroke(event: PointerEvent<SVGSVGElement>): void {
    if (document === null || exceedsDrawingBudget(document) || !ready || actionBusyRef.current || reviewBusyRef.current || pendingWrites.current > 0 || authority?.state === 'reviewing' || authority?.state === 'saved' || event.button !== 0) return;
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
      strokeId: `stroke_draw_${new Date(timestamp()).getTime().toString(36)}_${(++strokeCounter.current).toString(36)}`,
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
    let next: DrawDocument;
    try { assertCanAddLine(documentRef.current, active); next = appendStroke(documentRef.current, active, timestamp()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'This line could not be added. Your earlier lines are kept.'); return; }
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
    if (documentRef.current === null || actionBusyRef.current || reviewBusyRef.current || pendingWrites.current > 0 || authority?.state === 'reviewing' || authority?.state === 'saved') return;
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
    if (documentRef.current === null || actionBusyRef.current || reviewBusyRef.current || pendingWrites.current > 0 || authority?.state === 'reviewing' || authority?.state === 'saved') return;
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
    if (documentRef.current === null || actionBusyRef.current || reviewBusyRef.current || pendingWrites.current > 0 || authority?.state === 'reviewing' || authority?.state === 'saved') return;
    const next = clearStrokes(documentRef.current, timestamp());
    if (next === null) return;
    setActive(next);
    setRedo([]);
    setAuthority(null);
    clearInterpretation();
    void persist(next, 'Canvas cleared. Your earlier version is not saved as a tool.');
  }

  function selectMark(strokeId: string): void {
    if (documentRef.current === null || actionBusyRef.current || reviewBusyRef.current || pendingWrites.current > 0) return;
    const next = setMarkSelection(documentRef.current, [strokeId], timestamp());
    setActive(next); setToolMode('select'); setPreviewVisible(false); setAuthority(null); clearInterpretation();
    void persist(next, 'Your piece is highlighted. Give it a trail.');
  }

  function choosePath(points: readonly DrawPoint[]): void {
    if (documentRef.current === null || !isMarkSelectionCurrent(documentRef.current) || actionBusyRef.current || pendingWrites.current > 0) return;
    const next = setGuidePath(documentRef.current, { pathId: 'draw_path_workbench_001', points: [...points] }, timestamp());
    setActive(next); setAuthority(null); clearInterpretation(); setPreviewVisible(true);
    void persist(next, 'You chose a path. The preview is not a saved tool yet.');
  }

  async function askKaleToReadWords(): Promise<void> {
    if (document === null || actionBusyRef.current || reviewBusyRef.current || pendingWrites.current > 0 || interpreting || !isMarkSelectionCurrent(document) || document.guidePath === undefined) return;
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
    if (reviewBusyRef.current || actionBusyRef.current || pendingWrites.current > 0) return;
    if (document === null || !isMarkSelectionCurrent(document) || document.guidePath === undefined || capabilityRepository.current === null) return;
    if (seed.sourceDigest !== undefined && (seed.sourceDigest !== document.contentDigest || seed.guidePathRevision !== document.guidePath.revision)) {
      clearInterpretation();
      setStatus('Your source changed, so Kale’s suggestion was cleared. Read your words again when you are ready.');
      return;
    }
    const nonce = `${new Date(timestamp()).getTime()}${(++strokeCounter.current).toString().padStart(2, '0')}`;
    const toolId = `my-repeat-${nonce}`;
    const snapshotId = `mark_snapshot_${nonce}`;
    const occurredAt = timestamp();
    const intentEventId = `event_${nonce}`;
    const candidateEventId = `event_${Number(nonce) + 1}`;
    const reviewedContext: DrawTeachingContext = { toolId, activeVersionId: null, ledgerSequence: 0, kind: 'draw_pattern', sourceDocumentId: document.documentId, sourceRevision: document.revision, selectedMarkSnapshotId: snapshotId, guidePathId: document.guidePath.pathId, guidePathRevision: document.guidePath.revision };
    const proposal = seed.proposal;
    reviewBusyRef.current = true; setReviewBusy(true);
    try {
      await writeQueue.current?.flush();
      const events = await beginCapabilityReview(capabilityRepository.current, { context: reviewedContext, ownerChildId: document.ownerChildId, sourcePath: document.guidePath, childWords: seed.childWords, proposal, origin: seed.origin, intentEventId, candidateEventId, occurredAt });
      setAuthority({ toolId, snapshotId, candidateEventId, events, proposal, childWords: seed.childWords, origin: seed.origin, state: 'reviewing', reviewedContext });
      applyProposalToPreview(proposal);
      clearInterpretation();
      setStatus('Here is a starting idea. Change it, reject it, or save it only if it feels like yours.');
      requestAnimationFrame(() => reviewHeading.current?.focus());
    } catch { setError('We could not prepare that review yet. Your drawing and preview are still safe.'); }
    finally { reviewBusyRef.current = false; setReviewBusy(false); }
  }

  async function editProposal(patch: { readonly spacing?: 'close' | 'even' | 'wide'; readonly sizeProfile?: 'constant' | 'smaller_toward_end' }): Promise<void> {
    if (actionBusyRef.current || authority === null || authority.state !== 'reviewing' || capabilityRepository.current === null) return;
    actionBusyRef.current = true; setActionBusy(true);
    const proposal = { ...authority.proposal, ...patch };
    const edit: CapabilityLedgerEntry = { type: 'child_edit', eventId: `event_${new Date(timestamp()).getTime()}${(++strokeCounter.current).toString().padStart(2, '0')}`, toolId: authority.toolId, sequence: authority.events.length + 1, occurredAt: timestamp(), actor: 'child', candidateEventId: authority.candidateEventId, proposal };
    try {
      await capabilityRepository.current.append(edit);
      setAuthority({ ...authority, events: [...authority.events, edit], proposal });
      applyProposalToPreview(proposal);
      setStatus('Your change is recorded separately. The starting idea did not overwrite your choice.');
    } catch { setError('We could not record that change. Try it again; nothing has been saved.'); }
    finally { actionBusyRef.current = false; setActionBusy(false); }
  }

  async function rejectProposal(): Promise<void> {
    if (actionBusyRef.current || authority === null || authority.state !== 'reviewing' || capabilityRepository.current === null) return;
    actionBusyRef.current = true; setActionBusy(true);
    const rejection: CapabilityLedgerEntry = { type: 'child_rejection', eventId: `event_${new Date(timestamp()).getTime()}${(++strokeCounter.current).toString().padStart(2, '0')}`, toolId: authority.toolId, sequence: authority.events.length + 1, occurredAt: timestamp(), actor: 'child', candidateEventId: authority.candidateEventId, reason: 'I do not want to save this starting idea.' };
    try {
      await capabilityRepository.current.append(rejection);
      setAuthority({ ...authority, events: [...authority.events, rejection], state: 'rejected' });
      requestAnimationFrame(() => retryRef.current?.focus());
      setStatus('Rejected. Nothing became a tool. You can keep drawing or start a new review.');
    } catch { setError('We could not record the rejection. Nothing has been saved.'); }
    finally { actionBusyRef.current = false; setActionBusy(false); }
  }

  async function approveProposal(): Promise<void> {
    if (actionBusyRef.current || authority === null || authority.state !== 'reviewing' || document === null || capabilityRepository.current === null || !durable) return;
    actionBusyRef.current = true; setActionBusy(true);
    setSaving(true);
    const approval: CapabilityLedgerEntry = { type: 'child_approval', eventId: `event_${new Date(timestamp()).getTime()}${(++strokeCounter.current).toString().padStart(2, '0')}`, toolId: authority.toolId, sequence: authority.events.length + 1, occurredAt: timestamp(), actor: 'child', candidateEventId: authority.candidateEventId, approvedProposal: authority.proposal, idempotencyKey: `save_${authority.toolId}` };
    try {
      await writeQueue.current?.flush();
      const existing = await capabilityRepository.current.listDrawVersionsByTool(authority.toolId);
      const bundle = await buildDrawApprovalBundle({ drawing: document, toolId: authority.toolId, ownerChildId: document.ownerChildId, displayName: toolName, existingVersionCount: existing.length, snapshotId: authority.snapshotId, versionId: `tool_version_${new Date(timestamp()).getTime()}`, approvalEvent: approval, entries: authority.events, createdAt: timestamp(), reviewedContext: authority.reviewedContext });
      await capabilityRepository.current.commitApprovedCapability({ ...bundle, approval, reviewedContext: authority.reviewedContext });
      setAuthority({ ...authority, events: [...authority.events, approval], state: 'saved' });
      setStatus(`Saved ${toolName}. It is a local tool now, not a preview.`);
      requestAnimationFrame(() => savedRef.current?.focus());
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'We could not save that tool. Your drawing is still safe.'); }
    finally { setSaving(false); actionBusyRef.current = false; setActionBusy(false); }
  }

  function downloadDrawing(): void {
    if (documentRef.current === null) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(documentRef.current, null, 2)], { type: 'application/json' }));
    const link = window.document.createElement('a'); link.href = url; link.download = 'kale-unsaved-drawing.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function keyboardLine(points: readonly DrawPoint[]): void {
    if (documentRef.current === null || actionBusyRef.current || reviewBusyRef.current || pendingWrites.current > 0 || authority?.state === 'reviewing' || authority?.state === 'saved') return;
    try {
      assertCanAddLine(documentRef.current, { strokeId: 'stroke_budget_check', color, width, points: [...points] });
      const next = appendStroke(documentRef.current, { strokeId: `stroke_keyboard_${new Date(timestamp()).getTime().toString(36)}_${++strokeCounter.current}`, color, width, points: [...points] }, timestamp());
      setActive(next); setRedo([]); setAuthority(null); clearInterpretation(); setPreviewVisible(false);
      void persist(next, 'Your keyboard-drawn line is saved locally.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'This drawing has reached its line limit. Your earlier lines are kept.'); }
  }

  const previewState = useMemo(() => {
    if (!previewVisible || document === null || exceedsDrawingBudget(document) || !isMarkSelectionCurrent(document) || document.guidePath === undefined) return { preview: null, error: null };
    try { return { preview: buildDeterministicDrawPreview(document, previewControls), error: null }; }
    catch (caught) { return { preview: null, error: caught instanceof Error ? caught.message : 'That preview could not be made yet.' }; }
  }, [previewVisible, document, previewControls]);
  const overBudget = document !== null && exceedsDrawingBudget(document);
  const sourceLocked = overBudget || actionBusy || reviewBusy || writing || authority?.state === 'reviewing' || authority?.state === 'saved';


  const strokes = document === null || overBudget ? [] : [...document.strokes, ...(draftStroke === null ? [] : [draftStroke])];
  const selectionCurrent = document !== null && isMarkSelectionCurrent(document);
  const selectedIds = selectionCurrent ? new Set(document.selection?.strokeIds ?? []) : new Set<string>();
  const selectedStrokes = strokes.filter(stroke => selectedIds.has(stroke.strokeId));
  const pathPoints = guideDraft ?? document?.guidePath?.points ?? [];
  const canPreview = selectionCurrent && document?.guidePath !== undefined && toolMode === 'path';
  const isPractice = document?.ownerChildId === DRAW_PRACTICE_OWNER || document?.documentId.startsWith(PRACTICE_ID);
  const startingIdea = authority?.events.find((entry) => entry.type === 'capability_candidate');
  const { preview, error: previewError } = previewState;
  const step = authority?.state === 'saved' ? 4 : canPreview ? 3 : toolMode === 'select' ? 1 : toolMode === 'path' ? 2 : 0;
  const prompt = step === 4 ? 'You made a stamp!' : step === 3 ? 'Make it look just right.' : step === 2 ? 'Draw a trail for your piece.' : step === 1 ? 'Tap the piece you want to repeat.' : 'What will you draw?';
  const currentProposal = authority?.state === 'reviewing' ? authority.proposal : proposalFromControls();
  const busy = !ready || sourceLocked || actionBusy || interpreting;
  function chooseLook(patch: { spacing?: 'close' | 'even' | 'wide'; sizeProfile?: 'constant' | 'smaller_toward_end' }) {
    if (authority?.state === 'reviewing') { void editProposal(patch); return; }
    const proposal = { ...proposalFromControls(), ...patch };
    clearInterpretation(); applyProposalToPreview(proposal); setPreviewVisible(true);
  }
  function openMyReview() {
    const words = pictureInstruction(proposalFromControls());
    void beginReview({ proposal: proposalFromControls(), childWords: words, origin: 'manual' });
  }
  function drawAgain() {
    setToolMode('draw'); setPreviewVisible(false); clearInterpretation();
    setStatus('Keep drawing. Your lines are still here.');
  }
  return (
    <section className={styles.workbench} aria-labelledby="draw-workbench-title">
      <header className={styles.workbenchHeader}>
        <h2 id="draw-workbench-title">{prompt}</h2>
        <div className={styles.startActions}>
          <button className={styles.swap} type="button" disabled={!ready || writing || actionBusy || reviewBusy || saving || interpreting || authority?.state === 'reviewing' || saveFailed} onClick={() => { void start('practice'); }}><DrawSymbol kind="diamond" /> Try a dragon</button>
          <button className={styles.swap} type="button" disabled={!ready || writing || actionBusy || reviewBusy || saving || interpreting || authority?.state === 'reviewing' || saveFailed} onClick={() => { void start('blank'); }}><DrawSymbol kind="plus" /> New drawing</button>
        </div>
      </header>
      {isPractice ? <p className={styles.practiceBadge}>Practice dragon · choose a piece to make your own stamp</p> : null}
      {!durable ? <p className={styles.error} role="status">Saving is unavailable. You can draw, but your work will not stay after refresh.</p> : null}
      {overBudget ? <div className={styles.error} role="alert"><p>This drawing is too detailed to show safely. It has not been changed.</p><button type="button" onClick={downloadDrawing}>Download my complete drawing</button></div> : null}

      <div className={styles.journeyDots} role="group" aria-label="Drawing steps">
        {['Draw', 'Pick', 'Trail', 'Keep'].map((label, i) => <span key={label} data-current={Math.min(step,3) === i} data-done={step > i}><b aria-hidden="true">{step > i ? <DrawSymbol kind="check" /> : i + 1}</b>{label}</span>)}
      </div>
      {toolMode === 'draw' && authority?.state !== 'saved' ? <fieldset className={styles.inkBar} disabled={busy}>
        <legend className={styles.screenReader}>Drawing tools</legend>
        <div className={styles.palette} role="group" aria-label="Ink colours">{PALETTE.map((value,index) => <button key={value} type="button" className={styles.swatch} data-selected={color === value} style={{ '--swatch': value } as CSSProperties} aria-label={`Use ${['forest','terracotta','violet','teal','gold'][index]} ink`} aria-pressed={color === value} onClick={() => setColor(value)} />)}</div>
        <label className={styles.penSize}><span>Thin — thick</span><input aria-label="Line weight" type="range" min="3" max="18" value={width} onChange={event => setWidth(Number(event.target.value))} /></label>
        <button type="button" aria-label="Undo last line" disabled={strokes.length === 0} onClick={undo}><span aria-hidden="true">↶</span> Undo</button>
        <button type="button" aria-label="Redo last line" disabled={redo.length === 0} onClick={redoStroke}><span aria-hidden="true">↷</span> Redo</button>
      </fieldset> : null}

      <div className={styles.stage}>
        <div className={styles.canvasFrame}>
          <svg className={styles.canvas} viewBox={`0 0 ${DRAW_WIDTH} ${DRAW_HEIGHT}`} role="img" aria-label={toolMode === 'draw' ? 'Drawing paper. Drag to draw.' : toolMode === 'select' ? 'Tap a piece of your drawing to choose it.' : 'Draw a trail where your piece should repeat.'}
            onPointerDown={startStroke} onPointerMove={extendStroke} onPointerUp={finishStroke} onPointerCancel={cancelStroke}
            onPointerLeave={event => { if (draftRef.current !== null && event.buttons === 0) cancelStroke(event); }}>
            <defs><marker id="guide-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 12 6 L 0 12 z" fill="#a65636" /></marker></defs>
            <rect x="0" y="0" width={DRAW_WIDTH} height={DRAW_HEIGHT} rx="26" className={styles.canvasPaper} />
            <g data-layer="source" role="group" aria-label="Your source marks">
              {strokes.filter(stroke => selectedIds.has(stroke.strokeId)).map(stroke => <polyline key={`highlight-${stroke.strokeId}`} points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#8bd5c0" strokeWidth={stroke.width + 14} strokeLinecap="round" strokeLinejoin="round" opacity=".7" />)}
              {strokes.map(stroke => stroke.points.length === 1 ? <circle key={stroke.strokeId} cx={stroke.points[0]!.x} cy={stroke.points[0]!.y} r={stroke.width / 2} fill={stroke.color} /> : <polyline key={stroke.strokeId} points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
            </g>
            <g data-layer="guide" role="group" aria-label="Child-directed guide path">
              {toolMode === 'path' && pathPoints.length >= 2 ? <><polyline points={pathPoints.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#a65636" strokeWidth="6" strokeLinecap="round" strokeDasharray="12 10" markerEnd="url(#guide-arrow)" /><circle cx={pathPoints[0]!.x} cy={pathPoints[0]!.y} r="9" fill="#a65636" /></> : null}
            </g>
            <g data-layer="derived-preview" role="group" aria-label="Temporary repeat preview">
              {previewVisible && toolMode === 'path' ? preview?.strokes.map(stroke => stroke.points.length === 1 ? <circle key={stroke.previewStrokeId} cx={stroke.points[0]!.x} cy={stroke.points[0]!.y} r={stroke.width / 2} fill={stroke.color} /> : <polyline key={stroke.previewStrokeId} points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" opacity=".85" />) : null}
            </g>
          </svg>
          {strokes.length === 0 && draftStroke === null ? <div className={styles.emptyCanvas}><svg viewBox="0 0 140 60" aria-hidden="true"><path d="M15 45 Q30 8 48 36 T84 26 T125 25" stroke="currentColor" fill="none" strokeWidth="6" strokeLinecap="round" /><path d="M117 7 L133 18 L123 32 L107 21 Z" fill="currentColor" /></svg><b>Draw here!</b></div> : null}
          {toolMode === 'select' ? <span className={styles.canvasCue}>☝ Tap a piece</span> : toolMode === 'path' && !canPreview ? <span className={styles.canvasCue}>↝ Draw a trail</span> : null}
        </div>

        <aside className={styles.dock} aria-label="Your next step">
          {toolMode === 'draw' && authority?.state !== 'saved' ? <>
            <button className={styles.primaryNext} type="button" disabled={busy || strokes.length === 0} onClick={() => { setToolMode('select'); setStatus('Tap the piece you want to repeat.'); }}>Repeat a piece <span aria-hidden="true">→</span></button>
            <details className={styles.moreTools}><summary>More drawing tools</summary><KeyboardInk disabled={busy} onDraw={keyboardLine} /><button type="button" disabled={busy || strokes.length === 0} onClick={clear}>Clear drawing</button></details>
          </> : null}
          {toolMode === 'select' ? <>
            {selectionCurrent ? <div className={styles.pieceCard}><SourceMark strokes={selectedStrokes} label="Your selected source mark, unchanged" /><b>This piece?</b></div> : null}
            <button className={styles.primaryNext} type="button" disabled={busy || !selectionCurrent} onClick={() => { setToolMode('path'); setPreviewVisible(document?.guidePath !== undefined); setStatus('Draw a trail for this piece.'); }}>Use this piece <span aria-hidden="true">→</span></button>
            <button className={styles.quietBack} type="button" disabled={busy} onClick={drawAgain}>← Keep drawing</button>
            <details className={styles.moreTools}><summary>Choose from my pieces</summary><label>Pick one<select aria-label="Choose a source mark" value={document?.selection?.strokeIds[0] ?? ''} disabled={busy} onChange={event => { if(event.target.value) selectMark(event.target.value); }}><option value="">Choose a line…</option>{document?.strokes.map((stroke,index) => <option key={stroke.strokeId} value={stroke.strokeId}>{stroke.strokeId.startsWith('stroke_scale') ? `Practice orange diamond ${stroke.strokeId.endsWith('001') ? '1' : stroke.strokeId.endsWith('002') ? '2' : '3'}` : `Line ${index + 1}`}</option>)}</select></label></details>
          </> : null}
          {toolMode === 'path' && !canPreview ? <>
            <div className={styles.pieceCard}><SourceMark strokes={selectedStrokes} label="The exact piece to repeat" /><b>Give it a trail.</b></div>
            <KeyboardPath onChoose={choosePath} disabled={busy} />
            <button className={styles.quietBack} type="button" disabled={busy} onClick={() => setToolMode('select')}>← Pick another piece</button>
          </> : null}

          {canPreview && authority?.state !== 'saved' ? <div className={styles.lookPanel} ref={reviewHeading} tabIndex={-1}>
            <span className={styles.previewBadge}>{authority?.state === 'reviewing' ? 'Check it before you keep it' : 'Try it · not kept yet'}</span>
            <fieldset className={styles.lookChoices} disabled={actionBusy || writing || reviewBusy || interpreting || authority?.state === 'rejected'}>
              <legend>How far apart?</legend>
              <div>{(['close','even','wide'] as const).map(spacing => <button key={spacing} type="button" aria-pressed={currentProposal.spacing === spacing} onClick={() => chooseLook({spacing})}><PatternChoice kind={spacing} /><span>{spacing === 'close' ? 'Close' : spacing === 'even' ? 'Even' : 'Far apart'}</span></button>)}</div>
            </fieldset>
            <fieldset className={styles.lookChoices} disabled={actionBusy || writing || reviewBusy || interpreting || authority?.state === 'rejected'}>
              <legend>What size?</legend><div>{(['constant','smaller_toward_end'] as const).map(sizeProfile => <button key={sizeProfile} type="button" aria-pressed={currentProposal.sizeProfile === sizeProfile} onClick={() => chooseLook({sizeProfile})}><PatternChoice kind={sizeProfile === 'constant' ? 'same' : 'smaller'} /><span>{sizeProfile === 'constant' ? 'Same size' : 'Get smaller'}</span></button>)}</div>
            </fieldset>
            {previewError !== null ? <p role="alert" className={styles.error}>{previewError}</p> : null}
            {authority === null ? <>
              <button className={styles.primaryNext} type="button" disabled={actionBusy || writing || reviewBusy || interpreting || previewError !== null} onClick={openMyReview}>{reviewBusy ? 'Opening…' : 'Make my stamp →'}</button>
              <p className={styles.shortHint}>Want another trail? Draw it on the paper.</p>
              <button className={styles.quietBack} type="button" disabled={busy} onClick={() => { setToolMode('select'); setPreviewVisible(false); clearInterpretation(); }}>← Choose another piece</button>
              <details className={styles.askPanel}><summary>Tell Kale your idea</summary><label>What should it do?<textarea ref={wordsInput} aria-label="What should your selected mark do?" value={childWords} maxLength={800} placeholder="Repeat my scale, smaller toward the end." onChange={event => { setChildWords(event.target.value); clearInterpretation(); }} /></label>
                <button type="button" className={styles.secondary} disabled={!childWords.trim() || interpreting || writing || reviewBusy || actionBusy} onClick={() => { void askKaleToReadWords(); }}>{interpreting ? 'Thinking…' : 'Try my idea'}</button>
                {interpretationNote !== null ? <p role="status">{interpretationNote}</p> : null}
                {groundedIdea !== null ? <div className={styles.groundingCard}><b>Kale’s idea · you choose</b><p>{groundedIdea.proposal.spacing === 'close' ? 'Close together' : groundedIdea.proposal.spacing === 'wide' ? 'Far apart' : 'Even spacing'} · {groundedIdea.proposal.sizeProfile === 'constant' ? 'same size' : 'getting smaller'}</p><button className={styles.secondary} type="button" disabled={reviewBusy || writing || actionBusy} onClick={() => { void beginReview({ proposal: groundedIdea.proposal, childWords: groundedIdea.request.childWords, origin:'model', sourceDigest:groundedIdea.sourceDigest, guidePathRevision:groundedIdea.guidePathRevision }); }}>Check Kale’s idea</button></div> : null}
                <small>Only these words go to AI—not your drawing. You can use the picture buttons without AI.</small>
              </details>
            </> : null}
            {authority?.state === 'reviewing' ? <fieldset className={styles.keepPanel} disabled={actionBusy || writing || saving}>
              <legend>Name your stamp</legend><input aria-label="Tool name" value={toolName} maxLength={80} onChange={event => setToolName(event.target.value)} />
              <p>Your piece + this look. Keep it for another drawing?</p>
              <button className={styles.primaryNext} type="button" disabled={!durable || !toolName.trim() || previewError !== null} onClick={() => { void approveProposal(); }}>{saving ? 'Keeping…' : 'Keep my stamp ✓'}</button>
              <button className={styles.quietBack} type="button" onClick={() => { void rejectProposal(); }}>No, change it</button>
            </fieldset> : null}
            {authority?.state === 'rejected' ? <div><p>Not kept. Your drawing is still here.</p><button ref={retryRef} className={styles.primaryNext} type="button" disabled={actionBusy} onClick={() => { setAuthority(null); clearInterpretation(); setChildWords(''); requestAnimationFrame(() => reviewHeading.current?.focus()); }}>Try another look</button></div> : null}
          </div> : null}
          {authority?.state === 'saved' ? <div className={styles.savedCard} ref={savedRef} tabIndex={-1}><SourceMark strokes={selectedStrokes} label="The piece you kept in your stamp" /><b>✓ {toolName}</b><p>Yours to use again.</p>{onSaved ? <button className={styles.primaryNext} type="button" onClick={onSaved}>Stamp on a new trail →</button> : <Link href="/draw/library">Use my stamp →</Link>}</div> : null}
          {authority !== null ? <details className={styles.receipt}><summary>How it was made</summary><ol className={styles.provenanceRail}><li>{isPractice ? 'You chose a practice mark and directed its path.' : 'You made the mark and chose its path.'}</li><li>Your instruction: “{authority.childWords}”</li><li>{authority.origin === 'model' ? 'Kale suggested' : 'You chose'}: {startingIdea?.proposal.kind === 'draw_pattern' ? `${startingIdea.proposal.spacing} spacing, ${startingIdea.proposal.sizeProfile.replaceAll('_',' ')}` : 'a bounded repeat'}.</li><li>{authority.events.some(entry => entry.type === 'child_edit') ? `You changed it to ${authority.proposal.spacing} spacing, ${authority.proposal.sizeProfile.replaceAll('_',' ')}.` : 'Your changes stay separate from the starting idea.'}</li><li>{authority.state === 'saved' ? <Link href={`/parent/tools?tool=${encodeURIComponent(authority.toolId)}`}>Show its story →</Link> : 'Only you can save it.'}</li></ol><p>{isPractice ? 'Practice mark' : 'Your marks'} · Current draft not saved as a tool unless you keep it. Saved versions run locally without AI.</p></details> : null}
        </aside>
      </div>
      <footer className={styles.footer}><p role="status">{writing ? 'Keeping your drawing…' : status}</p>{preview !== null ? <span>{preview.stampCount} repeats{authority?.state !== 'saved' ? ' · preview' : ' · kept'}</span> : null}</footer>
      {error !== null ? <div className={styles.error} role="alert"><p>{error}</p><button type="button" onClick={downloadDrawing}>Download my drawing before reloading</button></div> : null}
    </section>
  );
}
