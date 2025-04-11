import React, { useState } from 'react';
import { FileText, Terminal, Edit, ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Monitor } from 'lucide-react';
import { ProcessedTool } from '@/hooks/useToolData';
import ToolDisplay from './ToolDisplay';

interface ComputerPanelProps {
  tools: ProcessedTool[];
  selectedTool: ProcessedTool | null | undefined;
  selectTool: (id: string) => void;
  onClose: () => void;
}

const ComputerPanel: React.FC<ComputerPanelProps> = ({
  tools,
  selectedTool,
  selectTool,
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Go to next/previous tool
  const goToNextTool = () => {
    if (!selectedTool) return;
    
    const currentIndex = tools.findIndex(tool => tool.id === selectedTool.id);
    if (currentIndex < tools.length - 1) {
      selectTool(tools[currentIndex + 1].id);
    }
  };
  
  const goToPrevTool = () => {
    if (!selectedTool) return;
    
    const currentIndex = tools.findIndex(tool => tool.id === selectedTool.id);
    if (currentIndex > 0) {
      selectTool(tools[currentIndex - 1].id);
    }
  };
  
  // Format tool name for display
  const formatToolName = (name: string) => {
    return name.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get tool icon based on tool name
  const getToolIcon = (toolName: string) => {
    const name = toolName?.toLowerCase() || '';
    
    if (name.includes('file') || name.includes('read') || name.includes('write')) {
      return <FileText size={18} className="text-blue-500" />;
    } else if (name.includes('terminal') || name.includes('command') || name.includes('shell')) {
      return <Terminal size={18} className="text-green-500" />;
    } else if (name.includes('edit') || name.includes('replace')) {
      return <Edit size={18} className="text-purple-500" />;
    } else {
      return <Terminal size={18} className="text-gray-500" />;
    }
  };
  
  return (
    <div className="h-full w-full" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 4.5rem)' }}>
      <div className="border border-gray-100 rounded-lg bg-white shadow-sm flex flex-col h-full" style={{ 
        overflow: 'hidden',
        display: 'flex', 
        flexDirection: 'column',
        minHeight: 0, // Important for proper flexbox behavior in Firefox
        maxHeight: '100%' // Ensures the panel doesn't exceed container height
      }}>
        {/* Title bar - fixed height */}
        <div className="px-4 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Monitor size={18} className="text-gray-700" />
            <h2 className="text-base font-semibold text-gray-800">Suna's Computer</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500"
              title={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        
        {/* Current tool info - fixed height */}
        {selectedTool && (
          <div className="px-4 pt-1 pb-2 flex items-start flex-shrink-0">
            <div className="mr-3 flex-shrink-0">
              {getToolIcon(selectedTool.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-800 truncate">
                  {formatToolName(selectedTool.name)}
                </h3>
                {tools.length > 1 && (
                  <div className="flex ml-2 flex-shrink-0">
                    <button 
                      onClick={goToPrevTool}
                      disabled={tools.findIndex(t => t.id === selectedTool.id) === 0}
                      className={`p-1 rounded-l border border-gray-200 ${tools.findIndex(t => t.id === selectedTool.id) === 0 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button 
                      onClick={goToNextTool}
                      disabled={tools.findIndex(t => t.id === selectedTool.id) === tools.length - 1}
                      className={`p-1 rounded-r border border-gray-200 border-l-0 ${tools.findIndex(t => t.id === selectedTool.id) === tools.length - 1 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {selectedTool.arguments && typeof selectedTool.arguments === 'string' ? 
                  (() => {
                    try {
                      const args = JSON.parse(selectedTool.arguments as string);
                      // Display relevant arguments based on tool type
                      if (selectedTool.name.toLowerCase().includes('file')) {
                        return args.target_file || args.file_path || 'Working with file';
                      } else if (selectedTool.name.toLowerCase().includes('terminal') || selectedTool.name.toLowerCase().includes('command')) {
                        return args.command || 'Running command';
                      }
                      return 'Processing task...';
                    } catch (e) {
                      return 'Processing task...';
                    }
                  })() : 'Processing task...'
                }
              </p>
              {tools.length > 1 && (
                <div className="text-xs text-gray-500 mt-0.5">
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded-full text-xs">
                    {tools.findIndex(t => t.id === selectedTool.id) + 1} of {tools.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Tool display container - takes remaining space but never exceeds container */}
        <div className="flex-1 min-h-0">
          {selectedTool ? (
            <div className="h-full p-4 overflow-hidden">
              <ToolDisplay {...selectedTool} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 p-4">
              <div className="text-center">
                <div className="mb-3 flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <Terminal size={24} />
                  </div>
                </div>
                <p className="text-gray-500">No tool selected</p>
                <p className="text-xs text-gray-400 mt-1">Select a tool from the timeline below</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Fixed bottom timeline - guaranteed to be at the bottom */}
        {tools.length > 1 && (
          <div className="bg-white px-4 py-1.5 flex-shrink-0 border-t border-gray-100">
            <div className="flex items-center gap-3">
              {/* Current position text */}
              <div className="text-xs font-medium text-gray-500 flex-shrink-0">
                {tools.findIndex(t => t.id === selectedTool?.id) + 1} / {tools.length}
              </div>
              
              {/* Progress bar */}
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full relative overflow-hidden">
                {(() => {
                  // Calculate total duration and relative segment sizes
                  let totalDuration = 0;
                  const durations: number[] = [];
                  
                  // First pass: calculate individual and total durations
                  for (let i = 0; i < tools.length; i++) {
                    const currentTool = tools[i];
                    const nextTool = i < tools.length - 1 ? tools[i + 1] : null;
                    
                    // Calculate duration based on timestamp difference
                    const startTime = currentTool.timestamp.getTime();
                    const endTime = nextTool ? nextTool.timestamp.getTime() : Date.now();
                    const duration = endTime - startTime;
                    
                    // Ensure a minimum duration for visibility
                    durations.push(Math.max(duration, 500));
                    totalDuration += durations[i];
                  }
                  
                  // Find min and max durations for normalization
                  const minDuration = Math.min(...durations);
                  const maxDuration = Math.max(...durations);
                  const durationRange = maxDuration - minDuration;
                  
                  // Second pass: create segments with normalized widths
                  let currentPosition = 0;
                  const segments = tools.map((tool, index) => {
                    // Normalize the width to reduce extreme differences
                    // Base width ensures all segments have reasonable visibility
                    const baseWidth = 80 / tools.length; // Increased base width to 80% of total space
                    let normalizedWidth = baseWidth;
                    
                    if (durationRange > 0) {
                      // Add additional width based on normalized duration (reduced to 20% of space for variable width)
                      const normalizedDuration = (durations[index] - minDuration) / durationRange;
                      normalizedWidth += (normalizedDuration * 20) / tools.length; 
                    }
                    
                    // Adjust the last segment to fill remaining space
                    if (index === tools.length - 1) {
                      normalizedWidth = 100 - currentPosition;
                    }
                    
                    const position = currentPosition;
                    currentPosition += normalizedWidth;
                    
                    const isSelected = selectedTool?.id === tool.id;
                    const isCompleted = selectedTool && 
                      tools.findIndex(t => t.id === tool.id) < tools.findIndex(t => t.id === selectedTool.id);
                    
                    return (
                      <button
                        key={tool.id}
                        onClick={() => selectTool(tool.id)}
                        title={formatToolName(tool.name)}
                        className={`absolute top-0 h-full transition-all ${
                          isSelected || isCompleted ? '' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                        style={{
                          width: `${normalizedWidth}%`,
                          left: `${position}%`,
                          backgroundColor: isSelected ? '#3b82f6' : isCompleted ? '#93c5fd' : '',
                          borderRight: isSelected ? '2px solid #2563eb' : '',
                        }}
                      />
                    );
                  });
                  
                  return segments;
                })()}
              </div>
              
              {/* Navigation - keep compact */}
              <div className="flex items-center flex-shrink-0">
                <div className="flex rounded-full border border-gray-200 p-0.5">
                  <button 
                    onClick={goToPrevTool}
                    disabled={!selectedTool || tools.findIndex(t => t.id === selectedTool.id) === 0}
                    className={`p-1 rounded-l ${!selectedTool || tools.findIndex(t => t.id === selectedTool.id) === 0 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button 
                    onClick={goToNextTool}
                    disabled={!selectedTool || tools.findIndex(t => t.id === selectedTool.id) === tools.length - 1}
                    className={`p-1 rounded-r ${!selectedTool || tools.findIndex(t => t.id === selectedTool.id) === tools.length - 1 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Expanded mode overlay */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Expanded mode panel */}
      {isExpanded && (
        <div className="fixed inset-5 z-50 bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
          {/* Same content as above, but in full screen */}
          <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Monitor size={20} className="text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-800">Suna's Computer</h2>
            </div>
            <button 
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500"
              title="Minimize"
            >
              <Minimize2 size={16} />
            </button>
          </div>
          
          {selectedTool && (
            <div className="px-4 pt-2 pb-3 flex items-start flex-shrink-0 border-b border-gray-100">
              <div className="mr-3 flex-shrink-0">
                {getToolIcon(selectedTool.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-gray-800 truncate">
                    {formatToolName(selectedTool.name)}
                  </h3>
                  {tools.length > 1 && (
                    <div className="flex ml-2 flex-shrink-0">
                      <button 
                        onClick={goToPrevTool}
                        disabled={tools.findIndex(t => t.id === selectedTool.id) === 0}
                        className={`p-1.5 rounded-l border border-gray-200 ${tools.findIndex(t => t.id === selectedTool.id) === 0 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-500 hover:bg-gray-100'}`}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        onClick={goToNextTool}
                        disabled={tools.findIndex(t => t.id === selectedTool.id) === tools.length - 1}
                        className={`p-1.5 rounded-r border border-gray-200 border-l-0 ${tools.findIndex(t => t.id === selectedTool.id) === tools.length - 1 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-500 hover:bg-gray-100'}`}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedTool.arguments && typeof selectedTool.arguments === 'string' ? 
                    (() => {
                      try {
                        const args = JSON.parse(selectedTool.arguments as string);
                        if (selectedTool.name.toLowerCase().includes('file')) {
                          return args.target_file || args.file_path || 'Working with file';
                        } else if (selectedTool.name.toLowerCase().includes('terminal')) {
                          return args.command || 'Running command';
                        }
                        return 'Processing task...';
                      } catch (e) {
                        return 'Processing task...';
                      }
                    })() : 'Processing task...'
                  }
                </p>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-hidden p-6">
            {selectedTool ? (
              <ToolDisplay {...selectedTool} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <Terminal size={32} />
                    </div>
                  </div>
                  <p className="text-lg text-gray-500">No tool selected</p>
                  <p className="text-sm text-gray-400 mt-2">Select a tool from the timeline below</p>
                </div>
              </div>
            )}
          </div>
          
          {tools.length > 1 && (
            <div className="bg-white px-6 py-3 flex-shrink-0 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-gray-500 flex-shrink-0">
                  {tools.findIndex(t => t.id === selectedTool?.id) + 1} / {tools.length}
                </div>
                
                <div className="flex-1 h-2 bg-gray-200 rounded-full relative overflow-hidden">
                  {/* Same timeline functionality as above but larger */}
                  {(() => {
                    let currentPosition = 0;
                    return tools.map((tool, index) => {
                      const width = 100 / tools.length;
                      const position = currentPosition;
                      currentPosition += width;
                      
                      const isSelected = selectedTool?.id === tool.id;
                      const isCompleted = selectedTool && 
                        tools.findIndex(t => t.id === tool.id) < tools.findIndex(t => t.id === selectedTool.id);
                      
                      return (
                        <button
                          key={tool.id}
                          onClick={() => selectTool(tool.id)}
                          title={formatToolName(tool.name)}
                          className={`absolute top-0 h-full transition-all ${
                            isSelected || isCompleted ? '' : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                          style={{
                            width: `${width}%`,
                            left: `${position}%`,
                            backgroundColor: isSelected ? '#3b82f6' : isCompleted ? '#93c5fd' : '',
                            borderRight: isSelected ? '2px solid #2563eb' : '',
                          }}
                        />
                      );
                    });
                  })()}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={goToPrevTool}
                    disabled={!selectedTool || tools.findIndex(t => t.id === selectedTool.id) === 0}
                    className={`p-2 rounded-full border border-gray-200 ${!selectedTool || tools.findIndex(t => t.id === selectedTool.id) === 0 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={goToNextTool}
                    disabled={!selectedTool || tools.findIndex(t => t.id === selectedTool.id) === tools.length - 1}
                    className={`p-2 rounded-full border border-gray-200 ${!selectedTool || tools.findIndex(t => t.id === selectedTool.id) === tools.length - 1 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComputerPanel; 