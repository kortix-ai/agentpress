import { createClient } from '@/utils/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

// Simple cache implementation
const apiCache = {
  projects: new Map(),
  threads: new Map(),
  threadMessages: new Map(),
  agentRuns: new Map(),
  
  getProject: (projectId: string) => apiCache.projects.get(projectId),
  setProject: (projectId: string, data: any) => apiCache.projects.set(projectId, data),
  
  getProjects: () => apiCache.projects.get('all'),
  setProjects: (data: any) => apiCache.projects.set('all', data),
  
  getThreads: (projectId: string) => apiCache.threads.get(projectId || 'all'),
  setThreads: (projectId: string, data: any) => apiCache.threads.set(projectId || 'all', data),
  
  getThreadMessages: (threadId: string) => apiCache.threadMessages.get(threadId),
  setThreadMessages: (threadId: string, data: any) => apiCache.threadMessages.set(threadId, data),
  
  getAgentRuns: (threadId: string) => apiCache.agentRuns.get(threadId),
  setAgentRuns: (threadId: string, data: any) => apiCache.agentRuns.set(threadId, data),
  
  // Helper to clear parts of the cache when data changes
  invalidateThreadMessages: (threadId: string) => apiCache.threadMessages.delete(threadId),
  invalidateAgentRuns: (threadId: string) => apiCache.agentRuns.delete(threadId),
};

// Add a fetch queue system to prevent multiple simultaneous requests
const fetchQueue = {
  agentRuns: new Map<string, Promise<any>>(),
  threads: new Map<string, Promise<any>>(),
  messages: new Map<string, Promise<any>>(),
  projects: new Map<string, Promise<any>>(),
  
  getQueuedAgentRuns: (threadId: string) => fetchQueue.agentRuns.get(threadId),
  setQueuedAgentRuns: (threadId: string, promise: Promise<any>) => {
    fetchQueue.agentRuns.set(threadId, promise);
    // Auto-clean the queue after the promise resolves
    promise.finally(() => {
      fetchQueue.agentRuns.delete(threadId);
    });
    return promise;
  },
  
  getQueuedThreads: (projectId: string) => fetchQueue.threads.get(projectId || 'all'),
  setQueuedThreads: (projectId: string, promise: Promise<any>) => {
    fetchQueue.threads.set(projectId || 'all', promise);
    promise.finally(() => {
      fetchQueue.threads.delete(projectId || 'all');
    });
    return promise;
  },
  
  getQueuedMessages: (threadId: string) => fetchQueue.messages.get(threadId),
  setQueuedMessages: (threadId: string, promise: Promise<any>) => {
    fetchQueue.messages.set(threadId, promise);
    promise.finally(() => {
      fetchQueue.messages.delete(threadId);
    });
    return promise;
  },
  
  getQueuedProjects: () => fetchQueue.projects.get('all'),
  setQueuedProjects: (promise: Promise<any>) => {
    fetchQueue.projects.set('all', promise);
    promise.finally(() => {
      fetchQueue.projects.delete('all');
    });
    return promise;
  }
};

export type Project = {
  id: string;
  name: string;
  description: string;
  user_id: string;
  created_at: string;
}

export type Thread = {
  thread_id: string;
  user_id: string | null;
  project_id?: string | null;
  messages: Message[];
  created_at: string;
}

export type Message = {
  role: string;
  content: string;
}

export type AgentRun = {
  id: string;
  thread_id: string;
  status: 'running' | 'completed' | 'stopped' | 'error';
  started_at: string;
  completed_at: string | null;
  responses: Message[];
  error: string | null;
}

export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
}

// Project APIs
export const getProjects = async (): Promise<Project[]> => {
  // Check if we already have a pending request
  const pendingRequest = fetchQueue.getQueuedProjects();
  if (pendingRequest) {
    return pendingRequest;
  }
  
  // Check cache first
  const cached = apiCache.getProjects();
  if (cached) {
    return cached;
  }
  
  // Create and queue the promise
  const fetchPromise = (async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*');
    
    if (error) throw error;
    
    // Cache the result
    apiCache.setProjects(data || []);
    return data || [];
  })();
  
  // Add to queue and return
  return fetchQueue.setQueuedProjects(fetchPromise);
};

export const getProject = async (projectId: string): Promise<Project> => {
  // Check cache first
  const cached = apiCache.getProject(projectId);
  if (cached) {
    return cached;
  }
  
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .single();
  
  if (error) throw error;
  
  // Cache the result
  apiCache.setProject(projectId, data);
  return data;
};

