import type { ReactNode } from 'react';
import Link from 'next/link';

import styles from './TabletShell.module.css';

export function TabletShell(props: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <Link className={styles.mark} href="/" aria-label="Kale Memory Lab home">
            <span aria-hidden="true">k</span>
          </Link>
          <div>
            <p className={styles.eyebrow}>Child-made tools</p>
            <h1 className={styles.title}>{props.title}</h1>
          </div>
        </div>
        <nav className={styles.nav} aria-label="Kale Memory Lab">
          <Link href="/">Writing preference</Link>
          <Link href="/lab">Bridge Bench</Link>
          <Link href="/library">Saved tools</Link>
        </nav>
      </header>
      <main className={styles.main}>{props.children}</main>
    </div>
  );
}
