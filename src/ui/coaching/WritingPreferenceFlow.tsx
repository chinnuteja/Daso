'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  interpretWritingPreference,
  respondToWritingDraft,
  type PreferenceInterpretation,
  type WritingCoachResponse,
} from '../../core/coaching';
import type { CoachingScope } from '../../core/schema/vocabulary';
import { approveWritingPreference, proposeWritingPreference, readWritingCoach, scopeLabel, type WritingCoachContext, type WritingCoachSnapshot } from '../flows/coaching';
import { withWritingCoach } from '../flows/experience/browserSession';
import styles from './writingPreference.module.css';

type Stage = 'try' | 'teach' | 'review' | 'active';

const STARTER_DRAFT = 'The moon dragon was scarred to leave home, but she packed three stars.';

export function WritingPreferenceFlow() {
  const [stage, setStage] = useState<Stage>('try');
  const [draft, setDraft] = useState(STARTER_DRAFT);
  const [words, setWords] = useState('');
  const [scope, setScope] = useState<CoachingScope>('this_story');
  const [snapshot, setSnapshot] = useState<WritingCoachSnapshot | null>(null);
  const [response, setResponse] = useState<WritingCoachResponse | null>(null);
  const [interpretation, setInterpretation] = useState<PreferenceInterpretation | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('Opening your writing desk…');
  const [error, setError] = useState<string | null>(null);
  const acting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void withWritingCoach(false, async (context) => context === null ? null : readWritingCoach(context))
      .then((stored) => {
        if (cancelled) return;
        if (stored !== null) {
          setSnapshot(stored);
          setWords(stored.words);
          setScope(stored.preference.scope);
          setInterpretation({ understood: true, preference: stored.preference });
          setStage(stored.saved ? 'active' : 'review');
        }
        setReady(true);
        setBusy('');
      })
      .catch(() => {
        if (!cancelled) {
          setReady(true);
          setBusy('');
          setError('Your local writing preferences could not be opened. Reload to try again.');
        }
      });
    return () => { cancelled = true; };
  }, []);

  const activeVersion = snapshot?.saved === true ? snapshot.version : null;
  const behaviorLabel = useMemo(() => activeVersion === null
    ? 'Default help'
    : 'Your writing preference is active', [activeVersion]);

  async function act(label: string, action: (context: WritingCoachContext) => Promise<void>) {
    if (!ready || acting.current) return;
    acting.current = true;
    setBusy(label);
    setError(null);
    try {
      await withWritingCoach(true, async (context) => {
        if (context === null) throw new Error('Your local writing desk could not be created.');
        await action(context);
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That action did not finish. Your earlier work is safe.');
    } finally {
      acting.current = false;
      setBusy('');
    }
  }

  function askKale() {
    setResponse(respondToWritingDraft(activeVersion, draft));
  }

  function prepareReview() {
    const parsed = interpretWritingPreference(words, scope);
    setInterpretation(parsed);
    if (!parsed.understood) return;
    void act('Preparing a preference for your review…', async (context) => {
      const next = await proposeWritingPreference(context, words.trim(), parsed.preference);
      setSnapshot(next);
      setStage('review');
    });
  }

  const disabled = !ready || busy.length > 0;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Inspectable personalization for Kale</p>
        <h2>Teach the computer <em>how</em> to help—without letting it take over.</h2>
        <p>A child’s preference becomes visible, scoped and child-approved. Kale cannot silently decide what “personalized” means.</p>
      </section>

      <section className={styles.studio} aria-busy={busy.length > 0}>
        <header className={styles.studioHeader}>
          <div><span className={styles.appIcon} aria-hidden="true">W</span><div><strong>Write</strong><span>Moon Dragon · draft</span></div></div>
          <span className={activeVersion === null ? styles.defaultState : styles.activeState}>{behaviorLabel}</span>
        </header>

        <div className={styles.columns}>
          <section className={styles.draftPanel} aria-label="Story draft">
            <div className={styles.panelHeading}><span>Your story</span><small>Words stay on this device</small></div>
            <textarea aria-label="Your story draft" value={draft} onChange={(event) => { setDraft(event.target.value); setResponse(null); }} />
            <button className={styles.askButton} disabled={disabled || draft.trim().length === 0} onClick={askKale}>Ask Kale for help <span aria-hidden="true">↗</span></button>
            <KaleResponse response={response} active={activeVersion !== null} />
          </section>

          <section className={styles.preferencePanel} aria-label="Teach Kale how to help">
            {stage === 'try' ? (
              <>
                <Step number="1" label="Notice the help" />
                <h3>Try “Ask Kale for help.”</h3>
                <p>Kale currently notices spelling first. If that interrupts your ideas, you can teach it a better order.</p>
                <button className={styles.primary} disabled={disabled} onClick={() => setStage('teach')}>Teach Kale how I want help</button>
              </>
            ) : null}

            {stage === 'teach' ? (
              <>
                <Step number="2" label="Say what works for you" />
                <h3>What should Kale do first while you are inventing?</h3>
                <label className={styles.field}>My preference<textarea rows={4} value={words} onChange={(event) => { setWords(event.target.value); setInterpretation(null); }} placeholder="Ask about my story first; fix spelling after I finish." /></label>
                <fieldset className={styles.scope}><legend>Where should this apply?</legend><label><input type="radio" checked={scope === 'this_story'} onChange={() => setScope('this_story')} /> Only this story</label><label><input type="radio" checked={scope === 'all_writing'} onChange={() => setScope('all_writing')} /> Every writing project</label></fieldset>
                {interpretation?.understood === false ? <p className={styles.error} role="alert">{interpretation.clarification}</p> : null}
                <button className={styles.primary} disabled={disabled || words.trim().length < 12} onClick={prepareReview}>Show me what Kale understood</button>
                <button className={styles.textButton} disabled={disabled} onClick={() => setStage('try')}>Back to my story</button>
              </>
            ) : null}

            {stage === 'review' && interpretation?.understood === true ? (
              <>
                <Step number="3" label="Review before saving" />
                <h3>Here is the rule Kale proposes.</h3>
                <blockquote>{words}</blockquote>
                <div className={styles.ruleCard}><span>While I am drafting</span><strong>Ask about my story first.</strong><span>Wait to mention spelling.</span><b>{scopeLabel(interpretation.preference.scope)}</b></div>
                <p className={styles.explain}>Your sentence is preserved. This structured rule is the only behavior that will be activated.</p>
                <button className={styles.primary} disabled={disabled} onClick={() => { void act('Saving your preference and checking the writing tool…', async (context) => { const saved = await approveWritingPreference(context); setSnapshot(saved); setStage('active'); setResponse(respondToWritingDraft(saved.version, draft)); }); }}>Approve & try it</button>
                <button className={styles.textButton} disabled={disabled} onClick={() => setStage('teach')}>That is not what I meant</button>
              </>
            ) : null}

            {stage === 'active' && snapshot !== null ? (
              <>
                <Step number="4" label="Use what you taught" />
                <div className={styles.savedMark} aria-hidden="true">✓</div>
                <h3>Kale learned how you want help.</h3>
                <p>Ask Kale again. It will explore your story first and save spelling feedback for later.</p>
                <div className={styles.savedMeta}><span>{scopeLabel(snapshot.preference.scope)}</span><span>Saved version {snapshot.version?.versionId}</span><span>Works from the saved rule</span></div>
                <button className={styles.primary} disabled={disabled} onClick={askKale}>Try my preference now</button>
              </>
            ) : null}

            <p className={styles.status} role="status">{busy || (ready ? 'Saved locally. You stay in control.' : '')}</p>
            {error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
          </section>
        </div>
      </section>

      <section className={styles.why}>
        <div><p className={styles.kicker}>The architectural idea</p><h3>Personalization the family can inspect.</h3></div>
        <p>The child’s words, Kale’s interpretation, approval and active version remain separate. Only the child can authorize behavior.</p>
        <p>This prototype uses a narrow, deterministic interpreter so the proof is inspectable; a production model can propose richer interpretations behind the same approval boundary.</p>
      </section>

      <footer className={styles.footer}><Link href="/lab">Try the real-world Bridge Bench</Link><Link href="/library">Open saved tools</Link><Link href="/journey">Inspect the technical builder</Link><span>Independent prototype for Kale. Not affiliated.</span></footer>
    </div>
  );
}

function Step({ number, label }: { number: string; label: string }) {
  return <p className={styles.step}><span>{number}</span>{label}</p>;
}

function KaleResponse({ response, active }: { response: WritingCoachResponse | null; active: boolean }) {
  if (response === null) return <div className={styles.emptyResponse}><span aria-hidden="true">✦</span><p>Kale waits until you ask.</p></div>;
  return <div className={active ? styles.coachResponse : styles.defaultResponse}><div><span aria-hidden="true">k</span><strong>Kale</strong></div><p>{response.text}</p>{response.spellingDeferred ? <small>Spelling is waiting until you finish.</small> : <small>Default behavior · no preference saved</small>}</div>;
}
