'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { requestCapabilityInterpretation } from '../../adapters/agents/drawTeaching';
import { openBrowserDrawAssets } from '../../adapters/persistence';
import { beginCapabilityReview, buildFlightApprovalBundle, buildTeachingRequestV2, flightContext, groundFlightInterpretation, replayFlightCapability, recordFlightObservation, FLIGHT_PROPOSAL } from '../../core/capability';
import { digestCapabilityContext } from '../../core/capability/context';
import { FLIGHT_OWNER_ID, FLIGHT_PRACTICE_TOOL_ID, flightPracticeTrials } from '../../core/capability/flightPractice';
import type { CapabilityLedgerEntry } from '../../core/capability/ledger';
import type { FlightCapabilityVersion, FlightTeachingContext } from '../../core/capability/types';
import type { ExperimentTrial } from '../../core/schema/experimentTrial';
import styles from './FlightWorkbench.module.css';

type Desk = Awaited<ReturnType<typeof openBrowserDrawAssets>>;
type Review = { readonly context: FlightTeachingContext; readonly candidateEventId: string; readonly entries: readonly CapabilityLedgerEntry[]; readonly words: string; readonly origin: 'model' | 'manual' };
type Idea = { readonly context: FlightTeachingContext; readonly words: string; readonly quote: string };
const now = () => new Date().toISOString();
const eventId = () => `event_${Date.now()}${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

export function FlightWorkbench() {
  const desk = useRef<Desk | null>(null);
  const requestRevision = useRef(0);
  const busyRef = useRef(false);
  const [trials, setTrials] = useState<readonly ExperimentTrial[]>([]);
  const [saved, setSaved] = useState<FlightCapabilityVersion | null>(null);
  const [savedEntries, setSavedEntries] = useState<readonly CapabilityLedgerEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [words, setWords] = useState('');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Please wait…');
  const [notice, setNotice] = useState('Opening Flight Lab…');
  const [problem, setProblem] = useState<string | null>(null);
  const [durable, setDurable] = useState(true);
  const [nextDistance, setNextDistance] = useState('8.9');
  const [nextDesign, setNextDesign] = useState('Dart');
  const [nextObstruction, setNextObstruction] = useState(false);

  async function reloadRecords(opened: Desk): Promise<void> {
    setTrials(await opened.trials.listByTool(FLIGHT_PRACTICE_TOOL_ID));
    const definition = await opened.capabilities.getDefinition(FLIGHT_PRACTICE_TOOL_ID);
    if (definition?.currentVersionId != null) {
      const version = await opened.capabilities.getVersion(definition.currentVersionId);
      if (version?.kind !== 'flight_validity') throw new Error('This saved rule is incomplete. Your observations remain stored.');
      setSaved(version);
      setSavedEntries(await opened.capabilities.listEntriesByTool(FLIGHT_PRACTICE_TOOL_ID));
    }
  }

  useEffect(() => {
    let cancelled = false;
    let close: (() => void) | undefined;
    void (async () => {
      const opened = await openBrowserDrawAssets(); close = opened.close;
      if (cancelled) { close(); return; }
      desk.current = opened; setDurable(opened.durable);
      if ((await opened.trials.listByTool(FLIGHT_PRACTICE_TOOL_ID)).length === 0) for (const trial of flightPracticeTrials()) await opened.trials.save(trial);
      await reloadRecords(opened);
      if (!cancelled) setNotice('Practice data is ready. What do you think makes a fair throw?');
    })().catch((error: unknown) => { if (!cancelled) setProblem(error instanceof Error ? error.message : 'The observations could not open. Reload to retry.'); });
    return () => { cancelled = true; requestRevision.current += 1; desk.current = null; close?.(); };
  }, []);

  const selected = trials.find((trial) => trial.trialId === selectedId) ?? null;
  const counterexample = selected === null ? null : trials.find((trial) => !trial.obstruction && trial.distanceM === selected.distanceM && trial.trialId !== selected.trialId) ?? null;
  const before = replayFlightCapability(FLIGHT_PRACTICE_TOOL_ID, trials, null);
  const draftVersion: FlightCapabilityVersion = { toolId: FLIGHT_PRACTICE_TOOL_ID, versionId: 'tool_version_801', kind: 'flight_validity', version: 1, rule: 'exclude_obstructed_trial', metadata: { algorithmVersion: 1, contextDigest: '0'.repeat(64), sourceEventIds: ['event_800'], approvalEventId: 'event_801' }, createdAt: '2026-10-01T00:00:00Z' };
  const after = replayFlightCapability(FLIGHT_PRACTICE_TOOL_ID, trials, saved ?? (preview ? draftVersion : null));
  const validBefore = before.projections.filter((trial) => trial.validUnderCurrentVersion).length;
  const validAfter = after.projections.filter((trial) => trial.validUnderCurrentVersion).length;
  function invalidate(message: string): void { requestRevision.current += 1; setIdea(null); setPreview(false); setNotice(message); setProblem(null); }

  async function currentContext(): Promise<FlightTeachingContext> {
    const opened = desk.current;
    if (opened === null || selectedId === null) throw new Error('Pick the observation you are talking about first.');
    const currentTrials = await opened.trials.listByTool(FLIGHT_PRACTICE_TOOL_ID);
    const trial = currentTrials.find((item) => item.trialId === selectedId);
    if (trial === undefined) throw new Error('That observation is no longer available. Choose another.');
    const contrast = currentTrials.find((item) => item.trialId !== trial.trialId && !item.obstruction && item.distanceM === trial.distanceM) ?? null;
    const definition = await opened.capabilities.getDefinition(FLIGHT_PRACTICE_TOOL_ID);
    const entries = await opened.capabilities.listEntriesByTool(FLIGHT_PRACTICE_TOOL_ID);
    return flightContext({ toolId: FLIGHT_PRACTICE_TOOL_ID, activeVersionId: definition?.currentVersionId ?? null, ledgerSequence: entries.length, trial, counterexample: contrast });
  }

  async function askKale(): Promise<void> {
    if (busyRef.current || review !== null) return;
    busyRef.current = true; setBusy(true); setBusyLabel('Kale is reading…'); setProblem(null); setIdea(null); setPreview(false);
    const revision = ++requestRevision.current; const childWords = words.trim();
    try {
      const context = await currentContext(); const request = await buildTeachingRequestV2(childWords, context);
      const readiness = groundFlightInterpretation(request, FLIGHT_PROPOSAL);
      if (!readiness.ok) { setProblem(readiness.question); return; }
      const intent = await requestCapabilityInterpretation(request);
      if (revision !== requestRevision.current) return;
      if (await digestCapabilityContext(await currentContext()) !== request.contextDigest) throw new Error('Your observation or saved rule changed while Kale was reading. Try again.');
      const grounded = groundFlightInterpretation(request, intent);
      if (!grounded.ok) { setProblem(grounded.question); return; }
      if (context.counterexampleTrialId === null) throw new Error('Add an unobstructed throw at the same distance before reviewing.');
      setIdea({ context, words: childWords, quote: grounded.quote }); setNotice('Check Kale’s suggestion against both observations.');
    } catch (error) { if (revision === requestRevision.current) setProblem(error instanceof Error ? error.message : 'Kale is unavailable. You can choose the obstruction setting yourself.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function beginReview(origin: 'manual' | 'model'): Promise<void> {
    if (busyRef.current || desk.current === null || review !== null) return;
    busyRef.current = true; setBusy(true); setBusyLabel('Opening preview…'); setProblem(null);
    try {
      const context = await currentContext();
      if (!context.selectedTrial.obstruction) throw new Error('This throw has no recorded obstruction. Choose one that hit an obstacle.');
      if (context.counterexampleTrialId === null) throw new Error('Add a clear throw at the same distance to check this rule.');
      if (origin === 'model' && (idea === null || await digestCapabilityContext(context) !== await digestCapabilityContext(idea.context) || idea.words !== words.trim())) throw new Error('Kale’s suggestion is out of date. Read your words again.');
      const candidateEventId = eventId();
      const entries = await beginCapabilityReview(desk.current.capabilities, { context, childWords: words.trim(), proposal: FLIGHT_PROPOSAL, origin, intentEventId: eventId(), candidateEventId, occurredAt: now() });
      setReview({ context, candidateEventId, entries, words: words.trim(), origin }); setPreview(true); setNotice('This is a preview. Your save makes it a lasting rule.');
    } catch (error) { setProblem(error instanceof Error ? error.message : 'That review could not open.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function rejectReview(): Promise<void> {
    if (desk.current === null || review === null || busyRef.current) return;
    busyRef.current = true; setBusy(true); setBusyLabel('Recording your choice…');
    try {
      await desk.current.capabilities.append({ type: 'child_rejection', actor: 'child', toolId: FLIGHT_PRACTICE_TOOL_ID, eventId: eventId(), sequence: review.entries.length + 1, occurredAt: now(), candidateEventId: review.candidateEventId, reason: 'I want to change what I said.' });
      setReview(null); invalidate('You rejected that idea. Change your words and try again.');
    } catch { setProblem('Your rejection could not be recorded. Nothing new has been saved.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function saveReview(): Promise<void> {
    if (desk.current === null || review === null || busyRef.current) return;
    busyRef.current = true; setBusy(true); setBusyLabel('Saving your rule…'); setProblem(null);
    try {
      const approval: CapabilityLedgerEntry = { type: 'child_approval', actor: 'child', toolId: FLIGHT_PRACTICE_TOOL_ID, eventId: eventId(), sequence: review.entries.length + 1, occurredAt: now(), candidateEventId: review.candidateEventId, approvedProposal: FLIGHT_PROPOSAL, idempotencyKey: `flight_save_${review.candidateEventId}` };
      const bundle = await buildFlightApprovalBundle({ context: review.context, entries: review.entries, approval, ownerChildId: FLIGHT_OWNER_ID, displayName: 'My fair-flight rule', versionId: `tool_version_${Date.now()}`, version: (saved?.version ?? 0) + 1, createdAt: now() });
      const version = await desk.current.capabilities.commitApprovedCapability(bundle);
      if (version.kind !== 'flight_validity') throw new Error('The saved rule has the wrong type.');
      setSaved(version); setSavedEntries([...review.entries, approval]); setReview(null); setIdea(null); setPreview(false); setNotice('Your rule is saved. Reopen or add a new observation; it works without asking Kale.');
    } catch (error) { setProblem(error instanceof Error ? error.message : 'The save failed. Your previous rule still works.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const savedApproval = savedEntries.find((entry) => entry.eventId === saved?.metadata.approvalEventId);
  const savedCandidate = savedApproval?.type === 'child_approval' ? savedEntries.find((entry) => entry.eventId === savedApproval.candidateEventId) : undefined;
  const savedIntent = savedCandidate?.type === 'capability_candidate' ? savedEntries.find((entry) => entry.eventId === savedCandidate.sourceIntentEventId) : undefined;

  async function addObservation(): Promise<void> {
    if (desk.current === null || busyRef.current || review !== null) return;
    const distanceM = Number(nextDistance);
    if (!Number.isFinite(distanceM) || distanceM < 0 || distanceM > 1000 || nextDistance.trim() === '') { setProblem('Enter a distance from 0 to 1000 metres.'); return; }
    busyRef.current = true; setBusy(true);
    try {
      await recordFlightObservation(desk.current, { trialId: `trial_${Date.now()}`, toolId: FLIGHT_PRACTICE_TOOL_ID, designName: nextDesign, distanceM, obstruction: nextObstruction, createdAt: now() });
      await reloadRecords(desk.current); invalidate('Your new observation is recorded. The saved rule ran locally.');
    } catch { setProblem('Your observation could not be saved. Try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  return <section className={styles.workbench} aria-labelledby="flight-title">
    <header className={styles.heading}><div><p className={styles.eyebrow}>Flight Lab · practice observations</p><h2 id="flight-title">What makes a fair throw?</h2><p>Some throws hit an obstacle. Decide which should count, then see your rule change the results.</p></div><Link href="/draw">Try it with your drawing →</Link></header>
    {!durable ? <p role="status" className={styles.warning}>This browser cannot keep your tools after reload. You can still explore the preview.</p> : null}
    <div className={styles.prediction}><b>Which design do you think should lead?</b><div>{['Dart', 'Falcon', 'Not sure yet'].map((name) => <button key={name} aria-pressed={prediction === name} type="button" onClick={() => setPrediction(name)}>{name}</button>)}</div>{prediction !== null ? <span>Your prediction for this visit: {prediction}. Results are computed from the observations.</span> : null}</div>
    <nav className={styles.jumpLinks} aria-label="Flight Lab work areas"><a href="#flight-observations">1 · Observations</a><a href="#flight-teach">2 · Teach a rule</a><a href="#flight-results">3 · Results</a></nav>
    <div className={styles.layout}>
      <div className={styles.world}>
        <div className={styles.worldHeading}><h3 id="flight-observations" tabIndex={-1}>The same observations</h3><span>6 labelled examples + your new throws</span></div><p className={styles.help}>Pick the throw you want to talk about.</p>
        <div className={styles.trials}>{trials.map((trial) => {
          const counted = after.projections.find((item) => item.trialId === trial.trialId)?.validUnderCurrentVersion ?? true;
          return <button key={trial.trialId} type="button" disabled={review !== null || busy} aria-pressed={selectedId === trial.trialId} className={styles.trial} data-excluded={!counted} onClick={() => { setSelectedId(trial.trialId); invalidate('You chose this observation. What did you notice?'); }}><span className={styles.plane} aria-hidden="true">↗</span><b>{trial.designName}</b><strong>{trial.distanceM} m</strong><span>{trial.obstruction ? 'Recorded: hit an obstacle' : 'Recorded: clear throw'}</span><small>{!counted ? 'Not counted · obstruction rule' : 'Counts in this result'}</small></button>;
        })}</div>
        <div className={styles.results} id="flight-results" tabIndex={-1} aria-label="Before and after results">{[{result:before,title:'Before · all captured throws',count:validBefore},{result:after,title:saved !== null ? 'Your saved rule' : preview ? 'Preview · not saved yet' : 'Now · no rule applied',count:validAfter}].map(({result,title,count},index) => <div key={index} data-after={index === 1 && (preview || saved !== null)}><span>{title}</span><b>{result.winner === undefined ? 'Waiting for observations' : `${result.winner} leads`}</b><small>{count} counted throws</small>{result.ranking.map((entry) => <p key={entry.designName}>{entry.rank}. {entry.designName} <strong>{(entry.medianDistanceMm ?? 0) / 1000} m median</strong></p>)}</div>)}</div>
        {saved !== null ? <div className={styles.nextDay}><h3>Try your saved rule again</h3><p>Record a new observation. Your tool decides locally whether it counts.</p><label>Design<select aria-label="New throw design" value={nextDesign} onChange={(event) => setNextDesign(event.target.value)}><option>Dart</option><option>Falcon</option></select></label><label>Distance in metres<input type="number" aria-label="New throw distance" min="0" max="1000" step=".1" value={nextDistance} onChange={(event) => setNextDistance(event.target.value)} /></label><label><input type="checkbox" checked={nextObstruction} onChange={(event) => setNextObstruction(event.target.checked)} /> This throw hit an obstacle</label><button className={styles.primary} disabled={busy || review !== null} onClick={() => { void addObservation(); }}>Record and run my rule</button><small>Saved rules work without AI.</small></div> : null}
      </div>
      <aside className={styles.teach} aria-label="Teach your fair-flight rule">
        <p className={styles.eyebrow}>Your observation → your rule</p><h3 id="flight-teach" tabIndex={-1}>Tell Kale what you noticed.</h3>
        <div className={styles.selected}><b>{selected === null ? 'Choose a throw first' : `${selected.designName} · ${selected.distanceM} m`}</b><span>{selected === null ? 'The observation cards stay beside your words.' : selected.obstruction ? 'This observation records an obstacle. Kale did not infer it.' : 'This observation records no obstacle.'}</span></div>
        <label className={styles.words}>What should this observation mean?<textarea aria-label="What should this observation mean?" disabled={review !== null || busy} value={words} placeholder="That throw shouldn’t count because it hit the chair." maxLength={800} onChange={(event) => { setWords(event.target.value); invalidate('Your words changed. Read or review them again.'); }} /></label>
        {review === null ? <><button className={styles.primary} disabled={words.trim() === '' || busy} onClick={() => { void askKale(); }}>{busy ? busyLabel : 'Let Kale read this'}</button><p className={styles.disclosure}>Kale receives the words you type and obstacle facts. Stored measurements and record identities stay in your browser.</p></> : null}
        {idea !== null && review === null ? <div className={styles.grounding}><b>Kale’s suggestion</b><p>Do not count throws with a recorded obstruction.</p><p>You said: “{idea.words}”</p><p>Reason found in your words: <mark>{idea.quote}</mark></p><p>Selected observation: <b>obstacle present</b>.</p><button className={styles.primary} disabled={busy} onClick={() => { void beginReview('model'); }}>Preview Kale’s suggestion</button></div> : null}
        {review === null ? <div className={styles.manual}><p>Prefer to choose the setting yourself?</p><button disabled={words.trim() === '' || busy} onClick={() => { void beginReview('manual'); }}>Preview my obstruction rule</button><small>This is your manual choice, recorded separately from Kale’s suggestion.</small></div> : <div className={styles.grounding}><b>{review.origin === 'model' ? 'Kale suggested; you decide' : 'You chose this rule'}</b><p>“{review.words}”</p><p>Recorded obstruction → throw does not count.</p><button className={styles.primary} disabled={busy} onClick={() => { void saveReview(); }}>{busy ? busyLabel : 'Save my fair-flight rule'}</button><button disabled={busy} onClick={() => { void rejectReview(); }}>Reject and change my words</button><small>Only your save makes this a lasting rule.</small></div>}
        {(preview || saved !== null) && selected !== null && counterexample !== null ? <div className={styles.counterexample}><b>Same distance. Different fact.</b><p>{selected.designName}, {selected.distanceM} m: {selected.obstruction ? 'hit an obstacle → not counted' : 'clear → still counts'}.</p><p>{counterexample.designName}, {counterexample.distanceM} m: clear → still counts.</p><small>The rule is about obstacles, not {selected.distanceM} metres.</small></div> : null}
        {saved !== null ? <div className={styles.saved}><b>Your rule is saved ✓</b><ol><li>You chose an observation from labelled practice data.</li>{savedIntent?.type === 'child_intent' ? <li>You said: “{savedIntent.childWords}”</li> : null}<li>{savedCandidate?.type === 'capability_candidate' && savedCandidate.origin === 'model' ? 'Kale suggested' : 'You chose'}: leave out throws with recorded obstacles.</li><li>You approved and saved the rule.</li><li>The tool computed the new result.</li></ol><details><summary>See the saved receipt</summary><p>Version {saved.version} · {saved.versionId}</p><p>Child approval: {saved.metadata.approvalEventId}</p><p>Behavior: exclude_obstructed_trial</p></details></div> : null}
        {problem !== null ? <p role="alert" className={styles.warning}>{problem}</p> : null}<p role="status" className={styles.notice}>{notice}</p>
      </aside>
    </div>
  </section>;
}
