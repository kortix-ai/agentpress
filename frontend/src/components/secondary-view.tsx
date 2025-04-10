import React from 'react';
import { Minimize2, Terminal, FileText, Search, MessageSquare, File, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { MarkdownView } from "@/components/views";

// Define view type
type ViewType = 'code' | 'terminal' | 'markdown' | 'text' | 'search' | 'browser' | 'issues';

// Define search result type to match the SearchResultsView component
interface SearchResult {
  fileName: string;
  line: number;
  content: string;
  matches?: { start: number; end: number }[];
  url?: string;
}

// Define types for tool executions (simplified)
export type ToolExecution = {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'error';
  icon?: ReactNode;
  startTime: Date;
  result?: string;
  streamingContent?: string;
  language?: string;
  viewType?: ViewType;
  searchResults?: SearchResult[];
};

// Helper function to get the appropriate icon for a tool
function getToolIcon(toolName: string) {
  const toolNameLower = toolName.toLowerCase();
  
  if (toolNameLower.includes('terminal') || toolNameLower.includes('command')) {
    return <Terminal className="h-5 w-5" />;
  } else if (toolNameLower.includes('file') || toolNameLower.includes('read') || toolNameLower.includes('write') || toolNameLower.includes('create') || toolNameLower.includes('edit')) {
    return <FileText className="h-5 w-5" />;
  } else if (toolNameLower.includes('search') || toolNameLower.includes('grep')) {
    return <Search className="h-5 w-5" />;
  } else if (toolNameLower.includes('message') || toolNameLower.includes('ask')) {
    return <MessageSquare className="h-5 w-5" />;
  } else {
    return <File className="h-5 w-5" />; // Default icon
  }
}

// Slider component
function SliderDemo({ className, ...props }: React.ComponentProps<typeof Slider>) {
  return (
    <Slider
      defaultValue={[50]}
      max={100}
      step={1}
      className={cn("w-full", className)}
      {...props}
    />
  )
}

// Simplified SecondaryView props
export type SecondaryViewProps = {
  onClose: () => void;
  toolExecutions: ToolExecution[];
  activeToolId?: string;
  onSelectTool: (id: string) => void;
  selectedTool?: ToolExecution;
  streamingToolCall?: {
    id: string;
    name: string;
    content: string;
    status?: 'started' | 'completed' | 'running';
    language?: string;
    fileName?: string;
    arguments?: string;
    searchResults?: SearchResult[];
  };
};

export default function SecondaryView({
  onClose,
  selectedTool,
  streamingToolCall,
}: SecondaryViewProps) {
  // Determine tool name to display
  const displayName = streamingToolCall?.name || selectedTool?.name || 'Tool Execution';
  
  // Determine if a tool is actively running
  const isToolActive = streamingToolCall?.status === 'started' || streamingToolCall?.status === 'running';
  
  return (
    <div className="w-full h-full flex flex-col bg-zinc-50 border border-zinc-200 rounded-md p-4">
      {/* Header section with title and close button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xs font-normal text-zinc-600 mb-3 uppercase">Suna&apos;s Computer</h1>
        </div>
        <button 
          className="text-zinc-500 hover:text-zinc-700 transition-colors"
          onClick={onClose}
        >
          <Minimize2 size={14} />
        </button>
      </div>
      
      <div className="flex items-center mb-4">
          <div className="bg-zinc-100 p-2 rounded-md mr-3">
            {getToolIcon(displayName)}
          </div>
          <div>
            <h2 className="text-md font-medium text-zinc-800">Documentation</h2>
            <p className="text-sm text-zinc-500">
              {isToolActive ? (
                <span className="flex items-center">
                  Running: {displayName}
                </span>
              ) : (
                displayName
              )}
            </p>
            {streamingToolCall?.fileName && (
              <p className="text-xs text-zinc-400 mt-1">{streamingToolCall.fileName}</p>
            )}
          </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Content section */}
        <div className="flex-1 bg-zinc-100 rounded-md mb-4 overflow-hidden">
          {/* Always show MarkdownView for testing */}
          <MarkdownView 
            title="Documentation" 
            showDiff={false}
            originalContent={`# Novel Markdown Viewer

## Introduction

This is a demonstration of the Novel markdown viewer using TipTap. It provides a clean, modern interface for viewing markdown content.

## Features

- **Rich Text Formatting**: Support for headings, lists, code blocks, and more
- **Syntax Highlighting**: Code blocks with proper syntax highlighting
- **Responsive Design**: Adapts to different screen sizes
- **Dark Mode Support**: Optimized for dark mode viewing

## Code Example

\`\`\`javascript
// Example JavaScript code
function helloWorld() {
  console.log("Hello from Novel markdown viewer!");
  return true;
}
\`\`\`

## Next Steps

1. Integrate with your application
2. Customize styles as needed
3. Add additional extensions if required

> This component uses TipTap and StarterKit for powerful markdown rendering capabilities.

`}
          />
        </div>
        
        {/* Footer with slider */}
        <div className="py-3 w-full flex items-center space-x-3">
          <div className="flex space-x-1">
            <button className="p-1 rounded-full hover:bg-zinc-200 text-zinc-600">
              <ChevronLeft size={16} />
            </button>
            <button className="p-1 rounded-full hover:bg-zinc-200 text-zinc-600">
              <ChevronRight size={16} />
            </button>
          </div>
          <SliderDemo />
        </div>
      </div>
    </div>
  );
}