import type { ReactNode } from 'react';
import Link from 'next/link';

import styles from './TabletShell.module.css';

export function TabletShell(props: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <Link className={styles.mark} href="/" aria-label="Teach Daso home">
            <span aria-hidden="true">d</span>
          </Link>
          <div>
            <p className={styles.eyebrow}>Child-made tools</p>
            <h1 className={styles.title}>{props.title}</h1>
          </div>
        </div>
        <nav className={styles.nav} aria-label="Teach Daso">
          <Link href="/">Home</Link>
          <Link href="/journey">Teach</Link>
          <Link href="/run">Use</Link>
        </nav>
      </header>
      <main className={styles.main}>{props.children}</main>
    </div>
  );
}
