export interface ApiMessage {
  id?: string;
  role: string;
  content: string;
  type?: "content" | "tool_call" | string;
  name?: string;
  arguments?: string;
  tool_calls?: [
    {
      id: string;
      function: {
        name: string;
        arguments: string;
      };
      type: string;
      index: number;
    }
  ];
  tool_call_id?: string;
  created_at?: string;
}

export interface ToolCallData {
  id?: string;
  name?: string;
  arguments?: string;
  status?: string;
  fileName?: string;
  language?: string;
}

export interface ApiAgentRun {
  id: string;
  thread_id: string;
  status: "running" | "completed" | "stopped" | "error";
  started_at: string;
  completed_at: string | null;
  responses: ApiMessage[];
  error: string | null;
}
