'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { DrawWorkbench } from './DrawWorkbench';
import { SavedDrawTools } from './SavedDrawTools';
import { resetDrawPractice } from './practiceSession';
import styles from './DrawStudio.module.css';

export function DrawStudio() {
  const [tab, setTab] = useState<'create' | 'reuse'>('create');
  const [generation, setGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null), reset = useRef<HTMLButtonElement>(null);
  const reuseHeading = useRef<HTMLDivElement>(null);
  function useSaved() { setTab('reuse'); requestAnimationFrame(() => reuseHeading.current?.focus()); }
  function close() { if (busyRef.current) return; dialog.current?.close(); reset.current?.focus(); }
  async function confirmReset() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      await resetDrawPractice();
      dialog.current?.close(); setTab('create'); setGeneration((value) => value + 1);
      window.dispatchEvent(new Event('kale-data-changed'));
      reset.current?.focus();
    } catch { setError('Practice could not be reset. Your other work is unchanged. Try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <>
    <div className={styles.bar}>
      <div className={styles.switcher} role="group" aria-label="Draw workspace">
        <button type="button" aria-pressed={tab === 'create'} onClick={() => setTab('create')}>Make a tool</button>
        <button type="button" aria-pressed={tab === 'reuse'} onClick={() => setTab('reuse')}>Use a saved tool</button>
      </div>
      <Link href="/flight" className={styles.other}>Try the same idea in Flight Lab →</Link>
      <button type="button" className={styles.reset} ref={reset} onClick={() => { dialog.current?.showModal(); cancel.current?.focus(); }}>Reset practice…</button>
    </div>
    {/* Keep the create workspace mounted so switching tools never drops an unsaved review. */}
    <div hidden={tab !== 'create'}><DrawWorkbench key={generation} onSaved={useSaved} /></div>
    {tab === 'reuse' ? <div role="region" ref={reuseHeading} tabIndex={-1} aria-label="Use a saved tool"><SavedDrawTools key={generation} embedded /></div> : null}
    <dialog className={styles.dialog} ref={dialog} aria-labelledby="practice-reset-title" aria-describedby="practice-reset-details" onCancel={(event) => { event.preventDefault(); close(); }}>
      <h2 id="practice-reset-title">Reset the practice example?</h2>
      <p id="practice-reset-details">Remove only drawings and tools made under the new, labelled practice example. Blank drawings and your other tools stay. Older practice drawings are also kept. This cannot be undone.</p>
      <p>This does not refresh the website or reset your real work.</p>
      {error !== null ? <p role="alert">{error}</p> : null}
      <div><button ref={cancel} type="button" disabled={busy} onClick={close}>Cancel</button><button type="button" disabled={busy} onClick={() => { void confirmReset(); }}>{busy ? 'Resetting practice…' : 'Delete practice data'}</button></div>
    </dialog>
  </>;
}
