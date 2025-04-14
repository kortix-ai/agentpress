"use client";
import Link from "next/link";
import { ReactNode, useState, useEffect, useRef, useCallback } from "react";

import {
  X,
  Maximize2,
  GripHorizontal,
  Moon, Sun,
  Cpu,
  Database,
  MessagesSquare,
  ArrowRight,
  PanelLeft,
  Laptop,
  UserIcon,
  Search,
  Minimize2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { getProjects, getThreads } from "@/lib/api";
import { useToolsPanel } from "@/lib/hooks/use-tools-panel";

import UserAccountPanel from "@/components/dashboard/user-account-panel";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isCollapsed: boolean;
  hideIconWhenCollapsed?: boolean;
}

const NavItem = ({ icon, label, href, isCollapsed, hideIconWhenCollapsed = false }: NavItemProps) => {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 py-1.5 px-2 hover:bg-hover-bg transition-all duration-200 group text-sm ${
        isCollapsed ? "justify-center" : ""
      }`}
    >
      {(!isCollapsed || !hideIconWhenCollapsed) && (
        <div className="text-icon-color flex-shrink-0">
          {icon}
        </div>
      )}
      {!isCollapsed && <span className="text-foreground/90 truncate">{label}</span>}
      {isCollapsed && !hideIconWhenCollapsed && (
        <div className="absolute left-full ml-2 scale-0 group-hover:scale-100 transition-all duration-200 origin-left z-50">
          <div className="bg-background p-2 shadow-custom border border-subtle dark:border-white/10">
            <span className="whitespace-nowrap text-foreground text-xs">{label}</span>
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
  
  // Add search state for agents
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredAgents, setFilteredAgents] = useState<{name: string, href: string}[]>([]);
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Use our tools panel hook
  const { 
    showPanel, 
    renderToolsPanel,
    toolCalls
  } = useToolsPanel();

  // Use tool panel as the right panel if it's available
  const effectiveRightPanelContent = showPanel ? renderToolsPanel() : rightPanelContent;
  const effectiveRightPanelTitle = showPanel ? `Suna's Computer (${toolCalls.length})` : rightPanelTitle;

  // Update right sidebar visibility based on panel visibility
  useEffect(() => {
    if (showPanel) {
      setShowRightSidebar(true);
      setRightSidebarCollapsed(false);
    } else if (!rightPanelContent) {
      // If the tools panel is hidden and there's no other content, hide the sidebar
      setShowRightSidebar(false);
    }
  }, [showPanel, rightPanelContent]);

  // State for draggable panel
  const [position, setPosition] = useState({ x: 20, y: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const floatingPanelRef = useRef<HTMLDivElement>(null);
  const layoutInitialized = useRef(false);

  const { theme, setTheme } = useTheme();
  
  // State for dynamic agents list
  const [agents, setAgents] = useState<{name: string, href: string}[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  
  // Filter agents when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredAgents(agents);
    } else {
      const filtered = agents.filter(agent => 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAgents(filtered);
    }
  }, [searchQuery, agents]);
  
  // Load agents dynamically from the API
  useEffect(() => {
    async function loadAgents() {
      try {
        const projectsData = await getProjects();
        const agentsList = [];
        
        for (const project of projectsData) {
          const threads = await getThreads(project.id);
          if (threads && threads.length > 0) {
            // For each thread in the project, create an agent entry
            for (const thread of threads) {
              agentsList.push({
                name: `${project.name} - ${thread.thread_id.slice(0, 4)}`,
                href: `/dashboard/agents/${thread.thread_id}`
              });
            }
          }
        }
        
        // Sort by most recent (we don't have a created_at field for these mappings,
        // so we'll just use the order they come in for now)
        setAgents(agentsList);
      } catch (err) {
        console.error("Error loading agents for sidebar:", err);
      } finally {
        setIsLoadingAgents(false);
      }
    }
    
    loadAgents();
  }, []);

  // Set initial showRightSidebar based on rightPanelContent prop
  useEffect(() => {
    // Only set initial visibility, don't override user choices later
    if (!layoutInitialized.current) {
      setShowRightSidebar(!!effectiveRightPanelContent);
    }
  }, [effectiveRightPanelContent]);

  // Load layout state from localStorage on initial render
  useEffect(() => {
    if (typeof window !== "undefined" && !layoutInitialized.current) {
      try {
        const savedLayout = localStorage.getItem("dashboardLayout");
        if (savedLayout) {
          const layout = JSON.parse(savedLayout);
          setLeftSidebarCollapsed(layout.leftSidebarCollapsed);

          if (effectiveRightPanelContent) {
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
  }, [effectiveRightPanelContent]);

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
    setShowRightSidebar(newVisibility);
    
    if (newVisibility) {
      // When showing the sidebar, expand it and collapse the left sidebar
      setRightSidebarCollapsed(false);
      setLeftSidebarCollapsed(true);
    } else {
      // When hiding the sidebar, make sure it's fully collapsed
      setRightSidebarCollapsed(true);
    }
  }, [
    showRightSidebar,
    setShowRightSidebar,
    setRightSidebarCollapsed,
    setLeftSidebarCollapsed,
    effectiveRightPanelContent
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

  // Get only the latest 20 agents for the sidebar
  const recentAgents = filteredAgents.slice(0, 20);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground relative">
      {/* Left Sidebar Container - always present, handles transitions */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          !leftSidebarCollapsed ? "w-56" : "w-12"
        }`}
      >
        {/* Left Sidebar */}
        <div
          className="flex flex-col h-full bg-background"
          style={{ backdropFilter: "blur(8px)" }}
        >
          <div className="h-12 p-2 flex items-center justify-between">
            <div className={`font-medium text-sm text-card-title ${leftSidebarCollapsed ? "hidden" : "block"}`}>
              <Link href="/">AgentPress</Link>
            </div>
            <button
              onClick={toggleLeftSidebar}
              className={`p-1 hover:bg-hover-bg text-foreground/60 transition-all duration-200 ${leftSidebarCollapsed ? "mx-auto" : ""}`}
              aria-label={leftSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft size={14} className={`transition-transform duration-200 ${leftSidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* User Account Panel at the top */}
          <div className="px-2 pb-2 border-b border-subtle dark:border-white/10">
            <UserAccountPanel
              accountId={accountId}
              userName={userName}
              userEmail={userEmail}
              isCollapsed={leftSidebarCollapsed}
            />
          </div>

          <div className="flex-1 overflow-y-auto pt-2">
            {/* Platform Section */}
            <div className="py-1 px-2">
              <div className={`text-xs font-medium text-foreground/50 mb-1 ${leftSidebarCollapsed ? "hidden" : "block"}`}>
                Platform
              </div>
              <div className="space-y-0.5">
                <NavItem 
                  icon={<Cpu size={16} />} 
                  label="Devices" 
                  href="/dashboard/devices" 
                  isCollapsed={leftSidebarCollapsed} 
                />
                <NavItem 
                  icon={<Database size={16} />} 
                  label="Data" 
                  href="/dashboard/data" 
                  isCollapsed={leftSidebarCollapsed} 
                />
              </div>
            </div>
            
            {/* Agents Section */}
            <div className="py-1 px-2 mt-2">
              <div className={`flex justify-between items-center mb-1 ${leftSidebarCollapsed ? "hidden" : "block"}`}>
                <Link href="/dashboard/agents" className="text-xs font-medium text-foreground/50">Agents</Link>
                <div className="flex items-center gap-1">
                  {!leftSidebarCollapsed && (
                    <button
                      onClick={() => setShowSearchInput(!showSearchInput)}
                      className="text-xs flex items-center justify-center h-5 w-5 rounded-md bg-background-secondary/80 hover:bg-hover-bg text-foreground/50 hover:text-foreground transition-colors duration-200 border border-subtle/40 dark:border-white/5"
                      aria-label="Search agents"
                    >
                      <Search size={12} className="text-icon-color" />
                    </button>
                  )}
                  <Link 
                    href="/dashboard" 
                    className="text-xs flex items-center justify-center px-1.5 h-5 rounded-md bg-background-secondary/80 hover:bg-hover-bg text-foreground/50 hover:text-foreground transition-colors duration-200 border border-subtle/40 dark:border-white/5"
                  >
                    + New
                  </Link>
                </div>
              </div>
              
              {/* Add search input for agents - only show when search is clicked */}
              {!leftSidebarCollapsed && (
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    showSearchInput ? 'max-h-10 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'
                  }`}
                >
                  <div className={`relative transition-transform duration-300 ${
                    showSearchInput ? 'translate-y-0' : '-translate-y-4'
                  }`}>
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <Search size={12} className="text-icon-color" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search agents..."
                      className="w-full py-1 pl-7 pr-2 text-xs bg-background-secondary border border-subtle dark:border-white/10 rounded-md placeholder-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus={showSearchInput}
                      tabIndex={showSearchInput ? 0 : -1}
                    />
                    {searchQuery && (
                      <button 
                        className="absolute inset-y-0 right-0 pr-2 flex items-center"
                        onClick={() => setSearchQuery("")}
                      >
                        <X size={12} className="text-icon-color" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-0.5">
                {isLoadingAgents ? (
                  // Show skeleton loaders while loading
                  Array.from({length: 3}).map((_, index) => (
                    <div key={index} className="flex items-center gap-2 py-1.5 px-2">
                      {!leftSidebarCollapsed && (
                        <div className="w-4 h-4 bg-foreground/10 rounded-md animate-pulse"></div>
                      )}
                      {!leftSidebarCollapsed && (
                        <div className="h-3 bg-foreground/10 rounded w-3/4 animate-pulse"></div>
                      )}
                    </div>
                  ))
                ) : recentAgents.length > 0 ? (
                  // Show only the latest 20 agents
                  <>
                    {recentAgents.map((agent, index) => (
                      <NavItem
                        key={index}
                        icon={<MessagesSquare size={16} />}
                        label={agent.name}
                        href={agent.href}
                        isCollapsed={leftSidebarCollapsed}
                        hideIconWhenCollapsed={true}
                      />
                    ))}
                    
                    {/* "See all agents" link */}
                    {filteredAgents.length > 20 && (
                      <Link 
                        href="/dashboard/agents" 
                        className={`flex items-center gap-1 py-1.5 px-2 text-xs text-foreground/60 hover:text-foreground hover:bg-hover-bg transition-all ${
                          leftSidebarCollapsed ? "justify-center" : ""
                        }`}
                      >
                        {!leftSidebarCollapsed && <span>See all agents</span>}
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </>
                ) : (
                  // Show empty state with search query info if applicable
                  <div className={`text-xs text-foreground/50 p-2 ${leftSidebarCollapsed ? "hidden" : "block"}`}>
                    {searchQuery ? `No agents matching "${searchQuery}"` : "No agents yet"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout container for main content and right panel */}
      <div className="flex flex-1 relative">
        {/* Main Content */}
        <div 
          className={`flex flex-col h-screen overflow-hidden bg-background-secondary transition-all duration-300 ease-in-out rounded-l-xl shadow-sm border-l border-subtle dark:border-white/10 ${
            showRightSidebar && !rightSidebarCollapsed 
              ? "w-[calc(100%-40%)]" 
              : "w-full"
          }`}
          style={{ 
            backdropFilter: "blur(8px)",
            zIndex: 10,
            marginLeft: leftSidebarCollapsed ? "0" : "0"  
          }}
        >
          <header className="h-12 px-4 flex items-center justify-end">
            <div className="flex items-center gap-3">
              {!showRightSidebar && effectiveRightPanelContent && (
                <button
                  onClick={toggleRightSidebarVisibility}
                  className="px-3 py-1.5 rounded-full hover:bg-hover-bg text-foreground/80 hover:text-foreground transition-all duration-200 text-xs border border-subtle dark:border-white/10"
                >
                  {showPanel ? (
                    <span className="flex items-center gap-1">
                      <Laptop className="h-3 w-3" />
                      {`Suna's Computer`}
                    </span>
                  ) : (
                    effectiveRightPanelTitle
                  )}
                </button>
              )}
              
              {/* User dropdown in header - always show */}
              <div className="flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative h-8 w-8 rounded-full border border-subtle dark:border-white/10 hover:bg-hover-bg flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-foreground/80" />
                      <span className="sr-only">User menu</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary rounded-xl shadow-custom" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal border-b border-subtle dark:border-white/10">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-foreground">{userName}</p>
                        {userEmail && (
                          <p className="text-xs leading-none text-foreground/70">
                            {userEmail}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuGroup className="p-1">
                      <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                        <Link href="/dashboard" className="flex w-full h-full text-foreground/90">My Account</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                        <Link href="/dashboard/settings" className="flex w-full h-full text-foreground/90">Settings</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                        <Link href="/dashboard/settings/teams" className="flex w-full h-full text-foreground/90">Teams</Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="border-subtle dark:border-white/10" />
                    <div className="p-1">
                      <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                        <Link href="/api/auth/signout" className="flex w-full h-full text-foreground/90">Log out</Link>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="relative h-8 w-8 rounded-full border border-subtle dark:border-white/10 hover:bg-hover-bg flex items-center justify-center"
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                  <span className="sr-only">Toggle theme</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-transparent main-content-area relative">
            <div
              className={`mx-auto p-4 transition-all duration-300 ${
                // Increase container width when sidebars are collapsed
                leftSidebarCollapsed &&
                (rightSidebarCollapsed || !showRightSidebar)
                  ? "container max-w-[95%]"
                  : "container"
              }`}
            >
              {children}
            </div>

            {/* Floating draggable right panel */}
            {showRightSidebar === true && rightSidebarCollapsed === true && effectiveRightPanelContent && (
              <div
                ref={floatingPanelRef}
                className={`absolute bg-background border border-subtle dark:border-white/10 rounded-lg shadow-custom flex flex-col w-72 overflow-hidden ${
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
                <div className="p-2 flex items-center justify-between drag-handle cursor-grab">
                  <div className="flex items-center gap-1.5">
                    <GripHorizontal
                      size={12}
                      className="text-icon-color"
                    />
                    <h3 className="font-medium text-foreground text-xs select-none">
                      {effectiveRightPanelTitle}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={toggleRightSidebar}
                      className="p-1 rounded-full hover:bg-hover-bg text-foreground/60 transition-all duration-200"
                      aria-label="Expand panel"
                    >
                      <Maximize2 size={12} />
                    </button>
                    <button
                      onClick={toggleRightSidebarVisibility}
                      className="p-1 rounded-full hover:bg-hover-bg text-foreground/60 transition-all duration-200"
                      aria-label="Close panel"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                <div className="p-3 max-h-60 overflow-y-auto">
                  <div className="flex flex-col items-center justify-center py-4 text-foreground/40">
                    <p className="mb-2 select-none text-xs">Content minimized</p>
                    <button
                      onClick={toggleRightSidebar}
                      className="px-2 py-1 rounded-md text-primary text-xs"
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

        {/* Right Sidebar */}
        {showRightSidebar === true && effectiveRightPanelContent && (
          <div
            className={`h-screen border-l border-subtle dark:border-white/10 bg-background transition-all duration-300 ease-in-out rounded-l-xl shadow-custom ${
              rightSidebarCollapsed
                ? "w-0 opacity-0 p-0 m-0 border-0"
                : "w-[40%] opacity-100 flex-shrink-0"
            } overflow-hidden`}
            style={{ 
              backdropFilter: "blur(8px)",
              zIndex: 20
            }}
          >
            <div className="h-12 p-2 flex items-center justify-between rounded-t-xl">
              <h2 className="font-medium text-sm text-card-title">
                {effectiveRightPanelTitle}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleRightSidebar}
                  className="p-1 hover:bg-hover-bg text-foreground/60 transition-all duration-200"
                  aria-label="Collapse sidebar"
                >
                  <Minimize2 size={14} />
                </button>
                <button
                  onClick={toggleRightSidebarVisibility}
                  className="p-1 hover:bg-hover-bg text-foreground/60 transition-all duration-200"
                  aria-label="Close sidebar"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="p-3 overflow-y-auto h-[calc(100vh-48px)]">
              {effectiveRightPanelContent || (
                <div className="flex flex-col items-center justify-center h-full text-foreground/40">
                  <p className="text-sm">No content selected</p>
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
    </div>
  );
}
