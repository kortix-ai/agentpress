"use client"

import * as React from "react"
import {
  IconHelp,
  IconPlus,
  IconSearch,
  IconSettings,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { getProjects, getThreads, createThread } from "@/lib/api"
import { Project } from "@/lib/types"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { useRouter } from "next/navigation"

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
  messages: any[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [threads, setThreads] = useState<Record<string, any[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreatingThread, setIsCreatingThread] = useState<Record<string, boolean>>({})
  const pathname = usePathname()
  const params = useParams()
  const currentProjectId = params?.id as string
  
  useEffect(() => {
    if (currentProjectId) {
      setExpandedProjects(prev => ({...prev, [currentProjectId]: true}))
    }
  }, [currentProjectId])

  useEffect(() => {
    async function loadProjects() {
      if (!user) return
      
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
        const threadsMap: Record<string, any[]> = {}
        await Promise.all(
          mappedProjects.map(async (project) => {
            try {
              const projectThreads = await getThreads(project.id)
              threadsMap[project.id] = projectThreads
            } catch (error) {
              console.error(`Failed to load threads for project ${project.id}:`, error)
            }
          })
        )
        
        setThreads(threadsMap)
      } catch (error) {
        console.error('Failed to load projects:', error)
        toast.error('Failed to load projects')
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadProjects()
    }
  }, [user])

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prevProjects) => [...prevProjects, newProject])
    setIsDialogOpen(false)
    toast.success('Project created successfully')
    router.push(`/projects/${newProject.id}`)
  }

  const handleCreateThread = async (projectId: string) => {
    if (!user) {
      toast.error('You must be logged in to create a thread')
      return
    }

    setIsCreatingThread(prev => ({ ...prev, [projectId]: true }))
    
    try {
      const newThread = await createThread(projectId)
      
      // Update threads list
      const updatedThreads = await getThreads(projectId)
      setThreads(prev => ({
        ...prev,
        [projectId]: updatedThreads
      }))
      
      toast.success('Thread created successfully')
      
      // Redirect to the new thread
      router.push(`/projects/${projectId}/threads/${newThread.thread_id}`)
    } catch (err: any) {
      console.error('Error creating thread:', err)
      toast.error(err.message || 'Failed to create thread')
    } finally {
      setIsCreatingThread(prev => ({ ...prev, [projectId]: false }))
    }
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b-0 h-14 px-4 py-3">
        <Link href="/dashboard" className="flex items-center group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-5 w-5 text-black transition-transform duration-200 group-hover:scale-110"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-base font-medium">AgentPress</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-0 px-2">
        {/* Projects List */}
        <div className="py-1 mt-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Projects</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-md"
              onClick={() => setIsDialogOpen(true)}
            >
              <IconPlus className="size-3.5" />
            </Button>
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
                <React.Fragment key={project.id}>
                  <li className="relative">
                    <div 
                      className={`flex items-center justify-between px-2 py-1.5 text-sm rounded-md ${
                        currentProjectId === project.id 
                          ? 'bg-zinc-100 text-zinc-900 font-medium' 
                          : 'text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <Link 
                        href={`/projects/${project.id}`}
                        className="flex-1 truncate"
                      >
                        {project.name}
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0 ml-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100" 
                        onClick={(e) => {
                          e.preventDefault()
                          toggleProjectExpanded(project.id)
                        }}
                      >
                        {expandedProjects[project.id] ? (
                          <IconChevronDown className="size-3.5" />
                        ) : (
                          <IconChevronRight className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  
                    {/* Show threads if expanded */}
                    {expandedProjects[project.id] && (
                      <ul className="mt-0.5 mb-1 ml-3 pl-2 border-l border-zinc-100 space-y-0.5">
                        {threads[project.id]?.map((thread) => (
                          <li key={thread.thread_id}>
                            <Link 
                              href={`/projects/${project.id}/threads/${thread.thread_id}`}
                              className={`block px-2 py-1.5 text-xs rounded-md ${
                                pathname === `/projects/${project.id}/threads/${thread.thread_id}`
                                  ? 'bg-zinc-100 text-zinc-900 font-medium'
                                  : 'text-zinc-600 hover:bg-zinc-50'
                              }`}
                            >
                              Thread {thread.thread_id.slice(0, 8)}
                            </Link>
                          </li>
                        ))}
                        <li>
                          <button
                            onClick={() => handleCreateThread(project.id)}
                            disabled={isCreatingThread[project.id]}
                            className={`w-full flex items-center px-2 py-1.5 text-xs rounded-md ${
                              isCreatingThread[project.id]
                                ? 'opacity-70 cursor-not-allowed'
                                : 'text-zinc-600 hover:bg-zinc-50 cursor-pointer'
                            }`}
                          >
                            <IconPlus className="mr-1 size-3 text-zinc-500" />
                            {isCreatingThread[project.id] ? 'Creating...' : 'New Thread'}
                          </button>
                        </li>
                      </ul>
                    )}
                  </li>
                </React.Fragment>
              ))
            )}
          </ul>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user?.email?.split('@')[0] || 'Guest',
          email: user?.email || '',
          avatar: '/avatars/user.jpg',
        }} />
      </SidebarFooter>

      <CreateProjectDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onProjectCreated={handleProjectCreated}
      />
    </Sidebar>
  )
}
