'use client';
import { Component, type ReactNode } from 'react';

export class StudioBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() {
    if (!this.state.failed) return this.props.children;
    return <section role="alert"><h2>The drawing desk needs to reopen.</h2><p>We did not reset or delete your saved work. Any unsaved changes may not have reached storage. Keep this tab until you are ready to reopen.</p><button type="button" onClick={() => this.setState({ failed: false })}>Try reopening the desk</button><a href="/parent/tools">Look at saved records instead</a></section>;
  }
}
