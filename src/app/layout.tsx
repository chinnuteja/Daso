import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '../ui/shell/tokens.css';

export const metadata: Metadata = {
  title: 'Teach Daso',
  description: 'A child-authored capability prototype.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
