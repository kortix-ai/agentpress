import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from 'sonner';
import { LayoutContent } from '@/components/layout-content';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <AuthProvider>
          <LayoutContent>
            {children}
          </LayoutContent>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
