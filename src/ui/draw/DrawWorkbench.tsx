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
import { liveDrawPreview } from './liveDrawPreview';
import { downloadPicture } from './pictureExport';
import { appendToolApplication, renderToolApplications } from '../../core/draw/applications';
import { assertCapabilityGraph, type CapabilityGraph } from '../../core/capability/graph';
import { runSavedDrawCapability } from '../../core/capability/drawReuse';
import { MAX_PREVIEW_POINTS, MAX_PREVIEW_STAMPS } from '../../core/draw/preview';
import { assertCanAddLine, exceedsDrawingBudget } from './drawingBudget';

import { type CSSProperties, type PointerEvent, type Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

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

type ToolMode = 'draw' | 'select' | 'path' | 'saved';

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

export type DrawWorkbenchHandle = { useTool: (toolId: string) => void };
export function DrawWorkbench({ onSaved, controlsRef }: { onSaved?: (toolId: string) => void; controlsRef?: Ref<DrawWorkbenchHandle> } = {}) {
  const [document, setDocument] = useState<DrawDocument | null>(null);
  const [draftStroke, setDraftStroke] = useState<DrawStroke | null>(null);
  const [guideDraft, setGuideDraft] = useState<readonly DrawPoint[] | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('draw');
  const [redo, setRedo] = useState<readonly DrawStroke[]>([]);
  const [color, setColor] = useState<(typeof PALETTE)[number]>('#294f46');
  const [width, setWidth] = useState(7);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [previewControls, setPreviewControls] = useState<DrawPreviewControls>(DEFAULT_DRAW_PREVIEW_CONTROLS);
  const [authority, setAuthority] = useState<AuthoritySession | null>(null);
  const [brush, setBrush] = useState<CapabilityGraph | null>(null);
  const [applicationGraphs, setApplicationGraphs] = useState<ReadonlyMap<string, CapabilityGraph>>(new Map());
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [childWords, setChildWords] = useState('');
  const [groundedIdea, setGroundedIdea] = useState<GroundedDrawIdea | null>(null);
  const [interpretationNote, setInterpretationNote] = useState<string | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [toolName, setToolName] = useState('My drawing tool');
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
  const keepPanel = useRef<HTMLFieldSetElement>(null);
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
  const paper = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false, generation = 0;
    async function refresh() {
      const token = ++generation;
      const repo = capabilityRepository.current;
      if (!repo) return;
      setApplicationsLoading(true);
      const ids = [...new Set(documentRef.current?.applications?.map(item => item.toolId) ?? [])];
      const resolved = await Promise.all(ids.map(async id => {
        try {
          const raw = await repo!.getGraph(id);
          if (!raw || ![DRAW_OWNER_ID, DRAW_PRACTICE_OWNER].includes(raw.tool.ownerChildId)) return null;
          return [id, assertCapabilityGraph(raw)] as const;
        } catch { return null; }
      }));
      if (!cancelled && token === generation) { setApplicationGraphs(new Map(resolved.filter(item => item !== null))); setApplicationsLoading(false); }
    }
    function changed() { setApplicationGraphs(new Map()); setBrush(null); void refresh(); }
    void refresh();
    window.addEventListener('focus', changed); window.addEventListener('kale-data-changed', changed);
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('kale-data-rights');
    if (channel) channel.onmessage = changed;
    return () => { cancelled = true; generation++; channel?.close(); window.removeEventListener('focus', changed); window.removeEventListener('kale-data-changed', changed); };
  }, [ready, document?.documentId, document?.applications]);

  async function openBrush(toolId: string, keepReviewedPath = false) {
    if (!ready || actionBusyRef.current || reviewBusyRef.current || authority?.state === 'reviewing' || saveFailed) { setError('Finish or cancel your tool review before choosing another tool. Your drawing is still here.'); return; }
    actionBusyRef.current = true; setActionBusy(true);
    try {
      await writeQueue.current?.flush();
      const drawing = documentRef.current;
      const raw = await capabilityRepository.current?.getGraph(toolId);
      if (!drawing || !raw || ![DRAW_OWNER_ID, DRAW_PRACTICE_OWNER].includes(raw.tool.ownerChildId)) throw new Error('This tool is no longer available. Your picture is unchanged.');
      const graph = assertCapabilityGraph(raw);
      if (graph.tool.kind !== 'draw_pattern' || graph.tool.currentVersionId === null) throw new Error('Choose a saved drawing tool.');
      let next = { ...drawing, revision: drawing.revision + 1, selection: undefined, guidePath: undefined, updatedAt: timestamp() };
      if (keepReviewedPath && drawing.guidePath) {
        if ((drawing.applications?.length ?? 0) >= 24) throw new Error('This picture has 24 trails. Undo one, or use your saved tool in a new drawing.');
        next = { ...appendToolApplication(next, { applicationId: `draw_application_${crypto.randomUUID().replaceAll('-', '')}`, toolId, versionId: graph.tool.currentVersionId, path: drawing.guidePath.points, createdAt: timestamp() }), selection: undefined, guidePath: undefined };
        const result = renderToolApplications(next, new Map([...applicationGraphs, [toolId, graph]]));
        if (result.unavailable.includes(next.applications!.at(-1)!.applicationId)) throw new Error('This picture is full. Your saved tool is ready for a new drawing.');
      }
      setApplicationGraphs(items => new Map([...items, [toolId, graph]]));
      setActive(next); setBrush(graph); setAuthority(null); setPreviewVisible(false); clearInterpretation(); setToolMode('saved');
      requestAnimationFrame(() => paper.current?.focus());
      await persist(next, `${graph.tool.displayName} is ready on this picture. Drag to add more!`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'That tool could not open. Your picture is unchanged.'); }
    finally { actionBusyRef.current = false; setActionBusy(false); }
  }

  async function addBrushPath(points: readonly DrawPoint[]) {
    if (!brush || !documentRef.current || applicationsLoading || !isUsableGuidePath(points) || actionBusyRef.current || pendingWrites.current > 0) return;
    actionBusyRef.current = true; setActionBusy(true);
    try {
      if ((documentRef.current.applications?.length ?? 0) >= 24) throw new Error('This picture has 24 trails. Undo one, or start a new drawing.');
      const raw = await capabilityRepository.current?.getGraph(brush.tool.toolId);
      if (!raw) throw new Error('This tool was deleted. Your earlier drawing is kept.');
      const graph = assertCapabilityGraph(raw);
      if (graph.tool.currentVersionId !== brush.tool.currentVersionId || !graph.tool.currentVersionId) throw new Error('This tool changed. Choose it again from My tools.');
      const next = appendToolApplication(documentRef.current, { applicationId: `draw_application_${crypto.randomUUID().replaceAll('-', '')}`, toolId: graph.tool.toolId, versionId: graph.tool.currentVersionId, path: [...points], createdAt: timestamp() });
      const rendered = renderToolApplications(next, new Map([...applicationGraphs, [graph.tool.toolId, graph]]));
      if (rendered.unavailable.includes(next.applications!.at(-1)!.applicationId)) throw new Error('This picture has enough patterns for now. Undo a pattern or start a new drawing.');
      setApplicationGraphs(items => new Map([...items, [graph.tool.toolId, graph]])); setActive(next);
      await persist(next, 'Added to your picture. Keep drawing, or take your picture with you!');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'That pattern could not be kept. Your earlier picture is here.'); }
    finally { actionBusyRef.current = false; setActionBusy(false); }
  }

  useEffect(() => {
    if (authority?.state === 'reviewing') keepPanel.current?.focus();
  }, [authority?.state]);

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
        else if (latest.ownerChildId === DRAW_PRACTICE_OWNER && !latest.applications?.length) setToolMode('select');
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
              setStatus('Your tool is saved. Draw with it again!');
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
    setShowOriginal(false);
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
    setToolName('My drawing tool');
    setStatus(kind === 'practice' ? 'Practice drawing loaded. Every line is still yours to change.' : 'A blank page is ready for your mark.');
    await persist(created, kind === 'practice' ? 'Practice drawing saved on this device.' : 'Blank drawing saved on this device.');
    } catch { setError('A new drawing could not open. Your current drawing is kept.'); }
    finally { actionBusyRef.current = false; setActionBusy(false); }
  }

  function startStroke(event: PointerEvent<SVGSVGElement>): void {
    if (document === null || exceedsDrawingBudget(document) || !ready || applicationsLoading || actionBusyRef.current || reviewBusyRef.current || pendingWrites.current > 0 || authority?.state === 'reviewing' || authority?.state === 'saved' || event.button !== 0) return;
    if (toolMode === 'select') {
      const stroke = hitTestStroke(document.strokes, pointFromEvent(event), 18);
      if (stroke === null) {
        setStatus('Tap a line you drew, or choose its picture beside the paper.');
        return;
      }
      selectMark(stroke.strokeId);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    if (toolMode === 'path' || toolMode === 'saved') {
      if (toolMode === 'saved' && brush === null) { setStatus('Choose your tool again from My tools. Your picture is kept.'); return; }
      setShowOriginal(false);
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
    if (toolMode === 'path' || toolMode === 'saved') {
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
    if (toolMode === 'saved') {
      const points = guideRef.current === null ? null : samplePoint(guideRef.current, pointFromEvent(event), 0);
      guideRef.current = null; setGuideDraft(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (points !== null) void addBrushPath(points);
      return;
    }
    if (toolMode === 'path') {
      const activePath = guideRef.current === null ? null : samplePoint(guideRef.current, pointFromEvent(event), 0);
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
      void persist(next, 'Made from your drawing. Try another look, or keep this one.');
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
    void persist(next, 'Your drawing is kept on this device.');
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
    if (documentRef.current === null || actionBusyRef.current || reviewBusyRef.current || pendingWrites.current > 0 || authority?.state === 'reviewing' || authority?.state === 'saved') return;
    const next = setMarkSelection(documentRef.current, [strokeId], timestamp());
    setActive(next); setToolMode('path'); setPreviewVisible(next.guidePath !== undefined); setAuthority(null); clearInterpretation();
    void persist(next, 'Now drag on the paper to make more of this drawing.');
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
      setStatus('Here is Kale’s idea. You can change it or keep playing.');
    } catch (caught) {
      if (requestGeneration !== interpretationGeneration.current) return;
      setGroundedIdea(null);
      setInterpretationNote(caught instanceof Error ? caught.message : 'Kale is unavailable right now. You can still review your own settings.');
    } finally {
      if (requestGeneration === interpretationGeneration.current) setInterpreting(false);
    }
  }

  async function beginReview(seed: ReviewSeed): Promise<void> {
    if (reviewBusyRef.current || actionBusyRef.current || pendingWrites.current > 0 || guideRef.current !== null || draftRef.current !== null) return;
    if (document === null || !isMarkSelectionCurrent(document) || document.guidePath === undefined || capabilityRepository.current === null) return;
    if (seed.sourceDigest !== undefined && (seed.sourceDigest !== document.contentDigest || seed.guidePathRevision !== document.guidePath.revision)) {
      clearInterpretation();
      setStatus('Your drawing changed. Try your idea again when you are ready.');
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
      setStatus('That is your choice now. Does it look right?');
    } catch { setError('We could not record that change. Try it again; nothing has been saved.'); }
    finally { actionBusyRef.current = false; setActionBusy(false); }
  }

  async function rejectProposal(): Promise<void> {
    if (actionBusyRef.current || authority === null || authority.state !== 'reviewing' || capabilityRepository.current === null) return;
    actionBusyRef.current = true; setActionBusy(true);
    const rejection: CapabilityLedgerEntry = { type: 'child_rejection', eventId: `event_${new Date(timestamp()).getTime()}${(++strokeCounter.current).toString().padStart(2, '0')}`, toolId: authority.toolId, sequence: authority.events.length + 1, occurredAt: timestamp(), actor: 'child', candidateEventId: authority.candidateEventId, reason: 'I do not want to save this starting idea.' };
    try {
      await capabilityRepository.current.append(rejection);
      setAuthority(null); clearInterpretation();
      requestAnimationFrame(() => retryRef.current?.focus());
      setStatus('Not saved. Keep playing — your drawing is still here.');
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
      setStatus(`${toolName} is saved in My tools. You can use it again!`);
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
    if (toolMode === 'saved') return { preview: null, error: null };
    if ((!previewVisible && guideDraft === null) || document === null || exceedsDrawingBudget(document)) return { preview: null, error: null };
    try { return { preview: liveDrawPreview(document, previewControls, guideDraft), error: null }; }
    catch (caught) { return { preview: null, error: caught instanceof Error ? caught.message : 'That preview could not be made yet.' }; }
  }, [previewVisible, document, previewControls, guideDraft, toolMode]);
  const picture = useMemo(() => document === null ? { strokes: [], unavailable: [], pointCount: 0 } : renderToolApplications(document, applicationGraphs), [document, applicationGraphs]);
  const brushPreview = useMemo(() => {
    if (toolMode !== 'saved' || brush === null || guideDraft === null) return null;
    try {
      const version = brush.versions.find(item => item.versionId === brush.tool.currentVersionId);
      if (version?.kind !== 'draw_pattern') return null;
      const snapshot = brush.snapshots.find(item => item.snapshotId === version.markSnapshotId);
      if (!snapshot) return null;
      const result = runSavedDrawCapability({ snapshot, version, pathId: 'draw_path_picture_live', path: guideDraft });
      if (picture.pointCount + result.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0) > MAX_PREVIEW_POINTS || picture.strokes.length + result.strokes.length > MAX_PREVIEW_STAMPS * 32) return null;
      return result;
    } catch { return null; }
  }, [toolMode, brush, guideDraft, picture]);
  const overBudget = document !== null && exceedsDrawingBudget(document);
  const sourceLocked = overBudget || actionBusy || reviewBusy || writing || applicationsLoading || authority?.state === 'reviewing' || authority?.state === 'saved';


  const strokes = document === null || overBudget ? [] : [...document.strokes, ...(draftStroke === null ? [] : [draftStroke])];
  const selectionCurrent = document !== null && isMarkSelectionCurrent(document);
  const selectedIds = selectionCurrent ? new Set(document.selection?.strokeIds ?? []) : new Set<string>();
  const selectedStrokes = strokes.filter(stroke => selectedIds.has(stroke.strokeId));
  const pathPoints = guideDraft ?? document?.guidePath?.points ?? [];
  const canPreview = selectionCurrent && document?.guidePath !== undefined && toolMode === 'path';
  const isPractice = document?.ownerChildId === DRAW_PRACTICE_OWNER || document?.documentId.startsWith(PRACTICE_ID);
  const startingIdea = authority?.events.find((entry) => entry.type === 'capability_candidate');
  const { preview, error: previewError } = previewState;
  const prompt = authority?.state === 'saved' ? 'Look what you made!' : 'Draw it. Make more of it.';
  // Small visual tray, with every line still available through the keyboard chooser.
  const sourceChoices = document === null || overBudget ? [] : document.strokes.filter(stroke => selectedIds.has(stroke.strokeId) || document.strokes.indexOf(stroke) >= document.strokes.length - 6);
  const currentProposal = authority?.state === 'reviewing' ? authority.proposal : proposalFromControls();
  const busy = !ready || sourceLocked || actionBusy || interpreting;
  function chooseLook(patch: { spacing?: 'close' | 'even' | 'wide'; sizeProfile?: 'constant' | 'smaller_toward_end' }) {
    setShowOriginal(false);
    if (authority?.state === 'reviewing') { void editProposal(patch); return; }
    const proposal = { ...proposalFromControls(), ...patch };
    clearInterpretation(); applyProposalToPreview(proposal); setPreviewVisible(true);
  }
  function openMyReview() {
    setShowOriginal(false);
    const words = pictureInstruction(proposalFromControls());
    void beginReview({ proposal: proposalFromControls(), childWords: words, origin: 'manual' });
  }
  function drawAgain() {
    setToolMode('draw'); setPreviewVisible(false); clearInterpretation();
    setStatus('Keep drawing. Your lines are still here.');
  }
  useImperativeHandle(controlsRef, () => ({ useTool: toolId => { void openBrush(toolId); } }));
  return (
    <section className={styles.workbench} aria-labelledby="draw-workbench-title">
      <header className={styles.workbenchHeader}>
        <h2 id="draw-workbench-title">{prompt}</h2>
        <div className={styles.startActions}>
          <button className={styles.swap} type="button" disabled={!ready || writing || actionBusy || reviewBusy || saving || interpreting || authority?.state === 'reviewing' || saveFailed} onClick={() => { void start('practice'); }}><DrawSymbol kind="diamond" /> Try a dragon</button>
          <button className={styles.swap} type="button" disabled={!ready || writing || actionBusy || reviewBusy || saving || interpreting || authority?.state === 'reviewing' || saveFailed} onClick={() => { void start('blank'); }}><DrawSymbol kind="plus" /> New drawing</button>
        </div>
      </header>
      {isPractice ? <p className={styles.practiceBadge}>Practice dragon{document?.applications?.length ? ' · your saved picture' : ' · tap an orange diamond to try it'}</p> : null}
      {!durable ? <p className={styles.error} role="status">Saving is unavailable. You can draw, but your work will not stay after refresh.</p> : null}
      {overBudget ? <div className={styles.error} role="alert"><p>This drawing is too detailed to show safely. It has not been changed.</p><button type="button" onClick={downloadDrawing}>Download my complete drawing</button></div> : null}

      <div className={styles.deskControls}>
      <div className={styles.toolShelf} role="group" aria-label="Paper tools">
        <button type="button" aria-pressed={toolMode === 'draw'} disabled={busy} onClick={drawAgain}><DrawSymbol kind="pencil" /><span>Draw</span></button>
        <button type="button" aria-pressed={toolMode === 'select' || toolMode === 'path'} disabled={busy || strokes.length === 0} onClick={() => { setToolMode(selectionCurrent ? 'path' : 'select'); setPreviewVisible(selectionCurrent && document?.guidePath !== undefined); clearInterpretation(); setStatus(selectionCurrent ? 'Drag to make more of your drawing.' : 'Tap a line in your drawing, or its picture below.'); }}><DrawSymbol kind="repeat" /><span>Make a tool</span></button>
        {brush ? <button type="button" aria-pressed={toolMode === 'saved'} disabled={busy} onClick={() => { setToolMode('saved'); setPreviewVisible(false); clearInterpretation(); }}><DrawSymbol kind="repeat" /><span>{brush.tool.displayName}</span></button> : null}
        <span className={styles.toolHint}>{authority?.state === 'saved' ? 'Saved in My tools' : toolMode === 'draw' ? 'Your ideas. Your colours.' : toolMode === 'select' ? 'Which drawing do you want more of?' : 'Drag your finger. Watch it repeat!'}</span>
      </div>
      {authority?.state !== 'saved' && toolMode !== 'saved' ? <fieldset className={styles.inkBar} disabled={busy}>
        <legend className={styles.screenReader}>Drawing tools</legend>
        <div className={styles.palette} role="group" aria-label="Ink colours">{PALETTE.map((value,index) => <button key={value} type="button" className={styles.swatch} data-selected={color === value} style={{ '--swatch': value } as CSSProperties} aria-label={`Use ${['forest','terracotta','violet','teal','gold'][index]} ink`} aria-pressed={color === value} onClick={() => { setColor(value); drawAgain(); }} />)}</div>
        <label className={styles.penSize}><span>Thin — thick</span><input aria-label="Line weight" type="range" min="3" max="18" value={width} onChange={event => { setWidth(Number(event.target.value)); drawAgain(); }} /></label>
        <button type="button" aria-label="Undo last line" disabled={strokes.length === 0} onClick={() => { drawAgain(); undo(); }}><span aria-hidden="true">↶</span> Undo</button>
        <button type="button" aria-label="Redo last line" disabled={redo.length === 0} onClick={() => { drawAgain(); redoStroke(); }}><span aria-hidden="true">↷</span> Redo</button>
      </fieldset> : null}
      </div>

      <div className={styles.stage}>
        {(canPreview && preview !== null) || (document?.applications?.length ?? 0) > 0 ? <div className={styles.pictureBar} role="group" aria-label="Your picture">
          <button type="button" aria-pressed={showOriginal} disabled={guideDraft !== null} onClick={() => setShowOriginal(value => !value)}>{showOriginal ? 'Show my pattern' : 'Show my original'}</button>
          <span>{showOriginal ? 'Your original drawing' : (document?.applications?.length ?? 0) > 0 ? `${document!.applications!.length} saved ${document!.applications!.length === 1 ? 'trail' : 'trails'} · your picture keeps growing` : `${preview?.stampCount ?? 0} copies · made from your drawing`}</span>
          <button type="button" disabled={writing || guideDraft !== null || applicationsLoading} onClick={() => { try { downloadPicture([...strokes, ...(!showOriginal ? picture.strokes : []), ...(!showOriginal && toolMode === 'path' ? preview?.strokes ?? [] : [])]); setStatus('Picture download started. Look in your downloads!'); } catch { setError('Your picture could not download. Your work is still here.'); } }}>↓ Get picture</button>
        </div> : null}
        <div className={styles.canvasFrame}>
          <svg ref={paper} tabIndex={-1} className={styles.canvas} viewBox={`0 0 ${DRAW_WIDTH} ${DRAW_HEIGHT}`} role="img" aria-label={toolMode === 'saved' ? `Draw with ${brush?.tool.displayName ?? 'your saved tool'}. Drag to add to your picture.` : toolMode === 'draw' ? 'Drawing paper. Drag to draw.' : toolMode === 'select' ? 'Tap a line in your drawing to repeat it.' : 'Drag on the paper to repeat your chosen drawing.'}
            onPointerDown={startStroke} onPointerMove={extendStroke} onPointerUp={finishStroke} onPointerCancel={cancelStroke}
            onPointerLeave={event => { if (draftRef.current !== null && event.buttons === 0) cancelStroke(event); }}>
            <defs><marker id="guide-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 12 6 L 0 12 z" fill="#a65636" /></marker></defs>
            <rect x="0" y="0" width={DRAW_WIDTH} height={DRAW_HEIGHT} rx="26" className={styles.canvasPaper} />
            <g data-layer="source" role="group" aria-label="Your source marks">
              {!showOriginal && toolMode !== 'draw' ? strokes.filter(stroke => selectedIds.has(stroke.strokeId)).map(stroke => <polyline key={`highlight-${stroke.strokeId}`} points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#8bd5c0" strokeWidth={stroke.width + 14} strokeLinecap="round" strokeLinejoin="round" opacity=".7" />) : null}
              {strokes.map(stroke => stroke.points.length === 1 ? <circle key={stroke.strokeId} cx={stroke.points[0]!.x} cy={stroke.points[0]!.y} r={stroke.width / 2} fill={stroke.color} /> : <polyline key={stroke.strokeId} points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
            </g>
            <g data-layer="guide" role="group" aria-label="Child-directed guide path">
              {toolMode === 'path' && pathPoints.length >= 2 && (guideDraft !== null || preview === null) ? <><polyline points={pathPoints.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#a65636" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 10" markerEnd="url(#guide-arrow)" /><circle cx={pathPoints[0]!.x} cy={pathPoints[0]!.y} r="7" fill="#a65636" /></> : null}
            </g>
            <g data-layer="derived-preview" role="group" aria-label="Temporary repeat preview">
              {toolMode === 'path' && !showOriginal ? preview?.strokes.map(stroke => stroke.points.length === 1 ? <circle key={stroke.previewStrokeId} cx={stroke.points[0]!.x} cy={stroke.points[0]!.y} r={stroke.width / 2} fill={stroke.color} /> : <polyline key={stroke.previewStrokeId} points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />) : null}
            </g>
            {!showOriginal ? <g data-layer="saved-tool-artwork" role="group" aria-label="Patterns made with your saved tools">{[...picture.strokes, ...(brushPreview?.strokes ?? [])].map(stroke => stroke.points.length === 1 ? <circle key={stroke.previewStrokeId} cx={stroke.points[0]!.x} cy={stroke.points[0]!.y} r={stroke.width / 2} fill={stroke.color} /> : <polyline key={stroke.previewStrokeId} points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}</g> : null}
          </svg>
          {strokes.length === 0 && draftStroke === null && picture.strokes.length === 0 && brushPreview === null ? <div className={styles.emptyCanvas}><svg viewBox="0 0 140 60" aria-hidden="true"><path d="M15 45 Q30 8 48 36 T84 26 T125 25" stroke="currentColor" fill="none" strokeWidth="6" strokeLinecap="round" /><path d="M117 7 L133 18 L123 32 L107 21 Z" fill="currentColor" /></svg><b>Draw here!</b></div> : null}
          {toolMode === 'select' ? <span className={styles.canvasCue}>Tap a line you drew</span> : toolMode === 'path' && !canPreview && guideDraft === null ? <span className={styles.canvasCue}>Drag here to make more</span> : null}
        </div>

        <aside className={styles.dock} aria-label="Drawing choices">
          {toolMode === 'saved' ? <div className={styles.savedCard}><b>{brush?.tool.displayName ?? 'Choose a tool from My tools'}</b><p>Drag to add it to this picture. Each trail stays. Switch to Draw whenever you like.</p><KeyboardPath disabled={busy || brush === null} onChoose={points => { void addBrushPath(points); }} /><button className={styles.quietBack} type="button" disabled={busy || !document?.applications?.length} onClick={() => { if (!documentRef.current) return; const next = { ...documentRef.current, revision: documentRef.current.revision + 1, applications: documentRef.current.applications?.slice(0, -1), updatedAt: timestamp() }; setActive(next); void persist(next, 'Last pattern undone. Your hand-drawn lines are kept.'); }}>↶ Undo last pattern</button><button className={styles.quietBack} type="button" disabled={busy} onClick={drawAgain}>Draw more by hand</button></div> : null}
          {!applicationsLoading && picture.unavailable.length > 0 ? <p role="status" className={styles.shortHint}>A tool used here is missing or exceeds the picture limit. Its trail is hidden; your original drawing is kept.</p> : null}
          {canPreview && authority === null ? <button ref={retryRef} className={styles.primaryNext} type="button" disabled={actionBusy || writing || reviewBusy || interpreting || guideDraft !== null || previewError !== null} onClick={openMyReview}><DrawSymbol kind="folder" />{reviewBusy ? 'Opening…' : 'Save for later'}</button> : null}
          {toolMode === 'draw' && authority?.state !== 'saved' ? <>
            <div className={styles.playInvitation}><DrawSymbol kind="repeat" /><b>{strokes.length === 0 ? 'What could you make?' : 'Make more of your drawing'}</b><p>{strokes.length === 0 ? 'A raindrop? A curl? A tiny leaf? Draw it your way.' : 'Tap one. Then drag on the paper.'}</p></div>
            {sourceChoices.length > 0 ? <div className={styles.sourceTray} role="group" aria-label="Make more of a drawing">{sourceChoices.map(stroke => <button key={stroke.strokeId} type="button" aria-label={`Repeat line ${document!.strokes.indexOf(stroke) + 1}`} disabled={busy} onClick={() => selectMark(stroke.strokeId)}><SourceMark strokes={[stroke]} label="Your original drawn line" /></button>)}</div> : <div className={styles.ideaPicture} aria-hidden="true"><svg viewBox="0 0 220 92"><path d="M34 15 Q2 53 34 54 Q66 53 34 15 Z" fill="none" stroke="#15737c" strokeWidth="4"/><path d="M90 40 Q80 5 107 16 Q130 29 103 44 Q81 58 109 68" fill="none" stroke="#5c55a6" strokeWidth="4" strokeLinecap="round"/><path d="M158 66 Q136 22 193 17 Q196 61 158 66 M158 66 L184 29" fill="none" stroke="#294f46" strokeWidth="4" strokeLinecap="round"/></svg><span>Ideas to draw yourself</span></div>}
            <details className={styles.moreTools}><summary>More drawing tools</summary><KeyboardInk disabled={busy} onDraw={keyboardLine} /><button type="button" disabled={busy || strokes.length === 0} onClick={clear}>Clear drawing</button></details>
          </> : null}
          {toolMode !== 'draw' && toolMode !== 'saved' && authority === null ? <div className={styles.sourcePicker}>
            <b>{selectionCurrent ? 'Repeat this drawing' : 'Tap a drawing'}</b>
            <div className={styles.sourceTray} role="group" aria-label="Choose a drawing to repeat">{sourceChoices.map(stroke => <button key={stroke.strokeId} type="button" aria-label={`Repeat line ${document!.strokes.indexOf(stroke) + 1}`} aria-pressed={selectedIds.has(stroke.strokeId)} disabled={busy} onClick={() => selectMark(stroke.strokeId)}><SourceMark strokes={[stroke]} label="Original drawn line" /></button>)}</div>
            <details className={styles.moreTools}><summary>All my lines</summary><label>Choose a line<select aria-label="Choose a source mark" value={document?.selection?.strokeIds[0] ?? ''} disabled={busy} onChange={event => { if(event.target.value) selectMark(event.target.value); }}><option value="">Choose a line…</option>{document?.strokes.map((stroke,index) => <option key={stroke.strokeId} value={stroke.strokeId}>{stroke.strokeId.startsWith('stroke_scale') ? `Practice orange diamond ${stroke.strokeId.endsWith('001') ? '1' : stroke.strokeId.endsWith('002') ? '2' : '3'}` : `Line ${index + 1}`}</option>)}</select></label></details>
          </div> : null}
          {toolMode === 'path' && !canPreview ? <>
            <div className={styles.playInvitation}><DrawSymbol kind="repeat" /><b>Drag to make more!</b><p>Your drawing follows your finger.</p></div>
            <KeyboardPath onChoose={choosePath} disabled={busy} />
          </> : null}

          {canPreview && authority?.state !== 'saved' ? <div className={styles.lookPanel} ref={reviewHeading} tabIndex={-1}>
            <span className={styles.previewBadge}>{authority?.state === 'reviewing' ? 'Save this look?' : 'Play with the look'}</span>
            <fieldset className={styles.lookChoices} disabled={actionBusy || writing || reviewBusy || interpreting || authority?.state === 'rejected'}>
              <legend>How far apart?</legend>
              <div>{(['close','even','wide'] as const).map(spacing => <button key={spacing} type="button" aria-pressed={currentProposal.spacing === spacing} onClick={() => chooseLook({spacing})}><PatternChoice kind={spacing} strokes={selectedStrokes} /><span>{spacing === 'close' ? 'Close' : spacing === 'even' ? 'Even' : 'Far apart'}</span></button>)}</div>
            </fieldset>
            <fieldset className={styles.lookChoices} disabled={actionBusy || writing || reviewBusy || interpreting || authority?.state === 'rejected'}>
              <legend>What size?</legend><div>{(['constant','smaller_toward_end'] as const).map(sizeProfile => <button key={sizeProfile} type="button" aria-pressed={currentProposal.sizeProfile === sizeProfile} onClick={() => chooseLook({sizeProfile})}><PatternChoice kind={sizeProfile === 'constant' ? 'same' : 'smaller'} strokes={selectedStrokes} /><span>{sizeProfile === 'constant' ? 'Same size' : 'Get smaller'}</span></button>)}</div>
            </fieldset>
            {previewError !== null ? <p role="alert" className={styles.error}>{previewError}</p> : null}
            {authority === null ? <>
              <p className={styles.shortHint}>Keep playing! Drag anywhere to try a new line of copies.</p>
              <KeyboardPath onChoose={choosePath} disabled={busy} />
              <details className={styles.askPanel}><summary>Tell Kale your idea</summary><label>What should it do?<textarea ref={wordsInput} aria-label="What should your selected mark do?" value={childWords} maxLength={800} placeholder="Repeat my scale, smaller toward the end." onChange={event => { setChildWords(event.target.value); clearInterpretation(); }} /></label>
                <button type="button" className={styles.secondary} disabled={!childWords.trim() || interpreting || writing || reviewBusy || actionBusy} onClick={() => { void askKaleToReadWords(); }}>{interpreting ? 'Thinking…' : 'Try my idea'}</button>
                {interpretationNote !== null ? <p role="status">{interpretationNote}</p> : null}
                {groundedIdea !== null ? <div className={styles.groundingCard}><b>Kale’s idea · you choose</b><p>{groundedIdea.proposal.spacing === 'close' ? 'Close together' : groundedIdea.proposal.spacing === 'wide' ? 'Far apart' : 'Even spacing'} · {groundedIdea.proposal.sizeProfile === 'constant' ? 'same size' : 'getting smaller'}</p><button className={styles.secondary} type="button" disabled={reviewBusy || writing || actionBusy} onClick={() => { void beginReview({ proposal: groundedIdea.proposal, childWords: groundedIdea.request.childWords, origin:'model', sourceDigest:groundedIdea.sourceDigest, guidePathRevision:groundedIdea.guidePathRevision }); }}>Check Kale’s idea</button></div> : null}
                <small>Only these words go to AI—not your drawing. You can use the picture buttons without AI.</small>
              </details>
            </> : null}
            {authority?.state === 'reviewing' ? <fieldset className={styles.keepPanel} ref={keepPanel} tabIndex={-1} disabled={actionBusy || writing || saving}>
              <legend>Give it a name</legend><input aria-label="Tool name" value={toolName} maxLength={80} onChange={event => setToolName(event.target.value)} />
              <div className={styles.pieceCard}><SourceMark strokes={selectedStrokes} label="Your selected source mark, unchanged" /><p>This drawing + this look.<br />Use it again whenever you like.</p></div>
              <button className={styles.primaryNext} type="button" disabled={!durable || !toolName.trim() || previewError !== null} onClick={() => { void approveProposal(); }}>{saving ? 'Saving…' : 'Yes, save my tool ✓'}</button>
              <button className={styles.quietBack} type="button" onClick={() => { void rejectProposal(); }}>Not yet — keep playing</button>
            </fieldset> : null}
            {authority?.state === 'rejected' ? <div><p>Not kept. Your drawing is still here.</p><button ref={retryRef} className={styles.primaryNext} type="button" disabled={actionBusy} onClick={() => { setAuthority(null); clearInterpretation(); setChildWords(''); requestAnimationFrame(() => reviewHeading.current?.focus()); }}>Try another look</button></div> : null}
          </div> : null}
          {authority?.state === 'saved' ? <div className={styles.savedCard} ref={savedRef} tabIndex={-1}><SourceMark strokes={selectedStrokes} label="The original drawing in your saved tool" /><b>✓ {toolName}</b><p>Your tool is ready. Keep building this picture with it!</p><button className={styles.primaryNext} type="button" disabled={actionBusy || writing} onClick={() => { void openBrush(authority.toolId, true); }}>Draw with my tool →</button>{onSaved ? <button type="button" className={styles.quietBack} onClick={() => onSaved(authority.toolId)}>See it in My tools</button> : null}</div> : null}
          {authority !== null ? <details className={styles.receipt}><summary>How it was made</summary><ol className={styles.provenanceRail}><li>{isPractice ? 'You chose a practice mark and directed its path.' : 'You made the mark and chose its path.'}</li><li>Your instruction: “{authority.childWords}”</li><li>{authority.origin === 'model' ? 'Kale suggested' : 'You chose'}: {startingIdea?.proposal.kind === 'draw_pattern' ? `${startingIdea.proposal.spacing} spacing, ${startingIdea.proposal.sizeProfile.replaceAll('_',' ')}` : 'a bounded repeat'}.</li><li>{authority.events.some(entry => entry.type === 'child_edit') ? `You changed it to ${authority.proposal.spacing} spacing, ${authority.proposal.sizeProfile.replaceAll('_',' ')}.` : 'Your changes stay separate from the starting idea.'}</li><li>{authority.state === 'saved' ? <Link href={`/parent/tools?tool=${encodeURIComponent(authority.toolId)}`}>Show its story →</Link> : 'Only you can save it.'}</li></ol><p>{isPractice ? 'Practice mark' : 'Your marks'} · Current draft not saved as a tool unless you keep it. Saved versions run locally without AI.</p></details> : null}
        </aside>
      </div>
      <footer className={styles.footer}><p role="status">{writing ? 'Keeping your drawing…' : status}</p>{preview !== null ? <span>{preview.stampCount} repeats{authority?.state !== 'saved' ? ' · preview' : ' · kept'}</span> : null}</footer>
      {error !== null ? <div className={styles.error} role="alert"><p>{error}</p><button type="button" onClick={downloadDrawing}>Download my drawing before reloading</button></div> : null}
    </section>
  );
}
