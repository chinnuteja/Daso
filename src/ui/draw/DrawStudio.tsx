'use client';

import { useRef, useState } from 'react';
import { DrawWorkbench, type DrawWorkbenchHandle } from './DrawWorkbench';
import { SavedDrawTools } from './SavedDrawTools';
import { StudioBoundary } from './StudioBoundary';
import { DrawSymbol } from './DrawSymbol';
import { resetDrawPractice } from './practiceSession';
import styles from './DrawStudio.module.css';

export function DrawStudio({ initialTab = 'create' }: { initialTab?: 'create' | 'reuse' } = {}) {
  const [tab, setTab] = useState<'create' | 'reuse'>(initialTab);
  const [generation, setGeneration] = useState(0);
  const [preferredToolId, setPreferredToolId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null), reset = useRef<HTMLButtonElement>(null);
  const reuseHeading = useRef<HTMLDivElement>(null);
  const workbench = useRef<DrawWorkbenchHandle>(null);
  function useInPicture(toolId: string) { setTab('create'); requestAnimationFrame(() => workbench.current?.useTool(toolId)); }
  function useSaved(toolId: string) { setPreferredToolId(toolId); setTab('reuse'); requestAnimationFrame(() => reuseHeading.current?.focus()); }
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
        <button type="button" aria-pressed={tab === 'create'} onClick={() => setTab('create')}><DrawSymbol kind="pencil" /> My drawing</button>
        <button type="button" aria-pressed={tab === 'reuse'} onClick={() => { setPreferredToolId(null); setTab('reuse'); }}><DrawSymbol kind="folder" /> My tools</button>
      </div>
    </div>
    {/* Keep the create workspace mounted so switching tools never drops an unsaved review. */}
    <p className={styles.purpose}>Your drawings can become tools. Make one, then use it to keep creating.</p>
    <div hidden={tab !== 'create'}><StudioBoundary key={generation}><DrawWorkbench controlsRef={workbench} onSaved={useSaved} /></StudioBoundary></div>
    {tab === 'reuse' ? <div role="region" ref={reuseHeading} tabIndex={-1} aria-label="Use a saved tool"><SavedDrawTools key={generation} preferredToolId={preferredToolId} onUseInPicture={useInPicture} onDraw={() => setTab('create')} embedded /></div> : null}
    <details className={styles.options}><summary>Practice reset (grown-ups)</summary><button type="button" className={styles.reset} ref={reset} onClick={() => { dialog.current?.showModal(); cancel.current?.focus(); }}>Reset practice…</button></details>
    <dialog className={styles.dialog} ref={dialog} aria-labelledby="practice-reset-title" aria-describedby="practice-reset-details" onCancel={(event) => { event.preventDefault(); close(); }}>
      <h2 id="practice-reset-title">Reset the practice example?</h2>
      <p id="practice-reset-details">Remove only drawings and tools made under the new, labelled practice example. Blank drawings and your other tools stay. Older practice drawings are also kept. This cannot be undone.</p>
      <p>This does not refresh the website or reset your real work.</p>
      {error !== null ? <p role="alert">{error}</p> : null}
      <div><button ref={cancel} type="button" disabled={busy} onClick={close}>Cancel</button><button type="button" disabled={busy} onClick={() => { void confirmReset(); }}>{busy ? 'Resetting practice…' : 'Delete practice data'}</button></div>
    </dialog>
  </>;
}
