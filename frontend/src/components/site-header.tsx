"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { getProject } from "@/lib/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Copy, Columns, LayoutIcon } from "lucide-react"
import { toast } from "sonner"
import { useView } from "@/context/view-context"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function SiteHeader() {
  const pathname = usePathname()
  const params = useParams()
  const [projectName, setProjectName] = useState<string | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)
  const { isDualView, toggleViewMode } = useView()
  
  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("URL copied to clipboard")
  }

  // Extract page name from pathname
  const getPageTitle = () => {
    if (!pathname) return "Dashboard"
    
    // Handle special cases
    if (pathname === "/dashboard") return "Dashboard"
    
    // For project pages
    if (pathname.startsWith("/projects/")) {
      if (pathname.includes("/threads/")) {
        return "Conversation"
      }
      return "Project"
    }
    
    // Default: capitalize the last segment of the path
    const segment = pathname.split("/").filter(Boolean).pop() || ""
    return segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  useEffect(() => {
    async function fetchProjectData() {
      if (!params) return
      
      const projectId = params.id as string
      
      if (!projectId) return
      
      // Skip API call if we already have the project name for this project ID
      if (projectId && projectName) return
      
      try {
        const projectData = await getProject(projectId)
        setProjectName(projectData.name)
        
        // If we're on a thread page, get the thread ID
        if (pathname?.includes("/threads/")) {
          const threadId = params.threadId as string
          if (threadId) {
            setThreadId(threadId)
          }
        }
      } catch (error) {
        console.error("Error fetching project data:", error)
      }
    }
    
    if (pathname?.startsWith("/projects/")) {
      fetchProjectData()
    } else {
      setProjectName(null)
      setThreadId(null)
    }
  }, [pathname, params, projectName])
  
  // Determine what breadcrumbs to show based on current route
  const renderBreadcrumbs = () => {
    // If not on a projects page, just show the current page title
    if (!pathname?.startsWith("/projects")) {
      return (
        <h1 className="text-sm font-medium text-zinc-800">
          {getPageTitle()}
        </h1>
      )
    }
    
    // On projects list page
    if (pathname === "/projects") {
      return (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span>Projects</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )
    }
    
    // On project detail page
    if (pathname?.includes("/projects/") && !pathname?.includes("/threads/")) {
      return (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Link href="/projects" className="hover:underline">
                Projects
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span>{projectName || "Project"}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )
    }
    
    // On conversation page
    if (pathname?.includes("/threads/")) {
      return (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Link href="/projects" className="hover:underline">
                Projects
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Link href={`/projects/${params.id}`} className="hover:underline">
                {projectName || "Project"}
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span>
                Conversation {threadId ? threadId.slice(0, 8) : ""}
              </span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )
    }
    
    // Fallback
    return (
      <h1 className="text-sm font-medium text-zinc-800">
        {getPageTitle()}
      </h1>
    )
  }
  
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border">
      <div className="flex w-full items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-zinc-50" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 bg-zinc-200"
          />
          {renderBreadcrumbs()}
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleViewMode}
                  className="h-8 w-8"
                >
                  {isDualView ? 
                    <LayoutIcon className="h-4 w-4" /> : 
                    <Columns className="h-4 w-4" />
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isDualView ? "Single view" : "Dual view"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyUrl}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy link</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  )
}
