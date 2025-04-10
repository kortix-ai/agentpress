import React, { useState, useEffect, useCallback } from 'react';
import { Minimize2, Terminal, FileText, Search, MessageSquare, File, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';
import { Slider } from "@/components/ui/slider";
import { 
  CodeView, 
  TerminalView, 
  MarkdownView, 
  TextView 
} from "@/components/views";

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
  endTime?: Date;
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

// Format time function
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Calculate time difference in seconds
function getTimeDifference(startDate: Date, endDate: Date): string {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return `${diffSec}s`;
  } else {
    const minutes = Math.floor(diffSec / 60);
    const seconds = diffSec % 60;
    return `${minutes}m ${seconds}s`;
  }
}

// Simplified SecondaryView props
export type SecondaryViewProps = {
  onClose: () => void;
  toolExecutions: ToolExecution[];
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
  toolExecutions,
  onSelectTool,
  selectedTool,
  streamingToolCall,
}: SecondaryViewProps) {
  const [currentToolIndex, setCurrentToolIndex] = useState<number | null>(null);
  const [sliderValue, setSliderValue] = useState<number[]>([0]);
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  
  // Filtering out any tools with duplicate IDs, keeping only the most recent
  const uniqueTools = toolExecutions.reduce((acc, current) => {
    const existing = acc.find(item => item.id === current.id);
    if (!existing) {
      return [...acc, current];
    } else if (current.startTime > existing.startTime) {
      return [...acc.filter(item => item.id !== current.id), current];
    }
    return acc;
  }, [] as ToolExecution[]);
  
  // Sort tools by timestamp
  const sortedTools = [...uniqueTools].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  // Find the index of the selected tool or active tool
  useEffect(() => {
    const syncState = () => {
      // Only update if dependencies actually changed to prevent infinite loops
      if (streamingToolCall) {
        if (currentToolIndex !== sortedTools.length) {
          setCurrentToolIndex(sortedTools.length);
          // Don't update slider for streaming
        }
      } else if (selectedTool) {
        const index = sortedTools.findIndex(tool => tool.id === selectedTool.id);
        if (index !== -1 && currentToolIndex !== index) {
          setCurrentToolIndex(index);
          // Only update slider if index actually changed significantly
          const newSliderValue = index * (100 / Math.max(1, sortedTools.length - 1));
          if (Math.abs((sliderValue[0] || 0) - newSliderValue) > 1) {
            setSliderValue([newSliderValue]);
          }
        }
      } else if (sortedTools.length > 0 && currentToolIndex === null) {
        // Only set to last tool if not already set
        setCurrentToolIndex(sortedTools.length - 1);
        if (sliderValue[0] !== 100) {
          setSliderValue([100]);
        }
      }
    };
    
    // Use a timeout to break the render cycle
    const timeoutId = setTimeout(syncState, 0);
    return () => clearTimeout(timeoutId);
    
    // Focus on the key dependencies that should trigger this effect
    // Deliberately exclude sliderValue to prevent infinite loops
  }, [selectedTool, streamingToolCall, sortedTools.length, currentToolIndex]);
  
  // Calculate tooltip timestamps for the slider
  const getToolAtPosition = (position: number) => {
    if (sortedTools.length === 0) return null;
    if (sortedTools.length === 1) return sortedTools[0];
    
    const index = Math.min(
      Math.floor((position / 100) * sortedTools.length),
      sortedTools.length - 1
    );
    return sortedTools[index];
  };
  
  // Handle slider value change - prevent continuous updates
  const handleSliderChange = useCallback((value: number[]) => {
    // Only update if the value has actually changed by a significant amount
    if (Math.abs(sliderValue[0] - value[0]) > 1) {
      setSliderValue(value);
      
      if (sortedTools.length === 0) return;
      
      const position = value[0];
      const toolIndex = Math.round((position / 100) * (sortedTools.length - 1));
      
      // Only update if the toolIndex actually changed
      if (toolIndex !== currentToolIndex && toolIndex >= 0 && toolIndex < sortedTools.length) {
        setCurrentToolIndex(toolIndex);
        onSelectTool(sortedTools[toolIndex].id);
      }
    }
  }, [sliderValue, sortedTools, currentToolIndex, onSelectTool]);
  
  // Handle slider hover
  const handleSliderMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const sliderRect = e.currentTarget.getBoundingClientRect();
    const position = Math.max(0, Math.min(100, ((e.clientX - sliderRect.left) / sliderRect.width) * 100));
    setHoveredPosition(position);
  }, []);
  
  const handleSliderMouseLeave = useCallback(() => {
    setHoveredPosition(null);
  }, []);
  
  // Determine tool name to display
  const displayTool = currentToolIndex !== null && currentToolIndex < sortedTools.length
    ? sortedTools[currentToolIndex]
    : (streamingToolCall ? { name: streamingToolCall.name } : { name: 'Tool Execution' });
  
  const displayName = displayTool.name || 'Tool Execution';
  
  // Determine if a tool is actively running
  const isToolActive = streamingToolCall?.status === 'started' || streamingToolCall?.status === 'running';
  
  // Navigate to previous/next tool
  const goToPrevTool = useCallback(() => {
    if (currentToolIndex !== null && currentToolIndex > 0) {
      const newIndex = currentToolIndex - 1;
      // First update the index, then the slider value
      setCurrentToolIndex(newIndex);
      // Calculate new slider position
      const newPosition = newIndex * (100 / Math.max(1, sortedTools.length - 1));
      // Only update slider value if it changed significantly
      if (Math.abs(sliderValue[0] - newPosition) > 1) {
        setSliderValue([newPosition]);
      }
      // Prevent double updates by checking if the ID is already selected
      const nextToolId = sortedTools[newIndex].id;
      if (selectedTool?.id !== nextToolId) {
        onSelectTool(nextToolId);
      }
    }
  }, [currentToolIndex, sortedTools, sliderValue, selectedTool, onSelectTool]);
  
  const goToNextTool = useCallback(() => {
    if (currentToolIndex !== null && currentToolIndex < sortedTools.length - 1) {
      const newIndex = currentToolIndex + 1;
      // First update the index, then the slider value
      setCurrentToolIndex(newIndex);
      // Calculate new slider position
      const newPosition = newIndex * (100 / Math.max(1, sortedTools.length - 1));
      // Only update slider value if it changed significantly
      if (Math.abs(sliderValue[0] - newPosition) > 1) {
        setSliderValue([newPosition]);
      }
      // Prevent double updates by checking if the ID is already selected
      const nextToolId = sortedTools[newIndex].id;
      if (selectedTool?.id !== nextToolId) {
        onSelectTool(nextToolId);
      }
    }
  }, [currentToolIndex, sortedTools, sliderValue, selectedTool, onSelectTool]);
  
  // Get content to display in the main view
  const getContent = () => {
    // Show streaming content if we have an active tool call
    if (streamingToolCall?.content) {
      const isCommandOrTerminal = streamingToolCall.name?.toLowerCase().includes('command') || 
                                streamingToolCall.name?.toLowerCase().includes('terminal');
      
      if (isCommandOrTerminal) {
        return (
          <TerminalView 
            content={streamingToolCall.content}
            title={streamingToolCall.status === 'running' ? `Running ${streamingToolCall.name}...` : streamingToolCall.name}
          />
        );
      }
      
      // Check if we're dealing with a file
      if (streamingToolCall.fileName) {
        const fileExtension = streamingToolCall.fileName.split('.').pop()?.toLowerCase() || '';
        
        // For markdown files
        if (fileExtension === 'md' || fileExtension === 'markdown') {
          return (
            <MarkdownView 
              title={streamingToolCall.fileName}
              originalContent={streamingToolCall.content}
              showDiff={false}
            />
          );
        }
        
        // For code files (use CodeView)
        return (
          <CodeView 
            fileName={streamingToolCall.fileName}
            language={streamingToolCall.language || getLanguageFromExtension(fileExtension)}
            originalContent={streamingToolCall.content}
            showDiff={false}
          />
        );
      }
      
      // Default text view for other content
      return (
        <TextView
          content={streamingToolCall.content}
          title={streamingToolCall.name}
        />
      );
    }
    
    // Show selected tool content
    if (selectedTool?.result) {
      const language = selectedTool.language || 'plaintext';
      const toolNameLower = selectedTool.name.toLowerCase();
      
      // Extract file name if it's a file operation
      const fileName = toolNameLower.includes('file') ? 
        (selectedTool.result.match(/(?:Contents of file|Created file|Updated file|Edited file): (.*?)(?:$|\n)/))?.[1]?.split('/').pop() || 'file' : 
        undefined;
      
      // Determine file extension if available
      const fileExtension = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
      
      // Special case for terminal commands - use TerminalView
      if (toolNameLower.includes('command') || toolNameLower.includes('terminal')) {
        return (
          <TerminalView 
            content={selectedTool.result}
            title="Terminal Output"
          />
        );
      }
      
      // Special case for search operations - use TextView for now
      if (toolNameLower.includes('search') || toolNameLower.includes('grep')) {
        return (
          <TextView
            content={selectedTool.result}
            title="Search Results"
          />
        );
      }
      
      // Special case for list directory - use TextView
      if (toolNameLower.includes('list_dir')) {
        return (
          <TextView
            content={selectedTool.result}
            title="Directory Contents"
          />
        );
      }
        
      // For file operations, attempt to create a diff view
      if (fileName && toolNameLower.includes('edit') && selectedTool.result) {
        // Try to extract before/after content for edit operations
        const beforeAfterMatch = selectedTool.result.match(/Before:([\s\S]*?)After:([\s\S]*)/i);
        if (beforeAfterMatch) {
          // If it's a markdown file, use MarkdownView
          if (fileExtension === 'md' || fileExtension === 'markdown') {
            return (
              <MarkdownView 
                title={fileName}
                originalContent={beforeAfterMatch[1].trim()}
                modifiedContent={beforeAfterMatch[2].trim()}
                showDiff={true}
              />
            );
          }
          
          // Otherwise use CodeView for diff
          return (
            <CodeView 
              fileName={fileName}
              language={language || getLanguageFromExtension(fileExtension || '')}
              originalContent={beforeAfterMatch[1].trim()}
              modifiedContent={beforeAfterMatch[2].trim()}
              showDiff={true}
            />
          );
        }
      }
      
      // For file operations, extract file content after the first line
      if (fileName && (toolNameLower.includes('read') || toolNameLower.includes('create') || toolNameLower.includes('write'))) {
        let fileContent = selectedTool.result;
        
        // More robust content extraction - look for file content after the header line
        if (fileContent.includes('Contents of file:') || fileContent.includes('Created file:') || fileContent.includes('Updated file:')) {
          // Split by the first newline after the header
          const firstLineBreakIndex = fileContent.indexOf('\n');
          if (firstLineBreakIndex !== -1) {
            fileContent = fileContent.substring(firstLineBreakIndex + 1);
          }
        }
        
        // For markdown files, use MarkdownView
        if (fileExtension === 'md' || fileExtension === 'markdown') {
          return (
            <MarkdownView 
              title={fileName}
              originalContent={fileContent}
              showDiff={false}
            />
          );
        }
        
        // For code files, use CodeView
        return (
          <div className="h-full overflow-auto">
            <CodeView 
              fileName={fileName}
              language={language || getLanguageFromExtension(fileExtension || '')}
              originalContent={fileContent}
              showDiff={false}
            />
          </div>
        );
      }
      
      // For any other tool output, use TextView
      return (
        <TextView
          content={selectedTool.result}
          title={selectedTool.name}
        />
      );
    }
    
    // Default empty state
    return (
      <div className="h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
        <span className="text-sm">No content to display</span>
      </div>
    );
  };
  
  // Helper function to determine language from file extension
  const getLanguageFromExtension = (extension: string): string => {
    switch (extension) {
      case 'js': 
      case 'jsx': 
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py': 
        return 'python';
      case 'html': 
      case 'htm': 
        return 'html';
      case 'css': 
        return 'css';
      case 'json': 
        return 'json';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'sh':
      case 'bash':
        return 'bash';
      case 'sql':
        return 'sql';
      case 'rb':
        return 'ruby';
      case 'php':
        return 'php';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'java':
        return 'java';
      case 'c':
        return 'c';
      case 'cpp':
      case 'cc':
      case 'h':
      case 'hpp':
        return 'cpp';
      case 'cs':
        return 'csharp';
      default:
        return 'plaintext';
    }
  };
  
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
          {isToolActive ? (
            <div className="relative">
            {getToolIcon(displayName)}
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          ) : (
            getToolIcon(displayName)
          )}
          </div>
          <div>
          <h2 className="text-md font-medium text-zinc-800">
            {currentToolIndex !== null && sortedTools[currentToolIndex]?.status === 'error' 
              ? 'Error' 
              : displayName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </h2>
          <p className="text-sm text-zinc-500 flex items-center">
              {isToolActive ? (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Running: {displayName}
                </span>
            ) : currentToolIndex !== null && sortedTools[currentToolIndex] ? (
              <span className="flex items-center gap-1">
                {formatTime(sortedTools[currentToolIndex].startTime)}
                {sortedTools[currentToolIndex].endTime && (
                  <span className="text-zinc-400 text-xs ml-1">
                    ({getTimeDifference(sortedTools[currentToolIndex].startTime, sortedTools[currentToolIndex].endTime)})
                  </span>
                )}
              </span>
              ) : (
                displayName
              )}
            </p>
            {streamingToolCall?.fileName && (
              <p className="text-xs text-zinc-400 mt-1">{streamingToolCall.fileName}</p>
            )}
          {currentToolIndex !== null && sortedTools[currentToolIndex]?.status === 'error' && (
            <p className="text-xs text-red-500 mt-1">Execution failed</p>
          )}
          </div>
      </div>
      
      {/* Tool execution count */}
      {sortedTools.length > 0 && (
        <div className="mb-2 text-xs text-zinc-500">
          {currentToolIndex !== null ? (
            <span>Tool {currentToolIndex + 1} of {sortedTools.length}</span>
          ) : (
            <span>{sortedTools.length} tools executed</span>
          )}
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Content section */}
        <div className="flex-1 rounded-md mb-4 overflow-hidden">
          {getContent()}
        </div>
        
        {/* Footer with slider */}
        <div className="py-3 w-full flex items-center space-x-3">
          <div className="flex space-x-1">
            <button 
              className={`p-1 rounded-full ${currentToolIndex !== null && currentToolIndex > 0 ? 'hover:bg-zinc-200 text-zinc-600' : 'text-zinc-300 cursor-not-allowed'}`}
              onClick={goToPrevTool}
              disabled={currentToolIndex === null || currentToolIndex <= 0}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className={`p-1 rounded-full ${currentToolIndex !== null && currentToolIndex < sortedTools.length - 1 ? 'hover:bg-zinc-200 text-zinc-600' : 'text-zinc-300 cursor-not-allowed'}`}
              onClick={goToNextTool}
              disabled={currentToolIndex === null || currentToolIndex >= sortedTools.length - 1}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div 
            className="relative flex-1"
            onMouseMove={handleSliderMouseMove}
            onMouseLeave={handleSliderMouseLeave}
          >
            <Slider
              value={sliderValue}
              max={100}
              step={1}
              className="w-full"
              onValueChange={handleSliderChange}
              disabled={sortedTools.length <= 1}
            />
            
            {/* Tooltip for the current hover position */}
            {hoveredPosition !== null && (
              <div 
                className="absolute px-2 py-1 bg-zinc-800 text-white text-xs rounded pointer-events-none transform -translate-x-1/2"
                style={{ 
                  left: `${hoveredPosition}%`, 
                  bottom: '100%',
                  marginBottom: '8px'
                }}
              >
                {(() => {
                  const tool = getToolAtPosition(hoveredPosition);
                  if (tool) {
                    return (
                      <>
                        <div>{tool.name}</div>
                        <div className="text-zinc-400">{formatTime(tool.startTime)}</div>
                      </>
                    );
                  }
                  return "No tool";
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}