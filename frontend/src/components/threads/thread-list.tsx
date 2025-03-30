'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getThreads, createThread, type Thread } from '@/lib/api';

interface ThreadListProps {
  projectId: string;
}

export function ThreadList({ projectId }: ThreadListProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  const loadThreads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getThreads(projectId);
      setThreads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load threads');
      console.error('Error loading threads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [projectId]);

  const handleCreateThread = async () => {
    setIsCreatingThread(true);
    try {
      const newThread = await createThread(projectId);
      setThreads((prev) => [newThread, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to create thread');
    } finally {
      setIsCreatingThread(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading threads...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500 mb-2">{error}</p>
        <button onClick={loadThreads} className="text-blue-500 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Threads</h3>
        <Button onClick={handleCreateThread} disabled={isCreatingThread}>
          {isCreatingThread ? 'Creating...' : 'New Thread'}
        </Button>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {threads.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No threads yet</p>
          </div>
        ) : (
          threads.map((thread) => {
            const messageCount = thread.messages.length;
            const lastMessageDate = messageCount > 0 
              ? new Date(thread.updated_at).toLocaleString() 
              : new Date(thread.created_at).toLocaleString();
            
            return (
              <Link 
                href={`/projects/${projectId}/threads/${thread.thread_id}`} 
                key={thread.thread_id}
              >
                <div className="p-3 rounded-md cursor-pointer hover:bg-gray-100 border transition-colors">
                  <div className="font-medium">Thread {thread.thread_id.slice(0, 8)}</div>
                  <div className="text-sm text-gray-500">
                    {lastMessageDate}
                    {messageCount > 0 ? ` • ${messageCount} messages` : ''}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
} 