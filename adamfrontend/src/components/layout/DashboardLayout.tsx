import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Home, LayoutDashboard, Settings, Users, X, Maximize2, GripHorizontal } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '../ThemeToggle';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isCollapsed: boolean;
}

const NavItem = ({ icon, label, href, isCollapsed }: NavItemProps) => {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 p-3 rounded-full hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-200 group ${
        isCollapsed ? 'justify-center' : ''
      }`}
    >
      <div className="icon-color">{icon}</div>
      {!isCollapsed && (
        <span className="text-foreground/90">{label}</span>
      )}
      {isCollapsed && (
        <div className="absolute left-full ml-2 scale-0 group-hover:scale-100 transition-all duration-200 origin-left z-50">
          <div className="bg-white dark:bg-background-secondary p-2 rounded-xl shadow-custom border border-subtle dark:border-white/10">
            <span className="whitespace-nowrap text-foreground">{label}</span>
          </div>
        </div>
      )}
    </Link>
  );
};

interface DashboardLayoutProps {
  children: ReactNode;
  rightPanelContent?: ReactNode;
  rightPanelTitle?: string;
}

export default function DashboardLayout({ 
  children, 
  rightPanelContent, 
  rightPanelTitle = "Details" 
}: DashboardLayoutProps) {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(true);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  
  // State for draggable panel - initialized with default values and updated client-side
  const [position, setPosition] = useState({ x: 20, y: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const floatingPanelRef = useRef<HTMLDivElement>(null);

  // Toggle left sidebar and ensure right sidebar is collapsed when left is expanded
  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarCollapsed(!leftSidebarCollapsed);
    if (!leftSidebarCollapsed) {
      // When collapsing left, we don't need to do anything
    } else {
      // When expanding left, collapse the right sidebar
      setRightSidebarCollapsed(true);
    }
  }, [leftSidebarCollapsed, setLeftSidebarCollapsed, setRightSidebarCollapsed]);

  // Toggle right sidebar and ensure left sidebar is collapsed when right is expanded
  const toggleRightSidebar = useCallback(() => {
    setRightSidebarCollapsed(!rightSidebarCollapsed);
    if (!rightSidebarCollapsed) {
      // When collapsing right, we don't need to do anything
    } else {
      // When expanding right, collapse the left sidebar
      setLeftSidebarCollapsed(true);
    }
  }, [rightSidebarCollapsed, setRightSidebarCollapsed, setLeftSidebarCollapsed]);

  // Toggle right sidebar visibility
  const toggleRightSidebarVisibility = useCallback(() => {
    const newVisibility = !showRightSidebar;
    setRightSidebarCollapsed(false);
    setShowRightSidebar(newVisibility);
    
    // If showing right sidebar, make sure left is collapsed
    if (newVisibility) {
      setLeftSidebarCollapsed(true);
    }
  }, [showRightSidebar, setShowRightSidebar, setRightSidebarCollapsed, setLeftSidebarCollapsed]);

  // Update position based on window height (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({ x: 20, y: window.innerHeight - 300 });
    }
  }, []);

  // Keyboard shortcuts for sidebar toggling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Command/Ctrl key is pressed
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifierKey) {
        // Ctrl/Cmd + B for left sidebar
        if (e.key === 'b') {
          e.preventDefault();
          toggleLeftSidebar();
        }
        
        // Ctrl/Cmd + I for right sidebar
        if (e.key === 'i') {
          e.preventDefault();
          if (showRightSidebar) {
            toggleRightSidebar();
          } else {
            toggleRightSidebarVisibility();
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleLeftSidebar, toggleRightSidebar, toggleRightSidebarVisibility, showRightSidebar]);

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    // Skip if not clicking on the drag handle or if clicking on a button
    if (!(e.target as HTMLElement).closest('.drag-handle') || 
        (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const mainContent = document.querySelector('.main-content-area');
    
    if (mainContent && floatingPanelRef.current) {
      const mainRect = mainContent.getBoundingClientRect();
      const panelRect = floatingPanelRef.current.getBoundingClientRect();
      
      // Calculate new position
      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;
      
      // Constrain within bounds
      newX = Math.max(0, Math.min(newX, mainRect.width - panelRect.width));
      newY = Math.max(0, Math.min(newY, mainRect.height - panelRect.height));
      
      // Set position directly for immediate response
      if (floatingPanelRef.current) {
        floatingPanelRef.current.style.left = `${newX}px`;
        floatingPanelRef.current.style.top = `${newY}px`;
      }
      
      // Update state (will be used when dragging stops)
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      
      // Ensure state position matches final visual position
      if (floatingPanelRef.current) {
        const rect = floatingPanelRef.current.getBoundingClientRect();
        const mainContent = document.querySelector('.main-content-area');
        const mainRect = mainContent?.getBoundingClientRect() || { left: 0, top: 0 };
        
        setPosition({
          x: rect.left - mainRect.left,
          y: rect.top - mainRect.top
        });
      }
    }
  };

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground p-2 gap-2">
      {/* Left Sidebar Container - always present, handles transitions */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          !leftSidebarCollapsed ? 'w-64 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        {/* Expanded Left Sidebar */}
        <div 
          className="w-full h-[calc(100vh-16px)] shadow-custom flex-shrink-0 flex flex-col border border-subtle dark:border-white/10 bg-white dark:bg-background-secondary rounded-2xl relative overflow-hidden"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <div className="h-16 p-4 flex items-center justify-between border-b border-subtle dark:border-white/10 rounded-t-2xl">
            <div className="font-bold text-xl text-card-title">
              Kortix <span className="text-primary">/</span> <span className="text-primary/80">Suna</span>
            </div>
            <button 
              onClick={toggleLeftSidebar}
              className="p-2 rounded-full hover:bg-[var(--hover-bg)] text-foreground/60 transition-all duration-200"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <NavItem 
              icon={<Home size={20} />} 
              label="Home" 
              href="/" 
              isCollapsed={leftSidebarCollapsed} 
            />
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              href="/dashboard" 
              isCollapsed={leftSidebarCollapsed} 
            />
            <NavItem 
              icon={<Users size={20} />} 
              label="Team" 
              href="/team" 
              isCollapsed={leftSidebarCollapsed} 
            />
            <NavItem 
              icon={<Settings size={20} />} 
              label="Settings" 
              href="/settings" 
              isCollapsed={leftSidebarCollapsed} 
            />
          </div>
        </div>
      </div>
      
      {/* Collapsed Left Sidebar Button - only visible when collapsed */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          leftSidebarCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          position: 'absolute', 
          top: '8px', 
          left: '8px', 
          zIndex: 10 
        }}
      >
        <div 
          className="w-12 h-12 shadow-custom flex-shrink-0 border border-subtle dark:border-white/10 bg-white dark:bg-background-secondary rounded-2xl relative overflow-hidden"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <button 
            onClick={toggleLeftSidebar}
            className="w-full h-full flex items-center hover:bg-[var(--hover-bg)] justify-center text-foreground/60 transition-all duration-200"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      
      {/* Main Content - Now expands to fill space */}
      <div className="flex flex-col flex-1 h-[calc(100vh-16px)] rounded-2xl overflow-hidden bg-transparent transition-all duration-300 ease-in-out">
        <header className="h-16 px-6 flex items-center justify-end">
          <div className="flex items-center gap-4">
            {!showRightSidebar && (
              <button
                onClick={toggleRightSidebarVisibility}
                className="px-4 py-2 rounded-full hover:bg-[var(--hover-bg)] text-foreground/80 hover:text-foreground transition-all duration-200 text-sm font-medium border border-subtle"
              >
                Suna Computer
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-transparent main-content-area">
          <div className={`mx-auto p-6 transition-all duration-300 ${
            // Increase container width when sidebars are collapsed
            leftSidebarCollapsed && (rightSidebarCollapsed || !showRightSidebar) 
              ? 'container max-w-[95%]' 
              : 'container'
          }`}>
            {children}
          </div>
          
          {/* Floating draggable right panel - only show when right sidebar is collapsed and visible */}
          {showRightSidebar && rightSidebarCollapsed && (
            <div 
              ref={floatingPanelRef}
              className={`absolute bg-white dark:bg-background-secondary border border-subtle dark:border-white/10 rounded-xl shadow-custom flex flex-col w-80 overflow-hidden ${
                isDragging ? '' : 'transition-all duration-300 ease-in-out'
              }`}
              style={{ 
                left: position.x,
                top: position.y,
                backdropFilter: 'blur(8px)',
                zIndex: 50,
                cursor: isDragging ? 'grabbing' : 'default'
              }}
              onMouseDown={handleMouseDown}
            >
              <div className="p-3 flex items-center justify-between border-b border-subtle dark:border-white/10 drag-handle cursor-grab">
                <div className="flex items-center gap-2">
                  <GripHorizontal size={14} className="icon-color" />
                  <h3 className="font-medium text-foreground select-none">{rightPanelTitle}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={toggleRightSidebar}
                    className="p-1.5 rounded-full hover:bg-[var(--hover-bg)] text-foreground/60 transition-all duration-200"
                    aria-label="Expand panel"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button 
                    onClick={toggleRightSidebarVisibility}
                    className="p-1.5 rounded-full hover:bg-[var(--hover-bg)] text-foreground/60 transition-all duration-200"
                    aria-label="Close panel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 max-h-60 overflow-y-auto">
                <div className="flex flex-col items-center justify-center py-6 text-foreground/40">
                  <p className="mb-2 select-none">Content minimized</p>
                  <button
                    onClick={toggleRightSidebar}
                    className="px-3 py-1.5 rounded-full button-hover text-primary text-sm font-medium"
                  >
                    Expand
                  </button>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none gradient-overlay" style={{ 
                opacity: 0.4,
                mixBlendMode: 'multiply'
              }} />
            </div>
          )}
        </main>
      </div>
      
      {/* Right Sidebar - only show when visible */}
      {showRightSidebar && (
        <div 
          className={`h-[calc(100vh-16px)] border border-subtle dark:border-white/10 bg-white dark:bg-background-secondary transition-all duration-300 ease-in-out rounded-2xl ${
            rightSidebarCollapsed ? 'w-0 opacity-0 p-0 m-0 border-0' : 'w-[45%] opacity-100 flex-shrink-0'
          } shadow-custom relative overflow-hidden`}
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <div className="h-16 p-4 flex items-center justify-between border-b border-subtle dark:border-white/10 rounded-t-2xl">
            <h2 className="font-semibold text-card-title">{rightPanelTitle}</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleRightSidebar}
                className="p-2 rounded-full hover:bg-[var(--hover-bg)] text-foreground/60 transition-all duration-200"
                aria-label="Collapse sidebar"
              >
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={toggleRightSidebarVisibility}
                className="p-2 rounded-full hover:bg-[var(--hover-bg)] text-foreground/60 transition-all duration-200"
                aria-label="Close sidebar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          <div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
            {rightPanelContent ? rightPanelContent : (
              <div className="flex flex-col items-center justify-center h-full text-foreground/40">
                <p>No content selected</p>
              </div>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none gradient-overlay" style={{ 
            opacity: 0.4,
            mixBlendMode: 'multiply'
          }} />
        </div>
      )}
    </div>
  );
} 