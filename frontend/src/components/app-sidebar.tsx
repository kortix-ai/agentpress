"use client"

import * as React from "react"
import {
  IconPlus,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react"
import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getProjects, getThreads, createThread } from "@/lib/api"
import { Project } from "@/lib/types"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { useRouter } from "next/navigation"
import { User } from "@supabase/supabase-js"

interface ApiProject {
  project_id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
}

interface ApiThread {
  thread_id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
}

function useProjectsAndThreads(user: User | null) {
  const [projects, setProjects] = useState<Project[]>([])
  const [threads, setThreads] = useState<Record<string, ApiThread[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const projectsLoadedRef = useRef(false) // Track if projects were loaded
  const loadingThreadsPerProjectRef = useRef<Record<string, boolean>>({}) // Track loading state per project

  const loadData = useCallback(async () => {
    if (!user) return
    
    // Skip if we already loaded the data to avoid redundant API calls
    if (projectsLoadedRef.current && hasLoaded) return
    
    try {
      setIsLoading(true)
      
      // Only fetch projects if not already loaded
      if (!projectsLoadedRef.current) {
        const fetchedProjects = await getProjects() as unknown as ApiProject[]
        
        // Map the API response to our Project type format
        const mappedProjects = fetchedProjects.map(project => ({
          id: project.project_id,
          name: project.name,
          description: project.description || '',
          user_id: project.user_id,
          created_at: project.created_at
        }))
        
        setProjects(mappedProjects)
        projectsLoadedRef.current = true // Mark projects as loaded
      }
      
      setHasLoaded(true)
    } catch (error) {
      console.error('Failed to load projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }, [user, hasLoaded])

  // Separate function to load threads for a specific project
  const loadThreadsForProject = useCallback(async (projectId: string) => {
    // Skip if already loading or loaded
    if (loadingThreadsPerProjectRef.current[projectId]) return
    
    // Skip if threads are already loaded for this project
    if (threads[projectId] && threads[projectId].length > 0) return
    
    try {
      loadingThreadsPerProjectRef.current[projectId] = true
      const projectThreads = await getThreads(projectId) as unknown as ApiThread[]
      
      setThreads(prev => ({
        ...prev,
        [projectId]: projectThreads
      }))
    } catch (error) {
      console.error(`Failed to load threads for project ${projectId}:`, error)
    } finally {
      loadingThreadsPerProjectRef.current[projectId] = false
    }
  }, [])

  const addProject = useCallback((newProject: Project) => {
    setProjects((prevProjects: Project[]) => [...prevProjects, newProject])
  }, [])

  const addThread = useCallback((projectId: string, newThread: ApiThread) => {
    setThreads((prev: Record<string, ApiThread[]>) => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), newThread]
    }))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { projects, threads, isLoading, addProject, addThread, loadThreadsForProject }
}

const ProjectItem = React.memo(({ 
  project, 
  isExpanded, 
  onToggle, 
  threads,
  isCreatingThread,
  onCreateThread
}: { 
  project: Project, 
  isExpanded: boolean, 
  onToggle: () => void, 
  threads: ApiThread[] | undefined,
  isCreatingThread: boolean,
  onCreateThread: () => void
}) => {
  const pathname = usePathname();
  const router = useRouter();
  
  // Use path matching to determine if project is active
  const projectItemVariants = {
    initial: { opacity: 0, y: -5 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -5 },
    transition: { duration: 0.2 }
  };

  // Thread list animation variants
  const threadListVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: "auto",
      transition: { 
        height: {
          type: "spring",
          stiffness: 500,
          damping: 30
        },
        opacity: { duration: 0.2, delay: 0.05 }
      }
    },
    exit: { 
      opacity: 0, 
      height: 0,
      transition: {
        height: { duration: 0.2 },
        opacity: { duration: 0.1 }
      }
    }
  };

  return (
    <motion.div
      key={project.id}
      variants={projectItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <li className="relative">
        <motion.div 
          className={`flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-all duration-200 cursor-pointer ${
            isExpanded ? 'text-zinc-900 font-medium bg-zinc-50 dark:bg-sidebar-foreground hover:bg-zinc-100' 
                      : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
          }`}
          whileHover={{ 
            scale: 1.01,
            x: 1
          }}
          transition={{ duration: 0.15 }}
          style={{
            backgroundColor: isExpanded ? 'transparent' : 'transparent'
          }}
          initial={false}
          animate={{
            backgroundColor: isExpanded 
              ? 'transparent' 
              : 'transparent'
          }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            onToggle()
          }}
          role="button"
          aria-expanded={isExpanded}
        >
          <div className="flex-1 truncate transition-colors duration-200">
            {project.name}
          </div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="cursor-pointer"
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-5 w-5 p-0 ml-1 rounded-full transition-all duration-200 cursor-pointer ${
                isExpanded
                  ? 'text-zinc-900 hover:bg-zinc-200 hover:text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
              onClick={(e) => {
                e.stopPropagation() // Prevent parent's onClick from firing
                router.push(`/projects/${project.id}`)
              }}
              aria-label={isExpanded ? "Go to project" : "Go to project"}
            >
              {isExpanded ? (
                <IconChevronDown className="size-3.5" />
              ) : (
                <IconChevronRight className="size-3.5" />
              )}
            </Button>
          </motion.div>
        </motion.div>
      </li>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.li
            variants={threadListVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <ul className="pl-4 space-y-0.5 mt-0.5">
              {!threads || threads.length === 0 ? (
                <li className="px-2 py-1.5 text-xs text-zinc-500">
                  No threads yet
                </li>
              ) : (
                threads.map((thread) => (
                  <ThreadItem 
                    key={thread.thread_id} 
                    thread={thread} 
                    projectId={project.id} 
                    pathname={pathname}
                  />
                ))
              )}
              <motion.li
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="rounded-md hover:bg-zinc-50/70"
              >
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className="w-full cursor-pointer"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start px-2 py-1.5 text-sm text-zinc-700 hover:text-zinc-900 bg-zinc-100 transition-all duration-200 cursor-pointer rounded-md"
                    onClick={() => onCreateThread()}
                    disabled={isCreatingThread}
                  >
                    {isCreatingThread ? (
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <IconPlus className="size-3.5" />
                        <span>New Conversation</span>
                      </div>
                    )}
                  </Button>
                </motion.div>
              </motion.li>
            </ul>
          </motion.li>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
ProjectItem.displayName = "ProjectItem";

const ThreadItem = React.memo(({ 
  thread, 
  projectId, 
  pathname 
}: { 
  thread: ApiThread; 
  projectId: string; 
  pathname: string;
}) => {
  const threadPath = `/projects/${projectId}/threads/${thread.thread_id}`;
  const isActive = pathname === threadPath;
  
  // Get first message content for thread title or use placeholder
  const threadTitle = thread.messages && thread.messages.length > 0 
    ? thread.messages[0].content 
    : 'New Conversation';

  return (
    <motion.li 
      key={thread.thread_id}
      whileHover={{ 
        x: 2,
      }}
      className={`rounded-sm ${
        isActive
          ? 'text-zinc-900 dark:text-zinc-50 font-normal' 
          : 'text-zinc-700 hover:bg-zinc-50/70 hover:text-zinc-900'
      }`}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25 
      }}
    >
      <Link
        href={threadPath}
        className="block px-2 py-1.5 text-sm rounded-md transition-all duration-200 cursor-pointer w-full"
      >
        <div className="flex items-center relative">
          {isActive && (
            <div className="absolute -left-4.5 w-1.5 h-1.5 rounded-[1px] bg-zinc-900 dark:bg-zinc-50" />
          )}
          <span className={`block truncate ${isActive ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            {threadTitle}
          </span>
        </div>
      </Link>
    </motion.li>
  );
});
ThreadItem.displayName = "ThreadItem";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const router = useRouter()
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreatingThread, setIsCreatingThread] = useState<Record<string, boolean>>({})
  const params = useParams()
  const currentProjectId = params?.id as string
  
  const { projects, threads, isLoading, addProject, addThread, loadThreadsForProject } = useProjectsAndThreads(user)

  useEffect(() => {
    if (currentProjectId) {
      setExpandedProjectId(currentProjectId)
      // Load threads for this project when expanded
      loadThreadsForProject(currentProjectId)
    }
  }, [currentProjectId, loadThreadsForProject])

  const toggleProjectExpanded = useCallback((projectId: string) => {
    const newExpandedState = expandedProjectId === projectId ? null : projectId
    setExpandedProjectId(newExpandedState)
    
    // Load threads when a project is expanded
    if (newExpandedState) {
      loadThreadsForProject(projectId)
    }
  }, [expandedProjectId, loadThreadsForProject])

  const handleProjectCreated = useCallback((newProject: Project) => {
    addProject(newProject)
    setIsDialogOpen(false)
    toast.success('Project created successfully')
    router.push(`/projects/${newProject.id}`)
  }, [router, addProject])

  const handleCreateThread = async (projectId: string) => {
    if (!user) {
      toast.error('You must be logged in to create a thread')
      return
    }

    setIsCreatingThread(prev => ({ ...prev, [projectId]: true }))
    
    try {
      const newThread = await createThread(projectId) as unknown as ApiThread
      addThread(projectId, newThread)
      toast.success('Thread created successfully')
      router.push(`/projects/${projectId}/threads/${newThread.thread_id}`)
    } catch (err) {
      console.error('Error creating thread:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create thread')
    } finally {
      setIsCreatingThread(prev => ({ ...prev, [projectId]: false }))
    }
  }

  const sidebarLogoMotion = {
    tap: { scale: 0.97 },
    hover: { 
      scale: 1.02,
      transition: { type: "spring", stiffness: 400, damping: 17 }
    }
  }

  // Memoize the sidebar projects list to avoid unnecessary re-renders
  const projectsList = React.useMemo(() => {
    if (isLoading) {
      return (
        <div className="mb-4 space-y-2 px-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-5/6" />
        </div>
      );
    }

    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">No projects yet</p>
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(true)}
            className="mb-2"
          >
            Create Project
          </Button>
        </div>
      );
    }

    return (
      <div className="py-1 mt-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Projects</h3>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="cursor-pointer"
                >
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md cursor-pointer transition-all duration-150"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <IconPlus className="size-3.5" />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <p>New Project</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <ul className="space-y-0.5 mt-1">
          <AnimatePresence initial={false}>
            {projects.map((project) => (
              <ProjectItem 
                key={project.id}
                project={project}
                isExpanded={expandedProjectId === project.id}
                onToggle={() => toggleProjectExpanded(project.id)}
                threads={threads[project.id]}
                isCreatingThread={!!isCreatingThread[project.id]}
                onCreateThread={() => handleCreateThread(project.id)}
              />
            ))}
          </AnimatePresence>
        </ul>
      </div>
    );
  }, [projects, isLoading, expandedProjectId, threads, isCreatingThread, toggleProjectExpanded, handleCreateThread, setIsDialogOpen]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b-0 h-14 px-4 py-3">
        <Link href="/dashboard" className="flex items-center group">
          <motion.div 
            className="flex items-center"
            whileHover="hover"
            whileTap="tap"
            variants={sidebarLogoMotion}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2.5 h-5 w-5 text-black transition-colors group-hover:text-zinc-800"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span className="text-lg font-medium tracking-tight group-hover:text-zinc-800">AgentPress</span>
          </motion.div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-0 px-2 custom-scrollbar">
        {projectsList}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40">
        {user && (
          <NavUser user={{
            name: user.email?.split('@')[0] || 'Guest',
            email: user.email || '',
            avatar: '/avatars/user.jpg',
          }} />
        )}
      </SidebarFooter>
      <CreateProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onProjectCreated={handleProjectCreated}
      />
    </Sidebar>
  )
}
