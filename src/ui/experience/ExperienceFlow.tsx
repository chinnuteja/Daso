'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RuntimeResult } from '../../core/runtime';
import { approveExperienceRule, proposeExperienceRule, readExperience, recordExperienceTrial, type ExperienceContext, type ExperienceSnapshot } from '../flows/experience/session';
import { withExperience } from '../flows/experience/browserSession';
import { createOrReuseFork, ensureSecondChildProfile } from '../flows/runner/reuseTool';
import styles from './experience.module.css';

type TestResult = { readonly counted: boolean; readonly distance: number; readonly plane: string; readonly winner: string };

export function ExperienceFlow({ preview }: { readonly preview: ExperienceSnapshot }) {
  const [snapshot, setSnapshot] = useState(preview);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('Opening your local workbench…');
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [reviewing, setReviewing] = useState(preview.pendingId !== null && !preview.saved);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [persisted, setPersisted] = useState(false);
  const locked = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const testInput = useRef<HTMLInputElement>(null);
  const moved = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void withExperience(false, async (context) => context === null ? null : readExperience(context))
      .then((stored) => {
        if (cancelled) return;
        if (stored !== null) {
          setSnapshot(stored); setPersisted(true);
          setReviewing(stored.pendingId !== null && !stored.saved);
        }
        setReady(true); setBusy('');
      })
      .catch(() => {
        if (!cancelled) { setBusy(''); setError('We couldn’t open local storage. Nothing has been changed. Close other Kale tabs, then retry.'); }
      });
    return () => { cancelled = true; };
  }, [retry]);

  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [reviewing, snapshot.saved]);

  useEffect(() => { if (testing) testInput.current?.focus(); }, [testing]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${snapshot.saved ? '3 of 3: Rule saved' : reviewing ? '2 of 3: Review your rule' : '1 of 3: Notice what counts'} — Kale Memory Lab`;
    return () => { document.title = previous; };
  }, [reviewing, snapshot.saved]);

  async function run(label: string, action: (context: ExperienceContext) => Promise<void>) {
    if (locked.current || !ready) return;
    locked.current = true; setBusy(label); setError(null);
    try {
      await withExperience(true, async (context) => {
        if (context === null) throw new Error('The example could not be opened.');
        await action(context);
      });
    } catch {
      setError('We couldn’t confirm that action finished. Your saved data has not been reset. Reload to check what was saved before recording another throw. Retrying a rule approval will not duplicate it.');
    } finally { locked.current = false; setBusy(''); }
  }

  const disabled = !ready || busy.length > 0;
  const saved = snapshot.saved;
  const view = saved ? snapshot.after : snapshot.before;
  const outlier = snapshot.sampleTrials.find((trial) => trial.obstruction);

  return (
    <div className={styles.experience}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>A small experiment in child-made software</p>
        <h2>Your computer should<br className={styles.desktopBreak} /> learn <em>from you.</em></h2>
        <p>Notice something it missed. Teach it a rule. See that rule work.</p>
      </header>

      <section className={styles.workbench} aria-label="Interactive Flight Lab example">
        <div className={styles.labHeader}>
          <div><span className={styles.labIcon} aria-hidden="true">↗</span><strong>Flight Lab</strong><span className={styles.sampleTag}>Sample experiment</span></div>
          <span className={styles.step}>{saved ? '3 / 3 · It remembers' : reviewing ? '2 / 3 · You decide' : '1 / 3 · Notice something'}</span>
        </div>

        <div className={styles.stageGrid}>
          <section className={styles.results} aria-label="Results from the same four sample throws">
            <div className={styles.resultHeading}>
              <p className={styles.eyebrow}>The same four sample throws</p>
              <h3>{saved ? 'Same throws. Better rule.' : `${snapshot.before.winner} is winning. Is that fair?`}</h3>
              <p>Compared by typical distance, not just the longest throw.</p>
            </div>
            {saved ? (
              <div className={styles.changeStrip}>
                <span>Before <strong>{snapshot.before.winner} leads</strong></span>
                <span aria-hidden="true">→</span>
                <span>Now <strong>{snapshot.after.winner} leads</strong></span>
              </div>
            ) : null}
            <Ranking result={view} />
            <div className={`${styles.throwCard} ${saved ? styles.excluded : ''}`}>
              <div className={styles.throwTop}><strong>Dart · {outlier?.distanceM} m</strong><span>{saved ? 'Not counted' : 'Counted in the result'}</span></div>
              <FlightIllustration />
              <p>{saved ? 'The chair-hit throw is still in the record. Your rule excludes it from the calculation.' : 'But this throw hit a chair. The computer counted it anyway.'}</p>
            </div>
            <details className={styles.details}>
              <summary>See the four observations and the calculation</summary>
              <ul className={styles.observations}>
                {snapshot.sampleTrials.map((trial) => (
                  <li key={trial.trialId}><span>{trial.designName}</span><strong>{trial.distanceM} m</strong><span>{trial.obstruction ? (saved ? 'Hit chair · excluded' : 'Hit chair · counted') : 'Clear flight'}</span></li>
                ))}
              </ul>
              <p>Typical distance means the median. Dart’s two throws have a median of 7.5 m. Without its obstructed throw, its median is 6.1 m. Falcon’s 7.4 m then leads. Consistency breaks ties.</p>
            </details>
          </section>

          <section className={styles.decision} aria-label="Teach a lasting rule" aria-busy={busy.length > 0}>
            <div className={styles.decisionBody}>
              <p className={styles.eyebrow}>{saved ? 'Your decision became behavior' : reviewing ? snapshot.approved ? 'Finish saving your decision' : 'A proposal, not a decision' : 'Play Maya’s part'}</p>
              <h3 ref={heading} tabIndex={-1}>{saved ? 'You taught it what counts.' : reviewing ? 'One throw. A rule for every throw.' : 'You noticed what the computer missed.'}</h3>
              {saved ? (
                <>
                  <p>You approved the rule. The saved tool now excludes obstructed flights—including new ones.</p>
                  <div className={styles.ruleSaved}><span aria-hidden="true">✓</span><div><strong>If a flight touches something,<br />don’t count it.</strong><small>Saved on this device · runs without AI</small></div></div>
                  <button className={styles.primary} disabled={disabled} onClick={() => { setTesting(true); setTestResult(null); testInput.current?.focus(); }}>Try a new throw <span aria-hidden="true">↓</span></button>
                  <p className={styles.micro}>The next throw is yours. Test whether the rule really lasts.</p>
                </>
              ) : reviewing ? (
                <>
                  <blockquote>“That one shouldn’t count because it hit the chair.”</blockquote>
                  <div className={styles.ruleProposal}><span>Proposed rule</span><strong>If a flight touches something,<br />don’t count it.</strong><p>This applies to every plane and future throw—not only the 8.9 m result.</p></div>
                  <p className={styles.approvalNote}>{snapshot.approved ? 'Your approval is recorded, but the rule is not active yet. Retry saving to finish; you won’t approve twice.' : 'Not active yet. Only your approval can change the tool.'}</p>
                  <button className={styles.primary} disabled={disabled} onClick={() => { void run('Saving your approval and recalculating…', async (context) => { setSnapshot(await approveExperienceRule(context)); setPersisted(true); setReviewing(false); }); }}>{busy || (snapshot.approved ? 'Retry saving the approved rule' : 'Approve & save this rule')} <span aria-hidden="true">→</span></button>
                  <button className={styles.secondary} disabled={disabled} onClick={() => setReviewing(false)}>Back to the observations</button>
                </>
              ) : (
                <>
                  <p>Maya is comparing paper planes. She notices the winning throw hit a chair. Help her teach the tool why that matters.</p>
                  <div className={styles.observationQuote}><span>Maya’s observation</span><q>That throw shouldn’t count.</q></div>
                  <button className={styles.primary} disabled={disabled} onClick={() => { void run('Preparing your proposed rule…', async (context) => { setSnapshot(await proposeExperienceRule(context)); setPersisted(true); setReviewing(true); }); }}>{busy || 'That throw shouldn’t count'} <span aria-hidden="true">→</span></button>
                  <p className={styles.micro}>You’ll review the rule before anything changes.</p>
                </>
              )}
              <p className={styles.status} role="status">{busy || (ready ? saved ? 'Your rule is saved. Reload this page: it stays.' : 'Ready when you are.' : '')}</p>
              {error !== null ? <div className={styles.error} role="alert"><p>{error}</p>{!ready ? <button className={styles.secondary} onClick={() => { setError(null); setBusy('Reopening local storage…'); setRetry((value) => value + 1); }}>Retry opening storage</button> : null}</div> : null}
            </div>
            <div className={styles.honesty}><strong>Guided example, real consequences.</strong><p>Maya and the initial throws are sample data. Assistance is scripted, not live AI. Your approval, saved rule, and recalculation are real.</p></div>
          </section>
        </div>
      </section>

      {saved && testing ? (
        <section className={styles.testPanel} aria-label="Test the saved rule">
          <div><p className={styles.eyebrow}>Now make it prove itself</p><h3>A new throw. The same rule.</h3><p>Enter an observation. Try a long flight that touched something, then a clear flight.</p><p className={styles.micro}>Distances and obstructions are entered by you—not measured by a camera.</p></div>
          <form aria-busy={busy.length > 0} onChange={() => setTestResult(null)} onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const distance = Number(data.get('distance'));
            const plane = String(data.get('plane'));
            void run('Applying the saved rule…', async (context) => {
              const result = await recordExperienceTrial(context, { designName: plane, distanceM: distance, obstruction: data.get('obstruction') === 'on' });
              setSnapshot(result.snapshot);
              setTestResult({ counted: result.counted, distance, plane, winner: result.runtime.winner ?? 'No winner yet' });
            });
          }}>
            <fieldset disabled={disabled}><div className={styles.fields}><label>Plane<select name="plane" defaultValue="Dart"><option>Dart</option><option>Falcon</option><option>Glider</option></select></label><label>Distance in metres<input ref={testInput} name="distance" type="number" inputMode="decimal" min="0" max="10000" step="0.1" placeholder="e.g. 10" required /></label></div><label className={styles.checkbox}><input type="checkbox" name="obstruction" /> It touched something during the flight</label><button className={styles.primary} type="submit">Test the saved rule</button></fieldset>
            {testResult !== null ? <div className={styles.testResult} role="status"><strong>{testResult.plane} · {testResult.distance} m · {testResult.counted ? 'Counted' : 'Not counted'}</strong><p>{testResult.counted ? 'A clear flight counts. The tool kept your rule and included this observation.' : 'Your rule excluded this new throw. No new approval or AI call was needed.'}</p><small>Across all recorded throws: {testResult.winner} leads.</small></div> : null}
            {busy ? <p role="status">{busy}</p> : null}
            {error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
          </form>
        </section>
      ) : null}

      {saved ? <section className={styles.nextSteps}><div><p className={styles.eyebrow}>It doesn’t end with this screen</p><h3>A rule worth keeping. A story worth explaining.</h3></div><div className={styles.nextLinks}>
        <Link href={`/run?tool=${snapshot.toolId}&viewer=${snapshot.ownerChildId}`}>Open the saved tool <span aria-hidden="true">↗</span></Link>
        <button disabled={disabled} onClick={() => { void run('Making Leo an independent copy…', async (context) => { const owner = await ensureSecondChildProfile(context.repositories); const copy = await createOrReuseFork({ ...context, sourceToolId: context.toolId, targetOwner: owner }); router.push(`/run?tool=${copy.snapshot.definition.toolId}&viewer=${owner.childId}`); }); }}>Make Leo a copy <span aria-hidden="true">↗</span></button>
        <Link href={`/parent?tool=${snapshot.toolId}`}>See the parent’s evidence <span aria-hidden="true">↗</span></Link>
      </div><p className={styles.micro}>Leo is a simulated second child on this device, not a separate signed-in account. The independent copy and inherited rule are real.</p></section> : null}

      <details className={styles.proof}>
        <summary>Under the hood: what is actually real?</summary>
        <div className={styles.proofGrid}>
          <div><span>01 / Authorship</span><h4>You approve. The system records.</h4><p>The initial setup is labelled sample history. The correction has its own proposal and separate child-approval event.</p><code>{persisted ? snapshot.pendingId ?? 'No correction proposed yet' : 'Preview only · no data saved yet'}</code></div>
          <div><span>02 / Behavior</span><h4>Saved rules, not a clever animation.</h4><p>The ranking above comes from the real compiler and runtime. Both versions use the same four observations.</p><code>{persisted ? snapshot.version.versionId : 'In-memory sample preview'}</code></div>
          <div><span>03 / Privacy</span><h4>It stays on this device.</h4><p>The example has its own identity. It doesn’t overwrite your existing tools. Export and deletion are available in Parent evidence after saving.</p></div>
        </div>
      </details>
      <footer className={styles.footer}><p>Want to build it from the beginning?</p><Link href="/journey">Open the full guided builder →</Link><span>Independent prototype built to explore an adjacent direction for Daso.</span></footer>
    </div>
  );
}

function Ranking({ result }: { readonly result: RuntimeResult }) {
  return <ol className={styles.ranking}>{result.ranking.map((entry) => {
    const distance = (entry.medianDistanceMm ?? 0) / 1000;
    return <li key={entry.designName} data-winner={entry.rank === 1}><span className={styles.rankNumber}>{entry.rank}</span><div><div className={styles.rankLabel}><strong>{entry.designName}</strong><span>{distance.toFixed(1)} <small>m median</small></span></div><div className={styles.track}><span style={{ width: `${Math.min(distance / 10 * 100, 100)}%` }} /></div></div>{entry.rank === 1 ? <span className={styles.leader}>Leads</span> : <span />}</li>;
  })}</ol>;
}

function FlightIllustration() {
  return <svg className={styles.flight} viewBox="0 0 420 92" role="img" aria-label="Illustration of a paper plane hitting a chair; not camera footage"><path d="M20 72 Q115 1 295 45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 7" /><path d="m280 26 37 18-34 10 7-12z" fill="currentColor" /><path d="M331 16v39h38V16M325 56h51M334 57l-4 24M368 57l5 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /><path d="m313 20 5 9m-16-5 9 7m-6 17 8-2" stroke="currentColor" strokeWidth="2" /><path d="M8 84h398" stroke="currentColor" strokeOpacity=".18" /></svg>;
}
