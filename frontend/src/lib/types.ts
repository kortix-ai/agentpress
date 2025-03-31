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
  thread_id: string;
  project_id: string | null;
  user_id: string | null;
  messages: Message[];
  created_at: string;
  updated_at?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  created_at?: string;
}

export interface AgentStatus {
  status: 'idle' | 'running' | 'paused';
  runId: string | null;
}

export interface ThreadPageProps {
  params: {
    id: string;
    threadId: string;
  };
} 