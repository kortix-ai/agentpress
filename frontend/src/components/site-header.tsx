"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { getProject, getThread } from "@/lib/api"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage
} from "@/components/ui/breadcrumb"

export function SiteHeader() {
  const pathname = usePathname()
  const params = useParams()
  const [projectName, setProjectName] = useState<string | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
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
      setLoading(true)
      
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
      } finally {
        setLoading(false)
      }
    }
    
    if (pathname?.startsWith("/projects/")) {
      fetchProjectData()
    } else {
      setProjectName(null)
      setThreadId(null)
    }
  }, [pathname, params])
  
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
    <header className="flex h-14 shrink-0 items-center">
      <div className="flex w-full items-center gap-1 px-4">
        <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-zinc-50" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 bg-zinc-200"
        />
        
        {renderBreadcrumbs()}
      </div>
    </header>
  )
}
