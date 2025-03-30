'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getProject, getThreads, createThread, type Thread as ApiThread } from '@/lib/api';
import { Project, Thread } from '@/lib/types';
import { toast } from 'sonner';

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

export default function ProjectPage({ params }: { params: ProjectParams }) {
  const unwrappedParams = React.use(params as any) as ProjectParams;
  const projectId = unwrappedParams.id;
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [threads, setThreads] = useState<ApiThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isAuthLoading, router]);

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
      } catch (err: any) {
        console.error('Error loading project:', err);
        setError(err.message || 'Failed to load project');
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
      const apiThread: ApiThread = {
        thread_id: newThread.thread_id,
        project_id: projectId,
        user_id: user.id,
        created_at: newThread.created_at,
        updated_at: newThread.created_at,
        messages: []
      };
      
      setThreads(prevThreads => [apiThread, ...prevThreads]);
      toast.success('Thread created successfully');
      
      // Redirect to the new thread
      router.push(`/projects/${projectId}/threads/${newThread.thread_id}`);
    } catch (err: any) {
      console.error('Error creating thread:', err);
      toast.error(err.message || 'Failed to create thread');
    } finally {
      setIsCreatingThread(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[80vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl text-red-800 font-medium mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={() => router.push('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-gray-500 mt-1">{project.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/projects')}>
            Back
          </Button>
          <Button onClick={handleCreateThread} disabled={isCreatingThread}>
            {isCreatingThread ? 'Creating...' : 'New Thread'}
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Threads</h2>
        {threads.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium text-gray-700 mb-2">No threads yet</h3>
            <p className="text-gray-500 mb-4">Create your first thread to get started</p>
            <Button onClick={handleCreateThread} disabled={isCreatingThread}>
              {isCreatingThread ? 'Creating...' : 'Create Thread'}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {threads.map((thread) => (
              <Link 
                key={thread.thread_id}
                href={`/projects/${projectId}/threads/${thread.thread_id}`}
                passHref
                legacyBehavior
              >
                <a className="block transition-transform hover:scale-[1.02]">
                  <Card className="h-full cursor-pointer border-2 hover:border-gray-300">
                    <CardHeader>
                      <CardTitle>Conversation</CardTitle>
                      <CardDescription>Thread {thread.thread_id.slice(0, 8)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500">
                        {thread.messages.length} messages
                      </p>
                    </CardContent>
                    <CardFooter className="text-sm text-gray-500">
                      Created: {new Date(thread.created_at).toLocaleDateString()}
                    </CardFooter>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 