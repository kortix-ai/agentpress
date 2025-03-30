import { getAuthToken } from '../supabase';
import { API_URL } from '../config';

export type AgentStatus = 'idle' | 'running' | 'stopped' | 'completed';

export type AgentStreamCallbacks = {
  onMessage: (content: string) => void;
  onToolCall: (name: string, args: any) => void;
  onError: (error: any) => void;
  onClose: () => void;
};

export type AgentRun = {
  id: string;
  thread_id: string;
  status: 'running' | 'completed' | 'stopped' | 'error';
  started_at: string;
  completed_at: string | null;
  responses: any[];
  error: string | null;
};

class AgentService {
  private static instance: AgentService;
  private constructor() {}

  public static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  public async startAgent(threadId: string): Promise<{ agent_run_id: string }> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/thread/${threadId}/agent/start`, {
      method: 'POST',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Error starting agent: ${response.statusText}`);
    }
    
    return response.json();
  }

  public async stopAgent(agentRunId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/agent-run/${agentRunId}/stop`, {
      method: 'POST',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Error stopping agent: ${response.statusText}`);
    }
  }

  public async getAgentStatus(agentRunId: string): Promise<AgentRun> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/agent-run/${agentRunId}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Error getting agent status: ${response.statusText}`);
    }
    
    return response.json();
  }

  public async getAgentRuns(threadId: string): Promise<AgentRun[]> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/thread/${threadId}/agent-runs`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Error getting agent runs: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.agent_runs || [];
  }

  public streamAgent(agentRunId: string, callbacks: AgentStreamCallbacks): () => void {
    let eventSourceInstance: EventSource | null = null;
    let isClosing = false;
    
    const setupStream = async () => {
      try {
        if (isClosing) return;
        
        const token = await getAuthToken();
        if (!token) {
          callbacks.onError(new Error('Authentication required'));
          callbacks.onClose();
          return;
        }
        
        const url = new URL(`${API_URL}/agent-run/${agentRunId}/stream`);
        url.searchParams.append('token', token);
        
        if (eventSourceInstance) {
          eventSourceInstance.close();
        }
        
        eventSourceInstance = new EventSource(url.toString());
        
        eventSourceInstance.onopen = () => {
          console.log('Stream connection opened');
        };
        
        eventSourceInstance.onmessage = (event) => {
          try {
            const rawData = event.data;
            if (rawData.includes('"type":"ping"')) return;
            
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
              callbacks.onError(data.message);
            } else if (data.type === 'status' && data.status === 'completed') {
              callbacks.onClose();
            }
          } catch (error) {
            console.error('Error parsing stream message:', error);
            callbacks.onError(error);
          }
        };
        
        eventSourceInstance.onerror = (error) => {
          if (!isClosing) {
            console.log('Stream connection closed');
            callbacks.onClose();
          }
        };
        
      } catch (error) {
        console.error('Error setting up stream:', error);
        if (!isClosing) {
          callbacks.onError(error);
          callbacks.onClose();
        }
      }
    };
    
    setupStream();
    
    return () => {
      isClosing = true;
      if (eventSourceInstance) {
        eventSourceInstance.close();
        eventSourceInstance = null;
      }
      callbacks.onClose();
    };
  }
}

export const agentService = AgentService.getInstance(); 