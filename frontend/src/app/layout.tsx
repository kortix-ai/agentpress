import './globals.css';
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Providers } from './providers';

const manrope = Manrope({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'AgentPress',
  description: 'Run AI agents in your company or personally',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={manrope.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
