'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useView } from '@/context/view-context';
import { MainNav } from '@/components/main-nav';
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SecondaryPanel } from "@/components/secondary-panel"
import { useState, useEffect } from 'react';
import { parseStreamContent, ParsedPart } from '@/lib/parser';

export interface SelectedTool {
  index: number;
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading: isAuthLoading } = useAuth();
  const { isDualView } = useView();
  const [parsedContent, setParsedContent] = useState<ParsedPart[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedTool, setSelectedTool] = useState<number | null>(null);
  
  // Listen for messages from children components
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if the message is relevant to us
      if (event.data && event.data.type === 'STREAM_UPDATE') {
        const { content, isStreaming, selectedTool } = event.data;
        if (content) {
          const parsed = parseStreamContent(content);
          setParsedContent(parsed);
        }
        setIsStreaming(isStreaming);
        
        // If a specific tool is selected
        if (selectedTool !== undefined) {
          setSelectedTool(selectedTool);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
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
    if (isDualView) {
      return (
        <div className="flex h-screen">
          <SidebarProvider>
            <AppSidebar variant="inset" />
            <SidebarInset className="flex-1 overflow-hidden">
              <SiteHeader />
              <div className="flex overflow-hidden h-[calc(100vh-3.5rem)]">
                <div className="w-3/5 overflow-auto border-r border-border/100">
                  {children}
                </div>
                <div className="w-2/5 overflow-auto border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <SecondaryPanel 
                    parsedContent={parsedContent} 
                    isStreaming={isStreaming}
                    selectedToolIndex={selectedTool}
                  />
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      );
    }
    
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