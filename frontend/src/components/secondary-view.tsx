import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minimize2, Terminal, FileText, Search, MessageSquare, File, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

// Import our new view components
import { CodeView, TerminalView, MarkdownView, TextView } from './views';

// Define types for tool executions
export type ToolExecution = {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'error';
  icon?: ReactNode;
  startTime: Date;
  endTime?: Date;
  arguments?: Record<string, unknown>;
  result?: string;
  error?: string;
  streamingContent?: string;
  language?: string;
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
};

// Extract tool call content from a message
export function extractToolCallContent(toolCall: { 
  function?: { 
    name: string;
    arguments: string; 
  }
}): {content: string, arguments?: Record<string, string | number | boolean>, fileName?: string, language?: string} {
  try {
    let content = '';
    let args: Record<string, string | number | boolean> = {};
    let fileName = '';
    let language = '';
    
    // Parse tool call arguments
    if (toolCall.function?.arguments) {
      args = JSON.parse(toolCall.function.arguments);
      
      // Extract file content from create_file or full_file_rewrite
      if (args.file_contents && (toolCall.function.name === 'create_file' || toolCall.function.name === 'full_file_rewrite')) {
        content = args.file_contents as string;
        fileName = args.file_path as string;
        
        // Determine language based on file extension
        const ext = fileName?.split('.').pop()?.toLowerCase();
        if (ext === 'js' || ext === 'jsx') language = 'javascript';
        else if (ext === 'ts' || ext === 'tsx') language = 'typescript';
        else if (ext === 'html') language = 'html';
        else if (ext === 'css') language = 'css';
        else if (ext === 'md') language = 'markdown';
        else if (ext === 'json') language = 'json';
        else if (ext === 'py') language = 'python';
        else language = 'plaintext';
      }
      
      // Extract content from string replacement
      if (args.new_str && toolCall.function.name === 'str_replace') {
        content = args.new_str as string;
        fileName = args.file_path as string;
        
        // Determine language based on file extension
        const ext = fileName?.split('.').pop()?.toLowerCase();
        if (ext === 'js' || ext === 'jsx') language = 'javascript';
        else if (ext === 'ts' || ext === 'tsx') language = 'typescript';
        else if (ext === 'html') language = 'html';
        else if (ext === 'css') language = 'css';
        else if (ext === 'md') language = 'markdown';
        else if (ext === 'json') language = 'json';
        else if (ext === 'py') language = 'python';
        else language = 'plaintext';
      }
    }
    
    return { content, arguments: args, fileName, language };
  } catch (error) {
    console.error('Failed to extract tool call content:', error);
    return { content: '' };
  }
}

// Enhanced content view that handles streaming data
const ContentView = ({ tool, streamingData }: { 
  tool: ToolExecution,
  streamingData?: {
    toolName?: string;
    content?: string;
    args?: string;
    status?: 'started' | 'completed' | 'running';
    language?: string;
    fileName?: string;
  }
}) => {
  // Use streaming data if available, otherwise use the tool data
  const isStreaming = !!streamingData && streamingData.status !== 'completed';
  
  // Get the tool content - ONLY extract the relevant tool output, not regular text
  const content = streamingData?.content || tool.streamingContent || tool.result || '';
  const toolName = streamingData?.toolName || tool.name;
  const toolNameLower = toolName.toLowerCase();
  const language = streamingData?.language || tool.language || 'plaintext';
  
  // Try to extract filename from arguments if available
  let fileName = streamingData?.fileName || '';
  if (!fileName && tool.arguments) {
    fileName = 
      (tool.arguments.file_path as string) || 
      (tool.arguments.target_file as string) || 
      (tool.arguments.path as string) || '';
    
    // Get just the file name, not the full path
    if (fileName) {
      fileName = fileName.split('/').pop() || fileName;
    }
  }
  
  // Add loading indicator for streaming content
  const renderStreamingIndicator = () => {
    if (!isStreaming) return null;
    
    return (
      <div className="absolute top-1 right-1 flex items-center bg-black/70 rounded-full px-2 py-1 text-xs text-white">
        <Loader2 className="h-3 w-3 text-white animate-spin mr-1" />
        <span>Streaming</span>
      </div>
    );
  };
  
  // Determine which view component to use based on the tool type
  if (toolNameLower.includes('terminal') || toolNameLower.includes('command')) {
    return (
      <div className="relative h-full">
        {renderStreamingIndicator()}
        <TerminalView content={content} title={`Terminal: ${toolName}`} />
      </div>
    );
  } else if (toolNameLower.includes('read') || toolNameLower.includes('write') || 
            toolNameLower.includes('edit') || toolNameLower.includes('file')) {
    return (
      <div className="relative h-full">
        {renderStreamingIndicator()}
        <CodeView 
          content={content} 
          language={language} 
          fileName={fileName} 
        />
      </div>
    );
  } else if (toolNameLower.includes('markdown')) {
    return (
      <div className="relative h-full">
        {renderStreamingIndicator()}
        <MarkdownView content={content} title="Markdown" />
      </div>
    );
  } else {
    return (
      <div className="relative h-full">
        {renderStreamingIndicator()}
        <TextView content={content} title={toolName} />
      </div>
    );
  }
};

