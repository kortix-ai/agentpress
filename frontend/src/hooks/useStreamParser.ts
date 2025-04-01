import { useState, useCallback, useRef } from 'react';
import { parseModelResponse } from '@/lib/stream-parser';

export type StreamedContent = {
  text: string;
  toolCalls: Array<{
    name: string;
    arguments: string;
    index: number;
  }>;
  fileCreations: Array<{
    path: string;
    content: string | null;
    index: number;
  }>;
}

export function useStreamParser() {
  const [content, setContent] = useState<StreamedContent>({
    text: '',
    toolCalls: [],
    fileCreations: []
  });
  
  const indexCounter = useRef<number>(0);
  
  const reset = useCallback(() => {
    setContent({
      text: '',
      toolCalls: [],
      fileCreations: []
    });
    indexCounter.current = 0;
  }, []);
  
  const processStreamData = useCallback((rawData: string) => {
    // Skip ping messages
    if (rawData.includes('"type":"ping"')) return;
    
    // Parse the model response
    const parsed = parseModelResponse(rawData);
    
    setContent(prev => {
      const updates: Partial<StreamedContent> = {};
      let shouldUpdate = false;
      
      // Handle content text
      if (parsed.content) {
        updates.text = prev.text + parsed.content;
        shouldUpdate = true;
      }
      
      // Handle tool calls
      if (parsed.toolCall) {
        const { name, arguments: args } = parsed.toolCall;
        updates.toolCalls = [
          ...prev.toolCalls,
          {
            name,
            arguments: args,
            index: indexCounter.current++
          }
        ];
        shouldUpdate = true;
      }
      
      // Handle file creations
      if (parsed.isCreateFile && parsed.createFilePath) {
        updates.fileCreations = [
          ...prev.fileCreations,
          {
            path: parsed.createFilePath,
            content: parsed.createFileContent,
            index: indexCounter.current++
          }
        ];
        shouldUpdate = true;
      }
      
      return shouldUpdate ? { ...prev, ...updates } : prev;
    });
  }, []);
  
  return {
    content,
    processStreamData,
    reset
  };
} 