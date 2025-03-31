'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Plus, MessageSquare } from 'lucide-react';
import { getProject, getThreads, createThread, type Thread as ApiThread } from '@/lib/api';
import { Project } from '@/lib/types';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from '@/components/dashboard-layout';
import { ThreadCard } from '@/components/thread-card';
import { CardSkeleton } from '@/components/card-skeleton';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

// Define a type for the params to make React.use() work properly
type ProjectParams = { id: string };

// Define a type for the raw project data from the API
interface ApiProject {
  project_id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
}

export default function ProjectPage({ params }: { params: Promise<ProjectParams> }) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.id;
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [threads, setThreads] = useState<ApiThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  useEffect(() => {
    async function loadProject() {
      setIsLoading(true);
      setError(null);
      
      try {
        if (!projectId || projectId === 'undefined') {
          throw new Error('Invalid project ID');
        }
        
        const projectData = await getProject(projectId) as unknown as ApiProject;
        
        // Map the API project to our Project type
        setProject({
          id: projectData.project_id,
          name: projectData.name,
          description: projectData.description || '',
          user_id: projectData.user_id,
          created_at: projectData.created_at
        });
        
        const threadsData = await getThreads(projectId);
        setThreads(threadsData);
      } catch (err) {
        console.error('Error loading project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
        toast.error('Failed to load project details');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (user) {
      loadProject();
    }
  }, [projectId, user]);

  const handleCreateThread = async () => {
    if (!user) {
      toast.error('You must be logged in to create a thread');
      return;
    }

    setIsCreatingThread(true);
    try {
      const newThread = await createThread(projectId);
      toast.success('Thread created successfully');
      
      // Redirect to the new thread immediately
      router.push(`/projects/${projectId}/threads/${newThread.thread_id}`);
    } catch (err) {
      console.error('Error creating thread:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create thread');
      setIsCreatingThread(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <DashboardLayout>
        <PageHeader 
          title="Loading..."
          action={{
            label: "New Conversation",
            icon: Plus,
            onClick: handleCreateThread
          }}
        />

        <div className="mb-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
            <CardSkeleton variant="new" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={MessageSquare}
          title="Error Loading Project"
          description={error}
          action={{
            label: "Back to Projects",
            onClick: () => router.push('/projects')
          }}
        />
      </DashboardLayout>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <DashboardLayout>
      <PageHeader 
        title={project.name}
        description={project.description}
        action={{
          label: "New Conversation",
          icon: Plus,
          onClick: handleCreateThread,
          isLoading: isCreatingThread
        }}
      />

      <div className="mb-6">
        <h2 className="text-sm font-medium mb-4">Conversations</h2>
        {threads.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Start your first conversation with an AI agent"
            action={{
              label: "New Conversation",
              icon: Plus,
              onClick: handleCreateThread,
              isLoading: isCreatingThread
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {threads.map((thread) => (
              <ThreadCard
                key={thread.thread_id}
                thread={thread}
                projectId={projectId}
              />
            ))}
            
            <ThreadCard
              thread={{
                thread_id: 'new',
                messages: [],
                created_at: new Date().toISOString()
              }}
              projectId={projectId}
              variant="new"
              isLoading={isCreatingThread}
              onClick={handleCreateThread}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 