// Timeline component
const Timeline = ({ 
  tools, 
  activeToolId, 
  onSelectTool 
}: { 
  tools: ToolExecution[], 
  activeToolId: string, 
  onSelectTool: (id: string) => void 
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Find current index from activeToolId
  const currentIndex = tools.findIndex(t => t.id === activeToolId);
  
  // Calculate position for the current tool marker
  const markerPosition = tools.length <= 1 ? 0 : (currentIndex / (tools.length - 1)) * 100;
  
  // Format date for display
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="mt-4 pt-2 border-t border-zinc-200">
      <div className="flex justify-between items-center mb-2">
        <button 
          onClick={() => {
            const prevIndex = Math.max(0, currentIndex - 1);
            onSelectTool(tools[prevIndex].id);
          }}
          disabled={currentIndex === 0}
          className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4 text-zinc-600" />
        </button>
        
        <div className="flex items-center text-xs text-zinc-500">
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span>{currentIndex >= 0 && currentIndex < tools.length ? 
            formatTime(tools[currentIndex].startTime.toISOString()) : 
            "No tool selected"}</span>
        </div>
        
        <button 
          onClick={() => {
            const nextIndex = Math.min(tools.length - 1, currentIndex + 1);
            onSelectTool(tools[nextIndex].id);
          }}
          disabled={currentIndex === tools.length - 1}
          className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </button>
      </div>
      
      {/* Replace empty Slider with functional slider */}
      <div className="relative pt-4 pb-1">
        <div className="h-1 bg-zinc-200 rounded-full relative">
          {tools.map((tool, index) => (
            <button
              key={tool.id}
              className={`absolute w-3 h-3 rounded-full transform -translate-y-1/2 -translate-x-1/2 transition-all ${
                tool.id === activeToolId 
                  ? 'bg-blue-500 scale-125 border-2 border-white' 
                  : 'bg-zinc-400 hover:bg-zinc-500'
              }`}
              style={{ left: `${(index / (tools.length - 1)) * 100}%`, top: '50%' }}
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.name} (${formatTime(tool.startTime.toISOString())})`}
            />
          ))}
          <div 
            className="absolute h-1 bg-blue-500 rounded-full"
            style={{ 
              width: `${markerPosition}%`, 
              left: 0, 
              top: 0 
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Updated SecondaryView props
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
  };
};

export default function SecondaryView({
  onClose,
  selectedTool,
  toolExecutions,
  activeToolId = '',
  onSelectTool,
  streamingToolCall,
}: SecondaryViewProps) {
  // Use memo to find the active tool
  const activeTool = useMemo(() => {
    return toolExecutions.find((tool) => tool.id === activeToolId);
  }, [toolExecutions, activeToolId]);

  // Track streaming tool data
  const [streamingData, setStreamingData] = useState<{
    toolName?: string;
    content?: string;
    args?: string;
    status?: 'started' | 'completed' | 'running';
    language?: string;
    fileName?: string;
  } | null>(null);
  
  // Store historical tools with their content
  const [historicalTools, setHistoricalTools] = useState<ToolExecution[]>([]);
  const [currentToolId, setCurrentToolId] = useState<string>('');

  // Handle streaming tool call updates - only extract tool-specific content
  useEffect(() => {
    if (streamingToolCall) {
      // Extract tool information
      let fileName = '';
      let language = '';
      let contentToShow = '';
      
      // For stream data, we only want to extract the actual tool output, not explanatory text
      if (streamingToolCall.content) {
        // Check for specific tool patterns to extract just the tool content
        if (streamingToolCall.name?.toLowerCase().includes('terminal') || 
            streamingToolCall.name?.toLowerCase().includes('command')) {
          // Extract terminal output - commands usually have specific format
          const terminalOutput = streamingToolCall.content.match(/```(?:bash|sh|shell)?\s*([\s\S]*?)```/);
          if (terminalOutput && terminalOutput[1]) {
            contentToShow = terminalOutput[1].trim();
          } else {
            // If no bash block found, look for command output patterns
            const outputStart = streamingToolCall.content.indexOf('Command output:');
            if (outputStart > -1) {
              contentToShow = streamingToolCall.content.substring(outputStart + 15).trim();
            } else {
              // Last resort, just use the content, but exclude descriptive text
              contentToShow = streamingToolCall.content;
            }
          }
        } else if (streamingToolCall.name?.toLowerCase().includes('file') || 
                 streamingToolCall.name?.toLowerCase().includes('read') || 
                 streamingToolCall.name?.toLowerCase().includes('write') || 
                 streamingToolCall.name?.toLowerCase().includes('edit')) {
          // Extract file content - typically in code blocks
          const codeMatch = streamingToolCall.content.match(/```(?:\w+)?\s*([\s\S]*?)```/);
          if (codeMatch && codeMatch[1]) {
            contentToShow = codeMatch[1].trim();
          } else {
            // Last resort, use the content as is
            contentToShow = streamingToolCall.content;
          }
        } else {
          // For other tools, try to extract the actual tool output
          contentToShow = streamingToolCall.content;
        }
      }
      
      // Try to parse arguments as JSON
      if (streamingToolCall.arguments) {
        try {
          const args = JSON.parse(streamingToolCall.arguments);
          
          // Extract file path and language for file operations
          if (args.file_path || args.target_file || args.path) {
            const path = args.file_path || args.target_file || args.path;
            fileName = path.split('/').pop() || path;
            
            // Determine language based on extension
            const ext = fileName?.split('.').pop()?.toLowerCase();
            if (ext === 'js' || ext === 'jsx') language = 'javascript';
            else if (ext === 'ts' || ext === 'tsx') language = 'typescript';
            else if (ext === 'html') language = 'html';
            else if (ext === 'css') language = 'css';
            else if (ext === 'md') language = 'markdown';
            else if (ext === 'json') language = 'json';
            else if (ext === 'py') language = 'python';
            else language = 'plaintext';
          }
          
          // Extract file contents
          if (args.file_contents) {
            contentToShow = args.file_contents;
            
            setStreamingData(prev => ({
              ...prev,
              content: contentToShow,
              fileName,
              language,
              toolName: streamingToolCall.name,
              status: streamingToolCall.status || 'running'
            }));
          }
        } catch (error) {
          console.error('Error parsing streaming tool call arguments:', error);
        }
      }
      
      // Update streaming data
      setStreamingData(prev => ({
        ...prev,
        toolName: streamingToolCall.name,
        fileName: fileName || prev?.fileName,
        language: language || streamingToolCall.language || prev?.language,
        content: contentToShow || prev?.content,
        status: streamingToolCall.status || 'running',
        args: streamingToolCall.arguments
      }));
      
      // Set current tool ID for tracking
      if (streamingToolCall.id && streamingToolCall.id !== currentToolId) {
        setCurrentToolId(streamingToolCall.id);
        
        // Add this as a new historical tool
        const newTool: ToolExecution = {
          id: streamingToolCall.id,
          name: streamingToolCall.name,
          status: (streamingToolCall.status as 'running' | 'completed' | 'error') || 'running',
          startTime: new Date(),
          streamingContent: contentToShow,
          language: language || streamingToolCall.language
        };
        
        setHistoricalTools(prev => {
          // Only add if not already in the list
          if (!prev.some(tool => tool.id === streamingToolCall.id)) {
            return [...prev, newTool];
          }
          return prev;
        });
      } else if (streamingToolCall.id === currentToolId) {
        // Update existing tool content
        setHistoricalTools(prev => 
          prev.map(tool => 
            tool.id === streamingToolCall.id 
              ? {...tool, 
                 streamingContent: contentToShow, 
                 status: (streamingToolCall.status as 'running' | 'completed' | 'error') || tool.status}
              : tool
          )
        );
      }
    } else {
      // Clear streaming data when streaming stops
      setStreamingData(null);
      
      // Mark current tool as completed
      if (currentToolId) {
        setHistoricalTools(prev => 
          prev.map(tool => 
            tool.id === currentToolId 
              ? {...tool, status: 'completed', endTime: new Date()}
              : tool
          )
        );
        setCurrentToolId('');
      }
    }
  }, [streamingToolCall, currentToolId]);

  // Check for any active tools
  const isToolActive = streamingToolCall?.status === 'started' || streamingToolCall?.status === 'running';
  
  // Determine which tools to display in the timeline
  const displayTools = useMemo(() => {
    return [...toolExecutions, ...historicalTools].filter((tool, index, self) => 
      index === self.findIndex(t => t.id === tool.id)
    );
  }, [toolExecutions, historicalTools]);

  // Always select the last tool by default if none is selected
  const effectiveActiveToolId = useMemo(() => {
    // If there's an activeToolId provided, use it
    if (activeToolId) return activeToolId;
    
    // If there's a selectedTool, use its id
    if (selectedTool) return selectedTool.id;
    
    // If there's a currently streaming tool, use its id
    if (currentToolId) return currentToolId;
    
    // Default to the most recent tool if available
    return displayTools.length > 0 ? displayTools[displayTools.length - 1].id : '';
  }, [activeToolId, selectedTool, currentToolId, displayTools]);
  
  // Auto-select the first tool when component mounts if none is selected
  useEffect(() => {
    if (displayTools.length > 0 && !activeToolId && !selectedTool && onSelectTool) {
      onSelectTool(displayTools[displayTools.length - 1].id);
    }
  }, [displayTools, activeToolId, selectedTool, onSelectTool]);
  
  // If a tool is streaming, ensure it's the selected one
  useEffect(() => {
    if (isToolActive && currentToolId && onSelectTool && !selectedTool) {
      onSelectTool(currentToolId);
    }
  }, [isToolActive, currentToolId, onSelectTool, selectedTool]);
  
  // Always show timeline when there are tools available
  const showTimeline = displayTools.length > 1;
  
  // Get the tool to display - never be undefined
  const displayTool = useMemo(() => {
    const tool = selectedTool || 
                activeTool || 
                displayTools.find(t => t.id === effectiveActiveToolId) || 
                (displayTools.length > 0 ? displayTools[displayTools.length - 1] : null);
    
    return tool || {
      id: '',
      name: '',
      status: 'completed' as const,
      startTime: new Date(),
    };
  }, [selectedTool, activeTool, displayTools, effectiveActiveToolId]);
  
  return (
    <div className="w-full h-full flex flex-col bg-zinc-50 border border-zinc-200 rounded-md p-4">
      {/* Section 1: Header */}
      <div className="border-b border-zinc-200 pb-3 mb-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-zinc-100 p-2 rounded-md mr-3">
            {getToolIcon(streamingData?.toolName || displayTool?.name || '')}
          </div>
          <div>
            <h2 className="text-md font-medium text-zinc-800">Tool Execution</h2>
            <p className="text-sm text-zinc-500">
              {isToolActive ? (
                <span className="flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" /> 
                  Running: {streamingData?.toolName || streamingToolCall?.name}
                </span>
              ) : (
                streamingData?.toolName || displayTool?.name || 'No tool selected'
              )}
            </p>
            {streamingData?.fileName && (
              <p className="text-xs text-zinc-400 mt-1">{streamingData.fileName}</p>
            )}
          </div>
        </div>
        <button 
          className="text-zinc-500 hover:text-zinc-700 transition-colors"
          onClick={onClose}
        >
          <Minimize2 size={18} />
        </button>
      </div>
      
      {/* Section 2: Content View - Always show a tool */}
      <div className="flex-1 min-h-0">
        <ContentView 
          tool={displayTool}
          streamingData={streamingData || undefined}
        />
      </div>
      
      {/* Section 3: Timeline - show when multiple tools are available */}
      {showTimeline && (
        <Timeline 
          tools={displayTools} 
          activeToolId={effectiveActiveToolId} 
          onSelectTool={onSelectTool} 
        />
      )}
    </div>
  );
} 