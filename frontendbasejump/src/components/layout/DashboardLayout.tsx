"use client";
import Link from "next/link";
import { ReactNode, useState, useEffect, useRef, useCallback } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutDashboard,
  Settings,
  Users,
  X,
  Maximize2,
  GripHorizontal,
  Moon, Sun
} from "lucide-react";
import { useTheme } from "next-themes";

import UserAccountPanel from "@/components/dashboard/user-account-panel";

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
      className={`flex items-center gap-3 p-3 rounded-full hover:bg-hover-bg dark:hover:bg-hover-bg-dark transition-all duration-200 group ${
        isCollapsed ? "justify-center" : ""
      }`}
    >
      <div className="text-icon-color dark:text-icon-color-dark">{icon}</div>
      {!isCollapsed && <span className="text-foreground/90">{label}</span>}
      {isCollapsed && (
        <div className="absolute left-full ml-2 scale-0 group-hover:scale-100 transition-all duration-200 origin-left z-50">
          <div className="bg-card-bg dark:bg-background-secondary p-2 rounded-xl shadow-custom border border-subtle dark:border-white/10">
            <span className="whitespace-nowrap text-foreground">{label}</span>
          </div>
        </div>
      )}
    </Link>
  );
};

interface DashboardLayoutProps {
  children: ReactNode;
  navigation: {
    name: string;
    href: string;
    icon?: React.ReactNode;
  }[];
  accountId: string;
  userName?: string;
  userEmail?: string;
  rightPanelContent?: ReactNode;
  rightPanelTitle?: string;
}

