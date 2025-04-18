import type { Project } from '@/lib/api';

// Define a type for the params to make React.use() work properly
export type ThreadParams = { 
  threadId: string;
};

// Unified Message Interface matching the backend/database schema
export interface UnifiedMessage {
  message_id: string | null; // Can be null for transient stream events (chunks, unsaved statuses)
  thread_id: string;
  type: 'user' | 'assistant' | 'tool' | 'status' | 'system'; // Add 'system' if used
  is_llm_message: boolean;
  content: string; // ALWAYS a JSON string from the backend
  metadata: string; // ALWAYS a JSON string from the backend
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}

// Helper type for parsed content - structure depends on message.type
export interface ParsedContent {
  role?: 'user' | 'assistant' | 'tool' | 'system'; // From the JSON string in content
  content?: any; // Can be string, object, etc. after parsing
  tool_calls?: any[]; // For native tool calls
  tool_call_id?: string; // For tool results
  name?: string; // For tool results
  status_type?: string; // For status messages
  [key: string]: any; // Allow other properties
}

// Helper type for parsed metadata
export interface ParsedMetadata {
  stream_status?: 'chunk' | 'complete';
  thread_run_id?: string;
  tool_index?: number;
  assistant_message_id?: string; // Link tool results/statuses back
  linked_tool_result_message_id?: string; // Link status to tool result
  parsing_details?: any;
  [key: string]: any; // Allow other properties
}

// Re-export existing types
export type { Project }; 