'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { MainNav } from '@/components/main-nav';
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading: isAuthLoading } = useAuth();
  
  // Check if current path is in dashboard routes
  const isDashboardRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/projects');
  
  // Only show MainNav on marketing pages, not in dashboard routes
  const showMainNav = !isDashboardRoute;

  // Show loading state while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        {isDashboardRoute ? (
          <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        ) : (
          <div className="flex min-h-screen items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render dashboard layout or regular layout based on route
  if (isDashboardRoute) {
    return (
      <div className="flex h-screen">
        <SidebarProvider>
          <AppSidebar variant="inset" />
          <SidebarInset className="flex-1 overflow-hidden">
            <SiteHeader />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      {showMainNav && <MainNav />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 