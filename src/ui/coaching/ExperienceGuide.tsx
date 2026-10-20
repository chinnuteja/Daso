'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { guideWasSeen, OPEN_GUIDE_EVENT, rememberGuideSeen } from './guideEvents';

import styles from './ExperienceGuide.module.css';

export function ExperienceGuide() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const close = useCallback(() => {
    rememberGuideSeen(true);
    setOpen(false);
  }, []);

  useEffect(() => {
    const opening = window.setTimeout(() => {
      if (!guideWasSeen()) setOpen(true);
    }, 0);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_GUIDE_EVENT, reopen);
    return () => {
      window.clearTimeout(opening);
      window.removeEventListener(OPEN_GUIDE_EVENT, reopen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab' || dialogRef.current === null) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeys);
    };
  }, [close, open]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="experience-guide-title">
        <button ref={closeRef} className={styles.close} type="button" aria-label="Close guide" onClick={close}>×</button>
        <p className={styles.eyebrow}>A two-minute interactive proof</p>
        <h2 id="experience-guide-title">A child teaches AI how to help—without giving AI the final say.</h2>
        <p className={styles.lede}>Kale Memory Lab is a working prototype, not a recorded demo. The important part is the boundary between a child’s words, Kale’s interpretation, the child’s approval and the behavior that finally runs.</p>

        <div className={styles.grid}>
          <section><span>01</span><h3>See the default</h3><p>Ask Kale for help. It notices spelling first.</p></section>
          <section><span>02</span><h3>Teach a preference</h3><p>Tell Kale to explore the story first and wait on spelling.</p></section>
          <section><span>03</span><h3>Review and approve</h3><p>Check the exact rule. Nothing changes before the child approves it.</p></section>
          <section><span>04</span><h3>Ask again</h3><p>The same draft now gets a story question. Reloading keeps the approved version.</p></section>
        </div>

        <div className={styles.map}>
          <strong>Where to go</strong>
          <p><b>Writing preference</b> is the main experience. <b>Bridge Bench</b> shows the same architecture in a physical experiment. <b>Saved tools</b> proves the compiled behavior can be reopened later.</p>
        </div>

        <div className={styles.footer}>
          <p>If this browser has been used before, choose <b>Start fresh</b> in the header. It resets only this writing demo.</p>
          <button type="button" onClick={close}>Begin the experience <span aria-hidden="true">→</span></button>
          <Link href="/lab" onClick={close}>Explore Bridge Bench later</Link>
        </div>
      </section>
    </div>
  );
}