export const createProject = async (projectData: { name: string; description: string }): Promise<Project> => {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError) throw userError;
  if (!userData.user) throw new Error('You must be logged in to create a project');
  
  const { data, error } = await supabase
    .from('projects')
    .insert({ 
      name: projectData.name, 
      description: projectData.description || null,
      user_id: userData.user.id
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Map the database response to our Project type
  return {
    id: data.project_id,
    name: data.name,
    description: data.description || '',
    user_id: data.user_id,
    created_at: data.created_at
  };
};

export const updateProject = async (projectId: string, data: Partial<Project>): Promise<Project> => {
  const supabase = createClient();
  const { data: updatedData, error } = await supabase
    .from('projects')
    .update(data)
    .eq('project_id', projectId)
    .select()
    .single();
  
  if (error) throw error;
  return updatedData;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('project_id', projectId);
  
  if (error) throw error;
};

// Thread APIs
export const getThreads = async (projectId?: string): Promise<Thread[]> => {
  // Check if we already have a pending request
  const pendingRequest = fetchQueue.getQueuedThreads(projectId || 'all');
  if (pendingRequest) {
    return pendingRequest;
  }
  
  // Check cache first
  const cached = apiCache.getThreads(projectId || 'all');
  if (cached) {
    return cached;
  }
  
  // Create and queue the promise
  const fetchPromise = (async () => {
    const supabase = createClient();
    let query = supabase.from('threads').select('*');
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Parse messages from JSON string
    const threads = (data || []).map(thread => ({
      ...thread,
      messages: thread.messages ? JSON.parse(thread.messages) : []
    }));
    
    // Cache the result
    apiCache.setThreads(projectId || 'all', threads);
    return threads;
  })();
  
  // Add to queue and return
  return fetchQueue.setQueuedThreads(projectId || 'all', fetchPromise);
};

export const getThread = async (threadId: string): Promise<Thread> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('thread_id', threadId)
    .single();
  
  if (error) throw error;
  
  return {
    ...data,
    messages: data.messages ? JSON.parse(data.messages) : []
  };
};

export const createThread = async (projectId?: string): Promise<Thread> => {
  const supabase = createClient();
  // Generate a random UUID for the thread
  const threadId = crypto.randomUUID();
  
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError) throw userError;
  
  const { data, error } = await supabase
    .from('threads')
    .insert({
      thread_id: threadId,
      project_id: projectId || null,
      user_id: userData.user?.id || null,
      messages: JSON.stringify([])
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating thread:', error);
    throw new Error(`Error creating thread: ${error.message}`);
  }
  
  return {
    ...data,
    messages: []
  };
};

export const addMessage = async (threadId: string, message: { role: string, content: string }): Promise<void> => {
  const supabase = createClient();
  // First, get the current thread messages
  const { data: threadData, error: threadError } = await supabase
    .from('threads')
    .select('messages')
    .eq('thread_id', threadId)
    .single();
  
  if (threadError) {
    console.error('Error fetching thread messages:', threadError);
    throw new Error(`Error adding message: ${threadError.message}`);
  }
  
  // Parse existing messages
  const existingMessages = threadData.messages ? JSON.parse(threadData.messages) : [];
  
  // Add the new message
  const updatedMessages = [...existingMessages, message];
  
  // Update the thread with the new messages
  const { error: updateError } = await supabase
    .from('threads')
    .update({
      messages: JSON.stringify(updatedMessages)
    })
    .eq('thread_id', threadId);
  
  if (updateError) {
    console.error('Error updating thread messages:', updateError);
    throw new Error(`Error adding message: ${updateError.message}`);
  }
  
  // Invalidate the cache for this thread's messages
  apiCache.invalidateThreadMessages(threadId);
};

export const getMessages = async (threadId: string, hideToolMsgs: boolean = false): Promise<Message[]> => {
  // Check if we already have a pending request
  const pendingRequest = fetchQueue.getQueuedMessages(threadId);
  if (pendingRequest) {
    // Apply filter if needed when promise resolves
    if (hideToolMsgs) {
      return pendingRequest.then(messages => 
        messages.filter((msg: Message) => msg.role !== 'tool')
      );
    }
    return pendingRequest;
  }
  
  // Check cache first
  const cached = apiCache.getThreadMessages(threadId);
  if (cached) {
    // Apply filter if needed
    return hideToolMsgs ? cached.filter((msg: Message) => msg.role !== 'tool') : cached;
  }
  
  // Create and queue the promise
  const fetchPromise = (async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('threads')
      .select('messages')
      .eq('thread_id', threadId)
      .single();
    
    if (error) {
      console.error('Error fetching messages:', error);
      throw new Error(`Error getting messages: ${error.message}`);
    }
    
    // Parse messages from JSON string
    const messages = data.messages ? JSON.parse(data.messages) : [];
    
    // Cache the result
    apiCache.setThreadMessages(threadId, messages);
    
    return messages;
  })();
  
  // Add to queue
  const queuedPromise = fetchQueue.setQueuedMessages(threadId, fetchPromise);
  
  // Apply filter if needed when promise resolves
  if (hideToolMsgs) {
    return queuedPromise.then(messages => 
      messages.filter((msg: Message) => msg.role !== 'tool')
    );
  }
  
  return queuedPromise;
};

