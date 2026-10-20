'use client';

import { useState } from 'react';

import { resetWritingCoach } from '../flows/experience/browserSession';
import { OPEN_GUIDE_EVENT, rememberGuideSeen } from './guideEvents';

import styles from './ExperienceControls.module.css';

export function ExperienceControls() {
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openGuide() {
    window.dispatchEvent(new Event(OPEN_GUIDE_EVENT));
  }

  async function startFresh() {
    if (resetting) return;
    setResetting(true);
    setError(null);
    try {
      await resetWritingCoach();
      rememberGuideSeen(false);
      window.location.reload();
    } catch {
      setResetting(false);
      setError('Could not reset this demo. Your saved work is unchanged.');
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.actions} aria-label="Experience controls">
        <button type="button" className={styles.guide} onClick={openGuide}>Guide</button>
        <button type="button" className={styles.fresh} disabled={resetting} onClick={() => { void startFresh(); }}>
          <span aria-hidden="true">↻</span> {resetting ? 'Resetting…' : 'Start fresh'}
        </button>
      </div>
      {error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
