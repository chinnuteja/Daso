'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { openIndexedDbRepositories } from '../../adapters/persistence';
import type { Repositories } from '../../core/ports/repositories';
import type { CapabilityDefinition } from '../../core/capability/types';
import { buildCapabilityParentEvidence, capabilityHash, exportCapabilityGraph } from '../../core/evidence/capability';
import { canonicalJson } from '../../core/serialization/canonicalJson';
import type { DrawPoint } from '../../core/draw/schema';
import styles from './CapabilityParentView.module.css';

type View = Awaited<ReturnType<typeof buildCapabilityParentEvidence>>;
type DeleteTarget = { kind: 'tool' | 'drawing' | 'profile'; toolId: string; documentId?: string; ownerChildId: string; name: string };
type Stroke = { points: readonly DrawPoint[]; color: string; width: number };

function Artwork({ strokes, label }: { strokes: readonly Stroke[]; label: string }) {
  const points = strokes.flatMap((stroke) => stroke.points);
  const xs = points.map((point) => point.x), ys = points.map((point) => point.y);
  const margin = Math.max(12, ...strokes.map((stroke) => stroke.width));
  const x = Math.min(...xs) - margin, y = Math.min(...ys) - margin;
  const width = Math.max(60, Math.max(...xs) - x + margin), height = Math.max(60, Math.max(...ys) - y + margin);
  return <svg className={styles.artwork} viewBox={`${x} ${y} ${width} ${height}`} role="img" aria-label={label}>{strokes.map((stroke, index) => stroke.points.length === 1
    ? <circle key={index} cx={stroke.points[0]!.x} cy={stroke.points[0]!.y} r={stroke.width / 2} fill={stroke.color} />
    : <polyline key={index} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}</svg>;
}

/** A local read view. It cannot submit an approval or ask a model to assess a child. */
export function CapabilityParentView() {
  const query = useSearchParams();
  const router = useRouter();
  const requestedTool = query.get('tool');
  const repositories = useRef<Repositories | null>(null);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const [tools, setTools] = useState<readonly CapabilityDefinition[]>([]);
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    let disposed = false, revision = 0;
    let close: (() => void) | undefined;
    let channel: BroadcastChannel | undefined;
    const refresh = async () => {
      if (busyRef.current || repositories.current === null) return;
      const token = ++revision;
      setView(null); setLoading(true); setError(null);
      try {
        const repo = repositories.current;
        const requested = requestedTool === null ? null : await repo.capabilities.getDefinition(requestedTool);
        const definitions = (await repo.capabilities.listDefinitionsByOwner(requested?.ownerChildId ?? 'child_local_01')).filter((tool) => tool.currentVersionId !== null);
        const chosen = requestedTool ?? definitions.at(-1)?.toolId;
        const graph = chosen === undefined ? null : await repo.capabilities.getGraph(chosen);
        const next = graph === null ? null : await buildCapabilityParentEvidence(graph);
        if (disposed || token !== revision) return;
        setTools(definitions); setView(next); setLoading(false);
      } catch {
        if (!disposed && token === revision) { setLoading(false); setTools([]); setView(null); setError('These saved records could not be verified. We have not invented a story or changed your data. Try opening the view again.'); }
      }
    };
    const onChange = () => { void refresh(); };
    void (async () => {
      const opened = await openIndexedDbRepositories();
      if (disposed) { opened.database.close(); return; }
      close = () => opened.database.close(); repositories.current = opened.repositories; refreshRef.current = refresh;
      await refresh();
      if (disposed) return;
      window.addEventListener('focus', onChange); window.addEventListener('kale-data-changed', onChange);
      if (typeof BroadcastChannel !== 'undefined') { channel = new BroadcastChannel('kale-data-rights'); channel.onmessage = onChange; }
    })().catch(() => { if (!disposed) { setLoading(false); setError('Local storage is unavailable. No empty substitute or invented evidence is being shown.'); } });
    return () => { disposed = true; revision++; repositories.current = null; refreshRef.current = null; close?.(); channel?.close(); window.removeEventListener('focus', onChange); window.removeEventListener('kale-data-changed', onChange); };
  }, [requestedTool]);

  useEffect(() => {
    if (target !== null) { dialog.current?.showModal(); cancel.current?.focus(); }
  }, [target]);

  function closeDialog() {
    if (busyRef.current) return;
    dialog.current?.close(); setTarget(null); setError(null);
  }
  function notifyChanges() {
    window.dispatchEvent(new Event('kale-data-changed'));
    if (typeof BroadcastChannel !== 'undefined') { const channel = new BroadcastChannel('kale-data-rights'); channel.postMessage({ type: 'changed' }); channel.close(); }
  }
  async function download() {
    if (view === null || repositories.current === null || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const graph = await repositories.current.capabilities.getGraph(view.tool.toolId);
      if (graph === null) throw new Error('This tool was deleted. There is no export to download.');
      const data = await exportCapabilityGraph(graph);
      const hash = await capabilityHash(data);
      const url = URL.createObjectURL(new Blob([canonicalJson(data)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `kale-tool-${graph.tool.toolId}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`Export prepared from current local records. SHA-256: ${hash}`);
    } catch (caught) { setView(null); setError(caught instanceof Error ? caught.message : 'The export could not be verified. Nothing was downloaded.'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function confirmDelete() {
    if (target === null || repositories.current === null || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const repo = repositories.current;
      if (target.kind === 'profile') await repo.profiles.deleteProfileGraph(target.ownerChildId);
      else if (target.kind === 'tool') await repo.tools.deleteToolGraph(target.toolId);
      else if (target.documentId !== undefined) await repo.drawAssets.deleteDocument(target.documentId);
      dialog.current?.close(); setTarget(null); setView(null);
      setNotice(target.kind === 'drawing' ? 'Source drawing deleted. This tool still holds its disclosed mark copy and reviewed path.' : target.kind === 'profile' ? 'This local child’s profile, owned tools, drawings and unfinished reviews were deleted.' : 'Tool deleted, including its saved mark copies, versions and review history. The original drawing is separate.');
      busyRef.current = false; setBusy(false);
      notifyChanges(); await refreshRef.current?.(); heading.current?.focus();
    } catch { setError('Deletion did not complete. Your data was not reported as deleted. Cancel, then reload and try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const drawOutput = view?.run.input.kind === 'draw_pattern' && 'strokes' in view.run.output ? view.run.output : undefined;
  const sourceDocument = view?.snapshot === undefined ? undefined : view.exportGraph.documents.find((item) => item.documentId === view.snapshot!.sourceDocumentId);
  return <section className={styles.page} aria-labelledby="parent-tools-title" aria-busy={loading}>
    <header className={styles.header}><p className={styles.eyebrow}>For parents · local records</p><h2 id="parent-tools-title" ref={heading} tabIndex={-1}>A little work.<br />A lasting tool.</h2><p>See what your child made, what they meant, and what they chose to keep. Their work comes first. The receipts are here when you need them.</p><div className={styles.badges}><span>Child-approved</span><span>No AI-written assessment</span><span>Artwork stays on this device</span></div></header>
    {tools.length > 0 ? <label className={styles.selector}>A saved tool to look at<select disabled={busy} value={view?.tool.toolId ?? requestedTool ?? ''} onChange={(event) => { setNotice(''); router.replace(`/parent/tools?tool=${encodeURIComponent(event.target.value)}`); }}><option value="" disabled>Choose a tool</option>{tools.map((tool) => <option key={tool.toolId} value={tool.toolId}>{tool.displayName} · {tool.kind === 'draw_pattern' ? 'Draw' : 'Flight Lab'}</option>)}</select></label> : null}
    {loading ? <p role="status">Opening and verifying the saved records…</p> : view === null ? <div className={styles.empty}><h3>{requestedTool !== null ? 'This saved tool is not here.' : 'No saved story yet.'}</h3><p>A preview or unfinished review is not a saved tool. After your child approves and saves one, you can see its story here. Nothing is being guessed.</p><Link href="/draw">Make a Draw tool →</Link><Link href="/flight">Explore Flight Lab →</Link>{requestedTool !== null ? <Link href="/parent/tools">Look at available tools →</Link> : null}</div> : <>
      <div className={styles.storyLayout}><aside className={styles.work}><p className={styles.eyebrow}>{view.tool.kind === 'draw_pattern' ? 'The exact mark they kept' : 'The observation behind the rule'}</p><h3>{view.tool.displayName}</h3><p className={styles.owner}>Owned by {view.ownerDisplayName}</p>
        {view.snapshot !== undefined ? <><Artwork strokes={view.snapshot.strokes} label="Exact saved copy of the child-selected source mark" /><p className={styles.caption}>Their strokes and colour. Not regenerated or beautified by AI.</p>{drawOutput !== undefined ? <><h4>The saved tool, running locally</h4><Artwork strokes={drawOutput.strokes} label="Deterministic replay of the saved mark along a path" /><p className={styles.caption}>{drawOutput.stampCount} repeats · {view.run.input.pathOrigin === 'reviewed_child_path' ? 'the path retained from their review' : view.run.input.pathOrigin === 'current_source_path' ? 'the current drawing’s path; the earlier review did not retain one' : 'an inspection example path, not a child’s recorded path'}.</p></> : null}<p className={styles.retention}>{view.sourceMissing ? 'The original drawing is gone. This tool keeps its own exact mark copy. Delete the tool to remove that copy, or delete all this child’s local data.' : 'A saved tool keeps a separate mark copy. Deleting only the source drawing does not delete this tool.'}</p></> : view.flight !== undefined ? <><div className={styles.fact}><b>{view.flight.selected.designName} · {view.flight.selected.distanceM} m</b><span>Recorded obstruction → left out</span></div><div className={styles.fact} data-clear><b>{view.flight.counterexample.designName} · {view.flight.counterexample.distanceM} m</b><span>No obstruction → still counts</span></div><p className={styles.caption}>Same distance. Different fact. {view.flight.isReviewedSelection ? 'This is the pair retained in the review.' : 'This is a comparison from stored practice data; the older review did not retain the selected pair.'}</p><div className={styles.comparison}><div><span>Before · no rule</span><b>{view.flight.before.winner ?? 'No winner'}</b><small>{view.flight.before.projections.filter((item) => item.validUnderCurrentVersion).length} counted</small></div><div><span>With the saved rule</span><b>{view.flight.after.winner ?? 'No winner'}</b><small>{view.flight.after.projections.filter((item) => item.validUnderCurrentVersion).length} counted</small></div></div><p className={styles.retention}>Labelled practice observations, not claims about experiments a child performed. Both results are recomputed now from the same stored data.</p></> : <p>The saved records do not retain a complete selected comparison. We will not invent one.</p>}
      </aside><div className={styles.story}><p className={styles.eyebrow}>How it became theirs</p><ol>{view.steps.map((step, index) => <li key={`${step.referenceId}-${index}`} data-actor={step.actor}><span className={styles.step}>{index + 1}</span><div><small>{step.actor === 'ai' ? 'Kale suggested' : step.actor === 'system' ? 'Local computation' : 'Child-authored decision'}</small><h3>{step.title}</h3>{step.title === 'Their words' ? <blockquote>“{step.text}”</blockquote> : <p>{step.text}</p>}</div></li>)}</ol><p className={styles.limits}>This explains recorded choices and reproducible behavior. It does not infer mastery, emotions, predictions or learning gains.</p></div></div>
      <details className={styles.receipts}><summary>Look under the hood · verified local receipts</summary><p>SHA-256 over canonical JSON · algorithm version {view.run.algorithmVersion}. Hashes make these bytes reproducible; they are not a signature or proof of who physically clicked.</p><dl><dt>Saved version</dt><dd>{view.run.versionId}</dd><dt>Child approval</dt><dd>{view.run.approvalEventId}</dd><dt>Evidence events</dt><dd>{view.run.sourceEventIds.join(', ')}</dd><dt>Version hash</dt><dd>{view.run.versionHash}</dd><dt>Replay input hash</dt><dd>{view.run.inputHash}</dd><dt>Replay output hash</dt><dd>{view.run.outputHash}</dd><dt>Source hash</dt><dd>{view.run.sourceHash}</dd>{'markHash' in view.run ? <><dt>Exact mark hash</dt><dd>{view.run.markHash}</dd></> : null}</dl><p>Runs in this export are marked <code>recomputed_for_evidence</code>. We do not store a history of when the saved tool was used. Suggestions, edits and approvals retain separate actors.</p></details>
      <section className={styles.rights} aria-labelledby="data-rights-title"><div><p className={styles.eyebrow}>You keep control</p><h3 id="data-rights-title">Your work. Your data.</h3><p>Everything here is read from this browser’s local storage. Export the verified records, or choose exactly what to remove. Deletion cannot be undone here.</p><button disabled={busy} className={styles.primary} onClick={() => { void download(); }}>Download this tool’s records</button></div><div className={styles.deleteOptions}>{sourceDocument !== undefined ? <button disabled={busy} onClick={() => setTarget({ kind: 'drawing', toolId: view.tool.toolId, documentId: sourceDocument.documentId, ownerChildId: view.tool.ownerChildId, name: 'the source drawing' })}>Delete source drawing…</button> : null}<button disabled={busy} onClick={() => setTarget({ kind: 'tool', toolId: view.tool.toolId, ownerChildId: view.tool.ownerChildId, name: view.tool.displayName })}>Delete this tool…</button><button disabled={busy} className={styles.danger} onClick={() => setTarget({ kind: 'profile', toolId: view.tool.toolId, ownerChildId: view.tool.ownerChildId, name: view.ownerDisplayName })}>Delete all this child’s local data…</button><small>Downloaded files are outside the app; deletion cannot remove those copies. Other open workspaces may need a reload.</small></div></section>
    </>}
    {notice !== '' ? <p className={styles.notice} role="status">{notice}</p> : null}{error !== null && target === null ? <p className={styles.error} role="alert">{error}</p> : null}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="delete-title" aria-describedby="delete-details" onCancel={(event) => { event.preventDefault(); closeDialog(); }}>
      <p className={styles.eyebrow}>Local data · permanent deletion</p><h3 id="delete-title">{target?.kind === 'profile' ? 'Delete this child’s local data?' : target?.kind === 'drawing' ? 'Delete the source drawing?' : 'Delete this saved tool?'}</h3><p id="delete-details">{target?.kind === 'profile' ? `This removes ${target.name}’s profile if present, all their owned tools, drawings, mark copies, observations and unfinished review words from this browser. Copies owned by another child remain anonymized under the existing sharing rules. Nothing on another device or in downloaded files is removed.` : target?.kind === 'drawing' ? 'Only the editable source drawing is removed. Saved tools still keep their separate mark copies and reviewed paths. Delete the tool, or all this child’s local data, to remove those copies too.' : `“${target?.name ?? ''}” and its versions, copied marks, reviews, observations and local summaries will be removed. The separate source drawing will remain.`} This cannot be undone here.</p>{error !== null ? <p className={styles.error} role="alert">{error}</p> : null}<div className={styles.dialogActions}><button ref={cancel} disabled={busy} onClick={closeDialog}>Cancel · keep my data</button><button disabled={busy} className={styles.danger} onClick={() => { void confirmDelete(); }}>{busy ? 'Deleting…' : 'Delete permanently'}</button></div>
    </dialog>
  </section>;
}
