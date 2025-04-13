// Define types for parsed XML tags to be used across the application
export interface ParsedTag {
  tagName: string;
  attributes: Record<string, string>;
  content: string;
  isClosing: boolean;
  id: string; // Unique ID for each tool call instance
  rawMatch?: string; // Raw XML match for deduplication
  timestamp?: number; // Timestamp when the tag was created
  
  // Pairing and completion status
  resultTag?: ParsedTag; // Reference to the result tag if this is a tool call
  isToolCall?: boolean; // Whether this is a tool call (vs a result)
  isPaired?: boolean; // Whether this tag has been paired with its call/result
  status?: 'running' | 'completed' | 'error'; // Status of the tool call
}

// Display mode for tool components
export type ToolDisplayMode = 'compact' | 'detailed';

// Props for tool components
export interface ToolComponentProps {
  tag: ParsedTag;
  mode: ToolDisplayMode;
  children?: React.ReactNode; // Added to fix TypeScript errors in tool components
}

// List of supported XML tags
export const SUPPORTED_XML_TAGS = [
  'ask',
  'str-replace',
  'notify',
  'create-file',
  'read-file',
  'execute-command',
  'create-directory',
  'list-directory',
  'search-code',
  'complete',
  'full-file-rewrite'
];

// Tool status labels
export const ToolStatusLabels = {
  running: 'Running',
  completed: 'Completed',
  error: 'Failed'
}; 