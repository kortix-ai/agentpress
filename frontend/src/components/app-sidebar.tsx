"use client"

import * as React from "react"
import {
  IconPlus,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

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

  const loadData = useCallback(async () => {
    if (!user || hasLoaded) return
    
    try {
      setIsLoading(true)
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
      
      // Load threads for each project
      const threadsMap: Record<string, ApiThread[]> = {}
      await Promise.all(
        mappedProjects.map(async (project) => {
          try {
            const projectThreads = await getThreads(project.id) as unknown as ApiThread[]
            threadsMap[project.id] = projectThreads
          } catch (error) {
            console.error(`Failed to load threads for project ${project.id}:`, error)
          }
        })
      )
      
      setThreads(threadsMap)
      setHasLoaded(true)
    } catch (error) {
      console.error('Failed to load projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }, [user, hasLoaded])

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

  return { projects, threads, isLoading, addProject, addThread }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const router = useRouter()
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreatingThread, setIsCreatingThread] = useState<Record<string, boolean>>({})
  const pathname = usePathname()
  const params = useParams()
  const currentProjectId = params?.id as string
  
  const { projects, threads, isLoading, addProject, addThread } = useProjectsAndThreads(user)

  useEffect(() => {
    if (currentProjectId) {
      setExpandedProjectId(currentProjectId)
    }
  }, [currentProjectId])

  const toggleProjectExpanded = useCallback((projectId: string) => {
    setExpandedProjectId(prev => prev === projectId ? null : projectId)
  }, [])

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

  const projectItemVariants = {
    initial: { opacity: 0, y: -5 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -5 },
    transition: { duration: 0.2 }
  }

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
  }

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
      <SidebarContent className="py-0 px-2">
        {/* Projects List */}
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
            {isLoading ? (
              // Loading skeletons
              Array(3).fill(0).map((_, i) => (
                <li key={`skeleton-${i}`} className="px-2 py-1">
                  <Skeleton className="h-4 w-full" />
                </li>
              ))
            ) : projects.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-zinc-500">
                No projects yet
              </li>
            ) : (
              projects.map((project) => (
                <motion.div
                  key={project.id}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={projectItemVariants}
                >
                  <li className="relative">
                    <motion.div 
                      className={`flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-all duration-200 cursor-pointer ${
                        expandedProjectId === project.id 
                          ? 'text-zinc-900 font-medium bg-zinc-50 hover:bg-zinc-100' 
                          : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                      }`}
                      whileHover={{ 
                        scale: 1.01,
                        x: 1
                      }}
                      transition={{ duration: 0.15 }}
                      style={{
                        backgroundColor: expandedProjectId === project.id ? 'rgb(249 250 251)' : 'transparent'
                      }}
                      initial={false}
                      animate={{
                        backgroundColor: expandedProjectId === project.id 
                          ? 'rgb(249 250 251)' 
                          : 'transparent'
                      }}
                      whileTap={{ scale: 0.99 }}
                      onClick={(e) => {
                        // Either toggle expansion or navigate to project
                        if (expandedProjectId === project.id) {
                          router.push(`/projects/${project.id}`)
                        } else {
                          toggleProjectExpanded(project.id)
                        }
                      }}
                      role="button"
                      aria-expanded={expandedProjectId === project.id}
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
                            expandedProjectId === project.id
                              ? 'text-zinc-900 hover:bg-zinc-200 hover:text-zinc-950'
                              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation() // Prevent parent's onClick from firing
                            toggleProjectExpanded(project.id)
                          }}
                          aria-label={expandedProjectId === project.id ? "Collapse project" : "Expand project"}
                        >
                          {expandedProjectId === project.id ? (
                            <IconChevronDown className="size-3.5" />
                          ) : (
                            <IconChevronRight className="size-3.5" />
                          )}
                        </Button>
                      </motion.div>
                    </motion.div>
                  </li>
                  <AnimatePresence>
                    {expandedProjectId === project.id && (
                      <motion.li
                        variants={threadListVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="overflow-hidden"
                      >
                        <ul className="pl-4 space-y-0.5 mt-0.5">
                          {threads[project.id]?.map((thread) => (
                            <motion.li 
                              key={thread.thread_id}
                              whileHover={{ 
                                x: 2,
                              }}
                              className={`rounded-md ${
                                pathname?.includes(`/threads/${thread.thread_id}`)
                                  ? 'bg-zinc-50 text-zinc-900 font-medium' 
                                  : 'text-zinc-700 hover:bg-zinc-50/70 hover:text-zinc-900'
                              }`}
                              transition={{ 
                                type: "spring", 
                                stiffness: 400, 
                                damping: 25 
                              }}
                            >
                              <Link
                                href={`/projects/${project.id}/threads/${thread.thread_id}`}
                                className="block px-2 py-1.5 text-sm rounded-md transition-all duration-200 cursor-pointer w-full"
                              >
                                <span className="block truncate">
                                  {thread.messages[0]?.content || 'New Conversation'}
                                </span>
                              </Link>
                            </motion.li>
                          ))}
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
                                className="w-full justify-start px-2 py-1.5 text-sm text-zinc-700 hover:text-zinc-900 transition-all duration-200 cursor-pointer rounded-md"
                                onClick={() => handleCreateThread(project.id)}
                                disabled={isCreatingThread[project.id]}
                              >
                                {isCreatingThread[project.id] ? (
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
              ))
            )}
          </ul>
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40">
        {user && (
          <motion.div
            whileHover={{ y: -1 }}
            transition={{ type: "spring", stiffness: 500 }}
            className="cursor-pointer"
          >
            <NavUser user={{
              name: user.email?.split('@')[0] || 'Guest',
              email: user.email || '',
              avatar: '/avatars/user.jpg',
            }} />
          </motion.div>
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
