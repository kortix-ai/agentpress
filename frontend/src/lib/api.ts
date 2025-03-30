import { createClient } from '@/utils/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

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
  messages: any[];
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
  responses: any[];
  error: string | null;
}

// Project APIs
export const getProjects = async (): Promise<Project[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*');
  
  if (error) throw error;
  return data || [];
};

export const getProject = async (projectId: string): Promise<Project> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .single();
  
  if (error) throw error;
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
  const supabase = createClient();
  let query = supabase.from('threads').select('*');
  
  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Parse messages from JSON string
  return (data || []).map(thread => ({
    ...thread,
    messages: thread.messages ? JSON.parse(thread.messages) : []
  }));
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
};

export const getMessages = async (threadId: string, hideToolMsgs: boolean = false): Promise<Message[]> => {
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
  
  // Filter out tool messages if requested
  if (hideToolMsgs) {
    return messages.filter((msg: Message) => msg.role !== 'tool');
  }
  
  return messages;
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
  return data.agent_runs || [];
};

export const streamAgent = (agentRunId: string, callbacks: {
  onMessage: (content: string) => void;
  onToolCall: (name: string, args: any) => void;
  onError: (error: any) => void;
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
          
          const data = JSON.parse(rawData);
          
          if (data.type === 'content' && data.content) {
            if (data.content.startsWith('data: {')) {
              try {
                const innerData = JSON.parse(data.content.substring(6));
                if (innerData.type === 'content' && innerData.content) {
                  callbacks.onMessage(innerData.content);
                } else if (innerData.type === 'tool_call') {
                  callbacks.onToolCall(innerData.name, innerData.arguments);
                }
              } catch (e) {
                callbacks.onMessage(data.content);
              }
            } else {
              callbacks.onMessage(data.content);
            }
          } else if (data.type === 'tool_call') {
            callbacks.onToolCall(data.name, data.arguments);
          } else if (data.type === 'error') {
            console.error(`[STREAM] Error from server: ${data.message}`);
            callbacks.onError(data.message);
          } else if (data.type === 'status') {
            console.log(`[STREAM] Status update: ${data.status}`);
            
            if (data.status === 'completed') {
              console.log(`[STREAM] Agent run completed - closing stream for ${agentRunId}`);
              
              // Close connection first before handling completion
              if (eventSourceInstance) {
                console.log(`[STREAM] Closing EventSource for ${agentRunId}`);
                eventSourceInstance.close();
                eventSourceInstance = null;
              }
              
              // Then notify completion (once)
              if (!isClosing) {
                console.log(`[STREAM] Calling onClose for ${agentRunId}`);
                isClosing = true;
                callbacks.onClose();
              }
            }
          }
        } catch (error) {
          console.error(`[STREAM] Error parsing message:`, error);
          callbacks.onError(error);
        }
      };
      
      eventSourceInstance.onerror = (event) => {
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
        callbacks.onError(error);
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