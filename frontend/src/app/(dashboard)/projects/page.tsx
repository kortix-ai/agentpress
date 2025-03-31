'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { Button } from '@/components/ui/button';
import { getProjects } from '@/lib/api';
import { Project } from '@/lib/types';
import { toast } from 'sonner';
import { Plus, FolderPlus } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProjectCard } from '@/components/project-card';
import { CardSkeleton } from '@/components/card-skeleton';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

interface ApiProject {
  project_id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
}

export default function ProjectsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      if (!user) return;
      
      try {
        const fetchedProjects = await getProjects() as unknown as ApiProject[];
        
        // Map the API response to our Project type format
        const mappedProjects = fetchedProjects.map(project => ({
          id: project.project_id,
          name: project.name,
          description: project.description || '',
          user_id: project.user_id,
          created_at: project.created_at
        }));
        
        setProjects(mappedProjects);
      } catch (error) {
        console.error('Failed to load projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setIsLoaded(true);
      }
    }

    if (user && !isLoaded) {
      loadProjects();
    }
  }, [user, isLoaded]);

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prevProjects) => [...prevProjects, newProject]);
    setIsDialogOpen(false);
    toast.success('Project created successfully');
    
    // Navigate to the new project
    router.push(`/projects/${newProject.id}`);
  };

  // Skeleton loader for loading state
  if (isAuthLoading || !isLoaded) {
    return (
      <DashboardLayout>
        <PageHeader 
          title="Projects"
          action={{
            label: "New Project",
            icon: Plus,
            onClick: () => setIsDialogOpen(true)
          }}
        />
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
          <CardSkeleton variant="new" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader 
        title="Projects"
        action={{
          label: "New Project",
          icon: Plus,
          onClick: () => setIsDialogOpen(true)
        }}
      />
      
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No projects yet"
          description="Create your first project to start conversations with AI agents"
          action={{
            label: "Create your first project",
            icon: Plus,
            onClick: () => setIsDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => router.push(`/projects/${project.id}`)}
            />
          ))}
          
          <ProjectCard
            project={{
              id: 'new',
              name: 'New Project',
              description: '',
              user_id: '',
              created_at: new Date().toISOString()
            }}
            variant="new"
            onClick={() => setIsDialogOpen(true)}
          />
        </div>
      )}

      <CreateProjectDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onProjectCreated={handleProjectCreated}
      />
    </DashboardLayout>
  );
} 