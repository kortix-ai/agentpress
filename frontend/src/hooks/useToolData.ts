import { useState, useEffect } from 'react';
import { ApiMessage } from '@/components/threads/types';

export interface ProcessedTool {
  id: string;
  name: string;
  content: string;
  arguments?: string;
  status: 'completed' | 'error' | 'running';
  timestamp: Date;
}

export function useToolData(messages: ApiMessage[], streamingTool?: { id: string; name: string; content: string; status?: string }) {
  const [processedTools, setProcessedTools] = useState<ProcessedTool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // Process messages to extract tool data
  useEffect(() => {
    // Skip processing if we already have tools
    if (processedTools.length > 0 && !streamingTool) return;
    
    // Extract tool call data
    const extractedTools: ProcessedTool[] = [];
    
    // First, build a map of assistant tool calls
    const toolCallMap = new Map<string, {name: string, arguments: string, timestamp: Date}>();
    
    // Process each message
    messages.forEach(message => {
      if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
        // Process tool calls from assistant messages
        message.tool_calls.forEach(toolCall => {
          toolCallMap.set(toolCall.id, {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
            timestamp: message.created_at ? new Date(message.created_at) : new Date()
          });
        });
      } else if (message.role === 'tool' && message.tool_call_id) {
        // Process tool response
        const toolCall = toolCallMap.get(message.tool_call_id);
        if (toolCall) {
          // Create processed tool with both call and response data
          extractedTools.push({
            id: message.tool_call_id,
            name: message.name || toolCall.name,
            content: message.content || '',
            arguments: toolCall.arguments,
            status: 'completed',
            timestamp: toolCall.timestamp
          });
        }
      }
    });
    
    // Add streaming tool if it exists and isn't already processed
    if (streamingTool && streamingTool.id && streamingTool.content) {
      const exists = extractedTools.some(tool => tool.id === streamingTool.id);
      if (!exists) {
        extractedTools.push({
          id: streamingTool.id,
          name: streamingTool.name,
          content: streamingTool.content,
          status: (streamingTool.status as any) || 'running',
          timestamp: new Date()
        });
      }
    }
    
    // Sort by timestamp
    extractedTools.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Update state
    setProcessedTools(extractedTools);
    
    // Select the latest tool if none is selected
    if (extractedTools.length > 0 && !selectedToolId) {
      setSelectedToolId(extractedTools[extractedTools.length - 1].id);
    }
  }, [messages, streamingTool, processedTools.length, selectedToolId]);
  
  // Get the selected tool
  const selectedTool = selectedToolId 
    ? processedTools.find(tool => tool.id === selectedToolId) 
    : streamingTool 
      ? { 
          id: streamingTool.id, 
          name: streamingTool.name, 
          content: streamingTool.content, 
          status: (streamingTool.status as any) || 'running', 
          timestamp: new Date() 
        } 
      : null;
  
  // Handler for selecting a tool
  const selectTool = (id: string) => {
    setSelectedToolId(id);
    setIsViewOpen(true);
  };
  
  return {
    tools: processedTools,
    selectedTool,
    isViewOpen,
    setIsViewOpen,
    selectTool
  };
} 