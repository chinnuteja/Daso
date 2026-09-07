import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '../ui/shell/tokens.css';

export const metadata: Metadata = {
  title: 'Kale Memory Lab',
  description: 'Inspectable, child-owned personalization for Kale.',
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
