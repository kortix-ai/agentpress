import './globals.css';
import { Inter } from 'next/font/google';
import { Orbitron } from 'next/font/google';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from 'sonner';
import { LayoutContent } from '@/components/layout-content';
import { AgentStatusProvider } from '@/context/agent-status-context';

const inter = Inter({ subsets: ['latin'] });
const orbitron = Orbitron({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-orbitron'
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${orbitron.variable}`}>
      <body className={`${inter.className} h-full`}>
        <AuthProvider>
          <AgentStatusProvider>
            <LayoutContent>
              {children}
            </LayoutContent>
            <Toaster position="top-right" />
          </AgentStatusProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
