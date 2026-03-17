import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Preclaim — AI File Coordination',
  description:
    'Predictive file locking for AI coding agents. Prevent merge conflicts across multiple AI sessions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
