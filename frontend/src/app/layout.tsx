import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/auth-context';
import { ViewProvider } from '@/context/view-context';
import { Toaster } from 'sonner';
import { LayoutContent } from '@/components/layout-content';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ViewProvider>
              <div className="flex min-h-screen flex-col">
                <main className="flex-1 overflow-y-auto">
                  <LayoutContent>
                    {children}
                  </LayoutContent>
                </main>
              </div>
              <Toaster position="top-right" />
            </ViewProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