// Agent APIs
export const startAgent = async (threadId: string): Promise<{ agent_run_id: string }> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No access token available');
  }

  const response = await fetch(`${API_URL}/thread/${threadId}/agent/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Error starting agent: ${response.statusText}`);
  }
  
  // Invalidate relevant caches
  apiCache.invalidateAgentRuns(threadId);
  apiCache.invalidateThreadMessages(threadId);
  
  return response.json();
};

export const stopAgent = async (agentRunId: string): Promise<void> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No access token available');
  }

  const response = await fetch(`${API_URL}/agent-run/${agentRunId}/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Error stopping agent: ${response.statusText}`);
  }
};

export const getAgentStatus = async (agentRunId: string): Promise<AgentRun> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No access token available');
  }

  const response = await fetch(`${API_URL}/agent-run/${agentRunId}`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Error getting agent status: ${response.statusText}`);
  }
  
  return response.json();
};

export const getAgentRuns = async (threadId: string): Promise<AgentRun[]> => {
  // Check if we already have a pending request for this thread ID
  const pendingRequest = fetchQueue.getQueuedAgentRuns(threadId);
  if (pendingRequest) {
    return pendingRequest;
  }
  
  // Check cache first
  const cached = apiCache.getAgentRuns(threadId);
  if (cached) {
    return cached;
  }
  
  // Create and queue the promise to prevent duplicate requests
  const fetchPromise = (async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${API_URL}/thread/${threadId}/agent-runs`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error getting agent runs: ${response.statusText}`);
    }
    
    const data = await response.json();
    const agentRuns = data.agent_runs || [];
    
    // Cache the result
    apiCache.setAgentRuns(threadId, agentRuns);
    return agentRuns;
  })();
  
  // Add to queue and return
  return fetchQueue.setQueuedAgentRuns(threadId, fetchPromise);
};

export const streamAgent = (agentRunId: string, callbacks: {
  onMessage: (content: string) => void;
  onError: (error: Error | string) => void;
  onClose: () => void;
}): () => void => {
  let eventSourceInstance: EventSource | null = null;
  let isClosing = false;
  
  console.log(`[STREAM] Setting up stream for agent run ${agentRunId}`);
  
  const setupStream = async () => {
    try {
      if (isClosing) {
        console.log(`[STREAM] Already closing, not setting up stream for ${agentRunId}`);
        return;
      }
      
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('[STREAM] No auth token available');
        callbacks.onError(new Error('Authentication required'));
        callbacks.onClose();
        return;
      }
      
      const url = new URL(`${API_URL}/agent-run/${agentRunId}/stream`);
      url.searchParams.append('token', session.access_token);
      
      console.log(`[STREAM] Creating EventSource for ${agentRunId}`);
      eventSourceInstance = new EventSource(url.toString());
      
      eventSourceInstance.onopen = () => {
        console.log(`[STREAM] Connection opened for ${agentRunId}`);
      };
      
      eventSourceInstance.onmessage = (event) => {
        try {
          const rawData = event.data;
          if (rawData.includes('"type":"ping"')) return;
          
          // Log raw data for debugging
          console.log(`[STREAM] Received data: ${rawData.substring(0, 100)}${rawData.length > 100 ? '...' : ''}`);
          
          // Skip empty messages
          if (!rawData || rawData.trim() === '') {
            console.debug('[STREAM] Received empty message, skipping');
            return;
          }
          
          // Pass the raw data directly to onMessage for handling in the component
          callbacks.onMessage(rawData);
        } catch (error) {
          console.error(`[STREAM] Error handling message:`, error);
          callbacks.onError(error instanceof Error ? error : String(error));
        }
      };
      
      eventSourceInstance.onerror = () => {
        // EventSource errors are often just connection closures
        // For clean closures (manual or completed), we don't need to log an error
        if (isClosing) {
          console.log(`[STREAM] EventSource closed as expected for ${agentRunId}`);
          return;
        }
        
        // Only log as error for unexpected closures
        console.log(`[STREAM] EventSource connection closed for ${agentRunId}`);
        
        if (!isClosing) {
          console.log(`[STREAM] Handling connection close for ${agentRunId}`);
          
          // Close the connection
          if (eventSourceInstance) {
            eventSourceInstance.close();
            eventSourceInstance = null;
          }
          
          // Then notify error (once)
          isClosing = true;
          callbacks.onClose();
        }
      };
      
    } catch (error) {
      console.error(`[STREAM] Error setting up stream:`, error);
      
      if (!isClosing) {
        isClosing = true;
        callbacks.onError(error instanceof Error ? error : String(error));
        callbacks.onClose();
      }
    }
  };
  
  // Set up the stream once
  setupStream();
  
  // Return cleanup function
  return () => {
    console.log(`[STREAM] Manual cleanup called for ${agentRunId}`);
    
    if (isClosing) {
      console.log(`[STREAM] Already closing, ignoring duplicate cleanup for ${agentRunId}`);
      return;
    }
    
    isClosing = true;
    
    if (eventSourceInstance) {
      console.log(`[STREAM] Manually closing EventSource for ${agentRunId}`);
      eventSourceInstance.close();
      eventSourceInstance = null;
    }
  };
};