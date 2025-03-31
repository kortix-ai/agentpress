'use client';
import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from 'sonner';
import { usePathname } from 'next/navigation';
import { MainNav } from '@/components/main-nav';
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Check if current path is in dashboard routes
  const isDashboardRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/projects');
  
  // Only show MainNav on marketing pages, not in dashboard routes
  const showMainNav = !isDashboardRoute;

  // Render dashboard layout or regular layout based on route
  const renderContent = () => {
    if (isDashboardRoute) {
      return (
        <SidebarProvider>
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      );
    }
    
    return (
      <>
        {showMainNav && <MainNav />}
        <main className="flex-1 overflow-auto">{children}</main>
      </>
    );
  };

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full overflow-hidden`}>
        <AuthProvider>
          {renderContent()}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
