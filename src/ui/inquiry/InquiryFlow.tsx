'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { withBridgeBench } from '../flows/experience/browserSession';
import { approveFairTestRule, prepareInquiry, proposeFairTestRule, readInquiry, recordBridgeTrial, type InquiryContext, type InquirySnapshot } from '../flows/inquiry/session';
import styles from './inquiry.module.css';

type Stage = 'think' | 'reflect' | 'test' | 'review';

export function InquiryFlow() {
  const [stage, setStage] = useState<Stage>('think');
  const [idea, setIdea] = useState('');
  const [snapshot, setSnapshot] = useState<InquirySnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('Opening your local workshop…');
  const [error, setError] = useState<string | null>(null);
  const [lastTrial, setLastTrial] = useState<string | null>(null);
  const busyRef = useRef(false);
  const focus = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    void withBridgeBench(false, async (context) => context === null ? null : readInquiry(context)).then((stored) => {
      if (cancelled) return;
      if (stored !== null) { setSnapshot(stored); setIdea(stored.question); setStage(stored.pendingId !== null && !stored.saved ? 'review' : 'test'); }
      setReady(true); setBusy('');
    }).catch(() => { if (!cancelled) { setBusy(''); setError('Your local workshop could not open. Nothing was changed. Reload, then try again.'); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { focus.current?.focus(); }, [stage, snapshot?.saved]);

  async function act(label: string, action: (context: InquiryContext) => Promise<void>) {
    if (!ready || busyRef.current) return;
    busyRef.current = true; setBusy(label); setError(null);
    try {
      await withBridgeBench(true, async (context) => { if (context === null) throw new Error('The workshop could not be created.'); await action(context); });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'That action did not finish. Your earlier work is still safe.'); }
    finally { busyRef.current = false; setBusy(''); }
  }

  const disabled = !ready || busy.length > 0;
  const changedSetup = snapshot?.trials.some((trial) => trial.setupChanged === true) ?? false;
  const result = snapshot === null ? null : (snapshot.saved ? snapshot.after : snapshot.before);
  const enoughToCompare = (result?.ranking.length ?? 0) >= 2;

  return <div className={styles.inquiry}>
    <section className={styles.hero}><p className={styles.kicker}>A workshop for ideas that are not finished yet</p><h2>Make a guess.<br />Give it <em>something real</em> to answer to.</h2><p>This is not a quiz. Your first thought is kept as a hypothesis. A fair test decides what it can support.</p></section>
    <section className={styles.bench} aria-busy={busy.length > 0} aria-label="Paper bridge inquiry workspace">
      <header className={styles.benchHeader}><div><span className={styles.badge} aria-hidden="true">⌇</span><strong>Bridge Bench</strong><span>One sheet. Two supports. Coins.</span></div><span>{stage === 'think' ? '1 / 4 · Your idea' : stage === 'reflect' ? '2 / 4 · Check understanding' : stage === 'review' ? '4 / 4 · Decide what counts' : '3 / 4 · Test it fairly'}</span></header>
      <div className={styles.grid}>
        <section className={styles.workspace} aria-label="Your investigation"><p className={styles.kicker}>Your investigation</p><h3 ref={focus} tabIndex={-1}>{snapshot?.question ?? 'What are you wondering?'}</h3>{snapshot === null ? <BridgeSketch /> : <Results result={result ?? snapshot.before} saved={snapshot.saved} />}{snapshot !== null ? <ObservationList trials={snapshot.trials} saved={snapshot.saved} /> : <p className={styles.help}>Try a flat sheet, then change only its shape. Coins are a simple way to compare what each design can hold.</p>}<details className={styles.details}><summary>What makes this a fair comparison?</summary><p>Keep the paper, gap between supports, coin type and where you place the coins the same. Change one thing: the bridge design. If you changed anything else, record it. That observation still matters - it just should not decide the comparison.</p></details></section>
        <section className={styles.coach} aria-label="Reflect and choose the next action">
          {stage === 'think' ? <IdeaStep idea={idea} onChange={setIdea} disabled={disabled} onContinue={() => { if (idea.trim().length < 8) { setError('Write a little more so the workshop can show your idea back to you.'); return; } setError(null); setStage('reflect'); }} /> : null}
          {stage === 'reflect' ? <ReflectStep idea={idea} disabled={disabled} onEdit={() => setStage('think')} onBegin={() => { void act('Saving your question and opening the test bench…', async (context) => { const next = await prepareInquiry(context, idea.trim()); setSnapshot(next); setStage('test'); }); }} /> : null}
          {stage === 'test' && snapshot !== null ? <TestStep snapshot={snapshot} disabled={disabled} lastTrial={lastTrial} enoughToCompare={enoughToCompare} changedSetup={changedSetup} onRecord={(fields) => { void act('Recording what happened…', async (context) => { const next = await recordBridgeTrial(context, fields); setSnapshot(next.snapshot); setLastTrial(fields.setupChanged ? 'Recorded as a changed setup - it is visible, but not yet excluded.' : 'Recorded as a fair-test observation.'); }); }} onPropose={() => { void act('Preparing a fair-test rule for your review…', async (context) => { setSnapshot(await proposeFairTestRule(context)); setStage('review'); }); }} /> : null}
          {stage === 'review' && snapshot !== null ? <ReviewStep disabled={disabled} onBack={() => setStage('test')} onApprove={() => { void act('Saving your fair-test rule and checking every result…', async (context) => { setSnapshot(await approveFairTestRule(context)); setStage('test'); setLastTrial('Your fair-test rule is saved. It will also check new observations.'); }); }} /> : null}
          <p className={styles.status} role="status">{busy || (ready ? 'Your work stays on this device.' : '')}</p>{error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
        </section>
      </div>
    </section>
    <section className={styles.truth}><div><p className={styles.kicker}>A promise about listening</p><h3>Your words are not a command to believe you.</h3></div><p>They are your starting point. This tool keeps the hypothesis you chose, shows it back to you, and only lets a clearly scoped test rule change the calculation after you review it. It does not turn a sentence into a fact.</p></section>
    <footer className={styles.footer}><Link href="/">Teach Kale how to help with writing</Link><Link href="/library">See saved tools</Link><Link href="/journey">Open the technical builder</Link><span>Independent prototype for Kale. Not affiliated.</span></footer>
  </div>;
}

function IdeaStep(props: { idea: string; onChange(value: string): void; disabled: boolean; onContinue(): void }) { return <><p className={styles.kicker}>Start with your own thought</p><h3>What do you think could make a paper bridge stronger?</h3><p className={styles.copy}>It can be incomplete. For example: “More folds will hold more coins” or “A wider bridge might be stronger.”</p><label className={styles.textareaLabel}>My idea<textarea value={props.idea} disabled={props.disabled} onChange={(event) => props.onChange(event.target.value)} placeholder="I think…" rows={4} /></label><button className={styles.primary} disabled={props.disabled} onClick={props.onContinue}>Tell Kale what I mean <span aria-hidden="true">→</span></button><p className={styles.mini}>Nothing is saved until you say the reflection is right.</p></>; }
function ReflectStep(props: { idea: string; disabled: boolean; onEdit(): void; onBegin(): void }) { return <><p className={styles.kicker}>Check the reflection</p><h3>Here is what I heard.</h3><div className={styles.reflection}><span>Your hypothesis</span><q>{props.idea}</q><p>This is an idea to test, not a fact the computer has accepted.</p></div><p className={styles.copy}>We can compare bridge designs while keeping the rest of the setup steady. Your observations will tell us what this test supports.</p><button className={styles.primary} disabled={props.disabled} onClick={props.onBegin}>Yes - begin the fair test <span aria-hidden="true">→</span></button><button className={styles.secondary} disabled={props.disabled} onClick={props.onEdit}>That is not what I mean</button></>; }
function TestStep(props: { snapshot: InquirySnapshot; disabled: boolean; lastTrial: string | null; enoughToCompare: boolean; changedSetup: boolean; onRecord(fields: { designName: string; loadCount: number; setupChanged: boolean; note?: string }): void; onPropose(): void }) { return <><p className={styles.kicker}>{props.snapshot.saved ? 'A saved rule is now checking' : 'Collect your own observations'}</p><h3>{props.snapshot.trials.length === 0 ? 'Build two designs. Then record what happened.' : props.enoughToCompare ? 'Look at what your test can support.' : 'Add a different design to compare.'}</h3><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); props.onRecord({ designName: String(data.get('designName')), loadCount: Number(data.get('loadCount')), setupChanged: data.get('setupChanged') === 'on', note: String(data.get('note')).trim() || undefined }); event.currentTarget.reset(); }}><fieldset disabled={props.disabled}><label>Bridge design<input name="designName" required placeholder="e.g. three folds" /></label><label>Coins held before it bent or fell<input name="loadCount" required type="number" min="0" step="1" inputMode="numeric" placeholder="e.g. 18" /></label><label className={styles.check}><input name="setupChanged" type="checkbox" /> I changed something besides the bridge design</label><label>Optional note<input name="note" placeholder="e.g. gap was wider" /></label><button className={styles.primary} type="submit">Record this observation <span aria-hidden="true">+</span></button></fieldset></form>{props.lastTrial !== null ? <p className={styles.notice} role="status">{props.lastTrial}</p> : null}{props.changedSetup && !props.snapshot.saved ? <div className={styles.callout}><strong>A result changed more than one thing.</strong><p>It is still in the record. Do you want a rule that stops changed setups deciding the comparison?</p><button className={styles.secondary} disabled={props.disabled} onClick={props.onPropose}>Review a fair-test rule</button></div> : null}{props.snapshot.saved ? <p className={styles.notice}>New observations with a changed setup are now kept but excluded by your saved rule.</p> : null}</>; }
function ReviewStep(props: { disabled: boolean; onBack(): void; onApprove(): void }) { return <><p className={styles.kicker}>A proposal, not a decision</p><h3>One rule for every changed setup.</h3><div className={styles.reflection}><span>Proposed fair-test rule</span><strong>If I changed the setup, don’t use that result to compare designs.</strong><p>The observation stays in your notebook. It simply stops changing the result.</p></div><p className={styles.copy}>This does not say the bridge was bad. It says this particular comparison cannot answer your question fairly.</p><button className={styles.primary} disabled={props.disabled} onClick={props.onApprove}>Approve & save this rule <span aria-hidden="true">→</span></button><button className={styles.secondary} disabled={props.disabled} onClick={props.onBack}>Back to my observations</button></>; }
function Results({ result, saved }: { result: InquirySnapshot['after']; saved: boolean }) { if (result.ranking.length === 0) return <div className={styles.emptyResult}><span aria-hidden="true">↗</span><p>There is no winner yet. A good test begins after you make something.</p></div>; return <ol className={styles.ranking}>{result.ranking.map((entry) => <li key={entry.designName} data-winner={entry.rank === 1}><span>{entry.rank}</span><strong>{entry.designName}</strong><b>{entry.medianLoadCount ?? 0} coins</b>{entry.rank === 1 ? <em>{saved ? 'Leads under your saved rule' : 'Leads in these observations'}</em> : null}</li>)}</ol>; }
function ObservationList({ trials, saved }: { trials: readonly InquirySnapshot['trials'][number][]; saved: boolean }) { if (trials.length === 0) return null; return <ul className={styles.observations}>{trials.map((trial) => <li key={trial.trialId}><span>{trial.designName}</span><strong>{trial.loadCount ?? 0} coins</strong><small>{trial.setupChanged ? (saved ? 'Changed setup - excluded' : 'Changed setup - still counted') : 'Same setup'}</small></li>)}</ul>; }
function BridgeSketch() { return <svg className={styles.sketch} viewBox="0 0 480 180" role="img" aria-label="Line drawing of a paper bridge across two books, with coins above it"><path d="M38 146h90v-55H38zm314 0h90V91h-90zM128 92h224l-24 30H152z" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" /><path d="M178 92v30m35-30v30m35-30v30m35-30v30" stroke="currentColor" strokeWidth="3" strokeDasharray="3 6" /><circle cx="217" cy="60" r="13" fill="none" stroke="currentColor" strokeWidth="4"/><circle cx="249" cy="60" r="13" fill="none" stroke="currentColor" strokeWidth="4"/><circle cx="281" cy="60" r="13" fill="none" stroke="currentColor" strokeWidth="4"/><path d="M32 152h416" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" /></svg>; }
