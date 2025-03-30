'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { ProjectList } from '@/components/projects/project-list';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { Button } from '@/components/ui/button';
import { getProjects } from '@/lib/api';
import { Project } from '@/lib/types';
import { toast } from 'sonner';

// Define a type for the raw project data from the API
interface ApiProject {
  project_id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
}

export default function ProjectsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

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
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[80vh]">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button onClick={() => setIsDialogOpen(true)}>New Project</Button>
      </div>
      
      <ProjectList 
        projects={projects} 
        isLoading={!isLoaded} 
      />

      <CreateProjectDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
} 