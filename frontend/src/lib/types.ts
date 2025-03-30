export interface User {
  id: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  user_id: string;
}

export interface Thread {
  id: string;
  name: string;
  project_id: string;
  description: string;
  created_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AgentStatus {
  status: 'idle' | 'running' | 'paused';
} 