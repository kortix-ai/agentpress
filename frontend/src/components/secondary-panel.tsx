import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ParsedPart, ParsedToolCall } from '@/lib/parser';
import { ToolCall } from '@/components/tool-call';
import { ChevronLeft, ChevronRight, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface SecondaryPanelProps {
  parsedContent: ParsedPart[];
  isStreaming: boolean;
  selectedToolIndex?: number | null;
}

// Add debounce utility function for performance optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function SecondaryPanel({ parsedContent, selectedToolIndex }: Omit<SecondaryPanelProps, 'isStreaming'>) {
  const [toolCalls, setToolCalls] = useState<ParsedToolCall[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  
  // State to track both the raw slider value and the selected tool index
  const [sliderValue, setSliderValue] = useState<number>(0);
  
  // Use debounce to avoid excessive updates
  const debouncedSliderValue = useDebounce(sliderValue, 10);
  
  const [viewMode, setViewMode] = useState<'diff' | 'original' | 'modified'>('diff');
  
  // Extract tool calls from parsed content
  useEffect(() => {
    if (!parsedContent || !parsedContent.length) return;
    
    const extractedToolCalls = parsedContent.filter(part => 
      typeof part !== 'string'
    ) as ParsedToolCall[];
    
    setToolCalls(extractedToolCalls);
    
    // Auto-select the latest tool call if one exists and none is selected
    if (extractedToolCalls.length > 0 && selectedIndex === null) {
      setSelectedIndex(extractedToolCalls.length - 1);
    }
  }, [parsedContent, selectedIndex]);

  // Update slider value when selectedIndex changes
  useEffect(() => {
    if (selectedIndex !== null) {
      setSliderValue(selectedIndex);
    }
  }, [selectedIndex]);

  // Update selected index when selectedToolIndex prop changes
  useEffect(() => {
    if (selectedToolIndex !== undefined && selectedToolIndex !== null) {
      setSelectedIndex(selectedToolIndex);
      setSliderValue(selectedToolIndex);
    }
  }, [selectedToolIndex]);

  // Helper function to navigate through tool calls
  const navigateTool = (direction: 'next' | 'prev') => {
    if (!toolCalls.length) return;
    
    if (selectedIndex === null) {
      setSelectedIndex(0);
      return;
    }
    
    if (direction === 'next' && selectedIndex < toolCalls.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      // Scroll the timeline to keep selected tool in view
      if (timelineRef.current) {
        const selectedElement = timelineRef.current.children[selectedIndex + 1] as HTMLElement;
        if (selectedElement) {
          selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    } else if (direction === 'prev' && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      // Scroll the timeline to keep selected tool in view
      if (timelineRef.current) {
        const selectedElement = timelineRef.current.children[selectedIndex - 1] as HTMLElement;
        if (selectedElement) {
          selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  };

  // Get current action based on selected tool
  const getCurrentAction = (): { type: string; description: string } => {
    if (!selectedTool) {
      return { type: 'viewing', description: 'Timeline' };
    }

    const toolName = selectedTool.name.toLowerCase();
    
    if (toolName.includes('search') || toolName.includes('grep') || toolName.includes('find')) {
      return { type: 'Search', description: 'Searching code' };
    }
    
    if (toolName.includes('read-file') || toolName.includes('read_file')) {
      return { type: 'Editor', description: 'Reading file' };
    }
    
    if (toolName.includes('create') || toolName.includes('write') || toolName.includes('edit')) {
      return { type: 'Editor', description: 'Creating file' };
    }
    
    if (toolName.includes('terminal') || toolName.includes('command') || toolName.includes('execute')) {
      return { type: 'Terminal', description: 'Executing command' };
    }
    
    if (toolName.includes('delete')) {
      return { type: 'Editor', description: 'Deleting file' };
    }
    
    return { type: 'Tool', description: selectedTool.name };
  };

  // Optimized slider change handler using useCallback to reduce renders
  const handleSliderChange = useCallback((value: number[]) => {
    // Ensure value is within proper bounds
    const boundedValue = Math.min(Math.max(0, value[0]), toolCalls.length - 1 || 0);
    
    // Update the continuous slider value for visual smoothness
    setSliderValue(boundedValue);
    
    // Don't update selection while actively sliding to reduce lag
    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
    }
  }, [toolCalls.length]);

  // Update selection after debounced value changes
  useEffect(() => {
    if (isScrollingRef.current) {
      const newIndex = Math.round(debouncedSliderValue);
      if (newIndex >= 0 && newIndex < toolCalls.length && newIndex !== selectedIndex) {
        setSelectedIndex(newIndex);
        
        // Scroll into view with a small delay to avoid jank
        requestAnimationFrame(() => {
          if (timelineRef.current) {
            const selectedElement = timelineRef.current.children[newIndex] as HTMLElement;
            if (selectedElement) {
              selectedElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest', 
                inline: 'center' 
              });
            }
          }
        });
      }
    }
  }, [debouncedSliderValue, toolCalls.length, selectedIndex]);

  // Add slider commit handler
  const handleSliderCommit = useCallback((value: number[]) => {
    isScrollingRef.current = false;
    const newIndex = Math.round(value[0]);
    if (newIndex >= 0 && newIndex < toolCalls.length) {
      setSelectedIndex(newIndex);
      setSliderValue(newIndex);
    }
  }, [toolCalls.length]);

  // Update the index display logic to ensure it's properly bounded
  useEffect(() => {
    // Ensure slider value never exceeds the total number of tools
    if (toolCalls.length > 0 && sliderValue > toolCalls.length - 1) {
      setSliderValue(toolCalls.length - 1);
    }
  }, [toolCalls.length, sliderValue]);

  // Calculate what to show in the detail view
  const selectedTool = selectedIndex !== null ? toolCalls[selectedIndex] : null;
  const action = getCurrentAction();

  // Get file name for display (if applicable)
  const getDisplayFileName = () => {
    if (!selectedTool) return '';
    const args = selectedTool.arguments || {};
    
    if (args.target_file) return args.target_file.split('/').pop();
    if (args.file_path) return args.file_path.split('/').pop();
    if (args.path) return args.path.split('/').pop();
    
    return '';
  };

  const fileName = getDisplayFileName();

  // Check if the current tool is a file edit
  const isFileEdit = () => {
    if (!selectedTool) return false;
    const toolName = selectedTool.name.toLowerCase();
    return toolName.includes('edit') || toolName.includes('create') || toolName.includes('write');
  };

  return (
    <div className="h-full flex flex-col p-4 bg-background">
      <div className="h-full flex flex-col rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-sidebar">
        {/* Header with title and action status */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Kortix&apos;s Computer</h2>
            {isFileEdit() ? (
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'diff' | 'original' | 'modified')} className="h-7">
                <TabsList className="h-7 grid grid-cols-3 w-[180px]">
                  <TabsTrigger value="diff" className="text-xs h-6">Diff</TabsTrigger>
                  <TabsTrigger value="original" className="text-xs h-6">Original</TabsTrigger>
                  <TabsTrigger value="modified" className="text-xs h-6">Modified</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kortix is using {action.type}
          </p>
          {selectedTool && (
            <div className="flex items-center mt-2">
              <div className="h-5 w-5 flex items-center justify-center mr-2">
                <Monitor className="h-3 w-3" />
              </div>
              <span className="text-xs font-medium">
                {action.description}
              </span>
              {fileName && (
                <span className="text-xs font-mono ml-1 text-muted-foreground">
                  {fileName}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Main content area with tool detail and file view */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Remove the file header bar completely */}
          
          {/* Combined tool content and footer area */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Content container with proper light/dark styling */}
            <div className="flex-1 mx-4 mb-4 mt-4 border border-border rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-900 relative p-0">
              {/* Tool content area with proper light/dark styling and custom scrollbar */}
              {selectedTool ? (
                <div className="flex-1 overflow-auto custom-scrollbar p-0 m-0 -mt-3 min-h-[700px]">
                  <ToolCall 
                    name={selectedTool.name}
                    arguments={selectedTool.arguments}
                    content={selectedTool.content}
                    status={selectedTool.state}
                    viewMode={isFileEdit() ? viewMode : undefined}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center min-h-[700px]">
                  <p className="text-sm text-muted-foreground">
                    No tool selected
                  </p>
                </div>
              )}
              
              {/* Slider footer with proper light/dark styling */}
              <div className="absolute bottom-0 left-0 right-0 py-2 px-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 z-10">
                {toolCalls.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 transition-all duration-200 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                        onClick={() => navigateTool('prev')}
                        disabled={selectedIndex === 0 || selectedIndex === null}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 transition-all duration-200 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                        onClick={() => navigateTool('next')}
                        disabled={selectedIndex === toolCalls.length - 1 || selectedIndex === null}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 px-1">
                      <Slider 
                        value={[sliderValue]}
                        min={0}
                        max={Math.max(0, toolCalls.length - 1)}
                        step={0.001} // Very small step for fluid movement
                        onValueChange={handleSliderChange}
                        onValueCommit={handleSliderCommit}
                        className="py-2"
                      />
                    </div>
                    
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 min-w-[3rem] text-center">
                      {toolCalls.length === 0 ? '0/0' : 
                       `${selectedIndex !== null ? selectedIndex + 1 : 0}/${toolCalls.length}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 