export default function DashboardLayout({
  children,
  navigation,
  accountId,
  userName,
  userEmail,
  rightPanelContent,
  rightPanelTitle = "Details",
}: DashboardLayoutProps) {
  // Initialize with default values
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(true);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  // State for draggable panel
  const [position, setPosition] = useState({ x: 20, y: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const floatingPanelRef = useRef<HTMLDivElement>(null);
  const layoutInitialized = useRef(false);

  const { theme, setTheme } = useTheme();

  // Set initial showRightSidebar based on rightPanelContent prop
  useEffect(() => {
    setShowRightSidebar(!!rightPanelContent);
  }, [rightPanelContent]);

  // Load layout state from localStorage on initial render
  useEffect(() => {
    if (typeof window !== "undefined" && !layoutInitialized.current) {
      try {
        const savedLayout = localStorage.getItem("dashboardLayout");
        if (savedLayout) {
          const layout = JSON.parse(savedLayout);
          setLeftSidebarCollapsed(layout.leftSidebarCollapsed);

          if (rightPanelContent) {
            setRightSidebarCollapsed(layout.rightSidebarCollapsed);
            setShowRightSidebar(layout.showRightSidebar);
          }

          if (
            layout.position &&
            typeof layout.position.x === "number" &&
            typeof layout.position.y === "number"
          ) {
            setPosition(layout.position);
          }

          layoutInitialized.current = true;
        }
      } catch (error) {
        console.error("Error loading layout from localStorage:", error);
      }
    }
  }, [rightPanelContent]);

  // Save layout state to localStorage whenever relevant state changes
  useEffect(() => {
    if (typeof window !== "undefined" && layoutInitialized.current) {
      try {
        const layoutState = {
          leftSidebarCollapsed,
          rightSidebarCollapsed,
          showRightSidebar,
          position,
        };
        localStorage.setItem("dashboardLayout", JSON.stringify(layoutState));
      } catch (error) {
        console.error("Error saving layout to localStorage:", error);
      }
    }
  }, [leftSidebarCollapsed, rightSidebarCollapsed, showRightSidebar, position]);

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
  }, [
    rightSidebarCollapsed,
    setRightSidebarCollapsed,
    setLeftSidebarCollapsed,
  ]);

  // Toggle right sidebar visibility
  const toggleRightSidebarVisibility = useCallback(() => {
    const newVisibility = !showRightSidebar;
    setRightSidebarCollapsed(false);
    setShowRightSidebar(newVisibility);

    // If showing right sidebar, make sure left is collapsed
    if (newVisibility) {
      setLeftSidebarCollapsed(true);
    }
  }, [
    showRightSidebar,
    setShowRightSidebar,
    setRightSidebarCollapsed,
    setLeftSidebarCollapsed,
  ]);

  // Update position based on window height (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPosition({ x: 20, y: window.innerHeight - 300 });
    }
  }, []);

  // Keyboard shortcuts for sidebar toggling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Command/Ctrl key is pressed
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey) {
        // Ctrl/Cmd + B for left sidebar
        if (e.key === "b") {
          e.preventDefault();
          toggleLeftSidebar();
        }

        // Ctrl/Cmd + I for right sidebar
        if (e.key === "i") {
          e.preventDefault();
          if (showRightSidebar) {
            toggleRightSidebar();
          } else {
            toggleRightSidebarVisibility();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleRightSidebarVisibility,
    showRightSidebar,
  ]);

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      !(e.target as HTMLElement).closest(".drag-handle") ||
      (e.target as HTMLElement).closest("button")
    ) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);

    const rect = floatingPanelRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !floatingPanelRef.current) return;

      e.preventDefault();
      const mainContent = document.querySelector(".main-content-area");
      if (!mainContent) return;

      const mainRect = mainContent.getBoundingClientRect();
      const panelRect = floatingPanelRef.current.getBoundingClientRect();

      let newX = e.clientX - dragStart.x - mainRect.left;
      let newY = e.clientY - dragStart.y - mainRect.top;

      // Constrain within bounds
      newX = Math.max(0, Math.min(newX, mainRect.width - panelRect.width));
      newY = Math.max(0, Math.min(newY, mainRect.height - panelRect.height));

      setPosition({ x: newX, y: newY });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  // Map navigation items to include icons if not provided
  const navItemsWithIcons = navigation.map((item, index) => {
    const defaultIcons = [
      <Home key={0} size={20} />,
      <LayoutDashboard key={1} size={20} />,
      <Users key={2} size={20} />,
      <Settings key={3} size={20} />,
    ];
    return {
      ...item,
      icon: item.icon || defaultIcons[index % defaultIcons.length],
    };
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground p-2 gap-2">
      {/* Left Sidebar Container - always present, handles transitions */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          !leftSidebarCollapsed ? "w-64 opacity-100" : "w-0 opacity-0"
        }`}
      >
        {/* Expanded Left Sidebar */}
        <div
          className="w-full h-[calc(100vh-16px)] shadow-custom flex-shrink-0 flex flex-col border border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary rounded-2xl relative overflow-hidden"
          style={{ backdropFilter: "blur(8px)" }}
        >
          <div className="h-16 p-4 flex items-center justify-between border-b border-subtle dark:border-white/10 rounded-t-2xl">
            <div className="font-bold text-xl text-card-title">
              <Link href="/">Kortix / Suna</Link>
            </div>
            <button
              onClick={toggleLeftSidebar}
              className="p-2 rounded-full hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-foreground/60 transition-all duration-200"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {navItemsWithIcons.map((item) => (
              <NavItem
                key={item.name}
                icon={item.icon}
                label={item.name}
                href={item.href}
                isCollapsed={leftSidebarCollapsed}
              />
            ))}
          </div>

          {/* User Account Panel at the bottom */}
          <UserAccountPanel
            accountId={accountId}
            userName={userName}
            userEmail={userEmail}
            isCollapsed={leftSidebarCollapsed}
          />
        </div>
      </div>

      {/* Collapsed Left Sidebar Button - only visible when collapsed */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          leftSidebarCollapsed ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          zIndex: 10,
        }}
      >
        <div
          className="w-12 h-12 shadow-custom flex-shrink-0 border border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary rounded-2xl relative overflow-hidden"
          style={{ backdropFilter: "blur(8px)" }}
        >
          <button
            onClick={toggleLeftSidebar}
            className="w-full h-full flex items-center hover:bg-hover-bg dark:hover:bg-hover-bg-dark justify-center text-foreground/60 transition-all duration-200"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* User controls for collapsed state - positioned at bottom left */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          leftSidebarCollapsed ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          position: "absolute",
          bottom: "8px",
          left: "8px",
          zIndex: 10,
        }}
      >
        <UserAccountPanel
          accountId={accountId}
          userName={userName}
          userEmail={userEmail}
          isCollapsed={true}
        />
      </div>

      {/* Main Content - Now expands to fill space */}
      <div className="flex flex-col flex-1 h-[calc(100vh-16px)] rounded-2xl overflow-hidden bg-transparent transition-all duration-300 ease-in-out">
        <header className="h-16 px-6 flex items-center justify-end">
          <div className="flex items-center gap-4">
            {!showRightSidebar && rightPanelContent && (
              <button
                onClick={toggleRightSidebarVisibility}
                className="px-4 py-2 rounded-full hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-foreground/80 hover:text-foreground transition-all duration-200 text-sm font-medium border border-subtle dark:border-white/10"
              >
                {rightPanelTitle}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="relative px-4 py-2 rounded-full hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-foreground/80 hover:text-foreground transition-all duration-200 text-sm font-medium border border-subtle dark:border-white/10"
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                <span className="sr-only">Toggle theme</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-transparent main-content-area relative">
          <div
            className={`mx-auto p-6 transition-all duration-300 ${
              // Increase container width when sidebars are collapsed
              leftSidebarCollapsed &&
              (rightSidebarCollapsed || !showRightSidebar)
                ? "container max-w-[95%]"
                : "container"
            }`}
          >
            {children}
          </div>

          {/* Floating draggable right panel - only show when right sidebar is collapsed and visible */}
          {showRightSidebar && rightSidebarCollapsed && rightPanelContent && (
            <div
              ref={floatingPanelRef}
              className={`absolute bg-card-bg dark:bg-background-secondary border border-subtle dark:border-white/10 rounded-xl shadow-custom flex flex-col w-80 overflow-hidden ${
                isDragging ? "cursor-grabbing" : ""
              }`}
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                backdropFilter: "blur(8px)",
                zIndex: 50,
              }}
              onMouseDown={handleMouseDown}
            >
              <div className="p-3 flex items-center justify-between border-b border-subtle dark:border-white/10 drag-handle cursor-grab">
                <div className="flex items-center gap-2">
                  <GripHorizontal
                    size={14}
                    className="text-icon-color dark:text-icon-color-dark"
                  />
                  <h3 className="font-medium text-foreground select-none">
                    {rightPanelTitle}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleRightSidebar}
                    className="p-1.5 rounded-full hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-foreground/60 transition-all duration-200"
                    aria-label="Expand panel"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button
                    onClick={toggleRightSidebarVisibility}
                    className="p-1.5 rounded-full hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-foreground/60 transition-all duration-200"
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
                    className="px-3 py-1.5 rounded-full bg-button-hover dark:bg-button-hover-dark text-primary text-sm font-medium"
                  >
                    Expand
                  </button>
                </div>
              </div>
              <div
                className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none bg-gradient-overlay"
                style={{
                  opacity: 0.4,
                  mixBlendMode: "multiply",
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Right Sidebar - only show when visible */}
      {showRightSidebar && rightPanelContent && (
        <div
          className={`h-[calc(100vh-16px)] border border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary transition-all duration-300 ease-in-out rounded-2xl ${
            rightSidebarCollapsed
              ? "w-0 opacity-0 p-0 m-0 border-0"
              : "w-[45%] opacity-100 flex-shrink-0"
          } shadow-custom relative overflow-hidden`}
          style={{ backdropFilter: "blur(8px)" }}
        >
          <div className="h-16 p-4 flex items-center justify-between border-b border-subtle dark:border-white/10 rounded-t-2xl">
            <h2 className="font-semibold text-card-title">{rightPanelTitle}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleRightSidebar}
                className="p-2 rounded-full hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-foreground/60 transition-all duration-200"
                aria-label="Collapse sidebar"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={toggleRightSidebarVisibility}
                className="p-2 rounded-full hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-foreground/60 transition-all duration-200"
                aria-label="Close sidebar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
            {rightPanelContent || (
              <div className="flex flex-col items-center justify-center h-full text-foreground/40">
                <p>No content selected</p>
              </div>
            )}
          </div>
          <div
            className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none bg-gradient-overlay"
            style={{
              opacity: 0.4,
              mixBlendMode: "multiply",
            }}
          />
        </div>
      )}
    </div>
  );
}
