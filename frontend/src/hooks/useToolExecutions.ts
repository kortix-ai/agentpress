import { useState, useCallback, useEffect } from 'react';
import { ApiMessage } from '@/components/threads/types';
import { ToolExecution } from '@/components/secondary-view';

interface UseToolExecutionsProps {
  messages: ApiMessage[];
  toolCallData: { 
    id?: string, 
    name?: string, 
    arguments?: string, 
    status?: string, 
    fileName?: string, 
    language?: string 
  } | null;
  streamContent: string;
}

interface UseToolExecutionsReturn {
  isSecondaryViewOpen: boolean;
  setIsSecondaryViewOpen: (value: boolean | ((prevState: boolean) => boolean)) => void;
  selectedToolExecution: ToolExecution | null;
  setSelectedToolExecution: (value: ToolExecution | null) => void;
  historicalToolExecutions: ToolExecution[];
  handleToolClick: (message: ApiMessage) => void;
  streamingToolCall: {
    id: string;
    name: string;
    content: string;
    status: 'running' | 'completed' | 'started';
    language?: string;
    fileName?: string;
  } | undefined;
}

export function useToolExecutions({
  messages,
  toolCallData,
  streamContent
}: UseToolExecutionsProps): UseToolExecutionsReturn {
  const [isSecondaryViewOpen, setIsSecondaryViewOpen] = useState(false);
  const [selectedToolExecution, setSelectedToolExecution] = useState<ToolExecution | null>(null);
  const [historicalToolExecutions, setHistoricalToolExecutions] = useState<ToolExecution[]>([]);

  // Convert a message to a tool execution
  const handleToolClick = useCallback((message: ApiMessage) => {
    let language = '';
    
    // Determine language for file operations
    if (message.arguments) {
      try {
        const args = JSON.parse(message.arguments);
        const path = args.file_path || args.target_file || args.path || '';
        const fileName = path.split('/').pop() || '';
        
        if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) language = 'javascript';
        else if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) language = 'typescript';
        else if (fileName.endsWith('.html') || fileName.endsWith('.xml')) language = 'html';
        else if (fileName.endsWith('.css')) language = 'css';
        else if (fileName.endsWith('.md')) language = 'markdown';
        else if (fileName.endsWith('.json')) language = 'json';
        else if (fileName.endsWith('.py')) language = 'python';
      } catch (e) {
        console.error('Error parsing arguments', e);
      }
    }
    
    // Create a tool execution object
    const toolExecution: ToolExecution = {
      id: message.id || String(Date.now()),
      name: message.name || 'unknown',
      status: 'completed' as const,
      startTime: message.created_at ? new Date(message.created_at) : new Date(),
      endTime: message.created_at ? new Date(message.created_at) : new Date(),
      result: message.content || '',
      language
    };
    
    // Add this to our historical tool executions if it's not already there
    setHistoricalToolExecutions(prev => {
      if (prev.some(t => t.id === toolExecution.id)) {
        return prev;
      }
      return [...prev, toolExecution];
    });
    
    // Open secondary view if not already open
    if (!isSecondaryViewOpen) {
      setIsSecondaryViewOpen(true);
    }
    
    // Set the selected tool
    setSelectedToolExecution(toolExecution);
  }, [isSecondaryViewOpen]);

  // Function to add tool execution to history
  const addToolExecution = useCallback((toolData: {
    id: string;
    name: string;
    content?: string;
    arguments?: string;
    status?: string;
    language?: string;
    fileName?: string;
  }) => {
    const toolExecution: ToolExecution = {
      id: toolData.id,
      name: toolData.name,
      status: (toolData.status as 'running' | 'completed' | 'error') || 'running',
      startTime: new Date(),
      result: toolData.content || '',
      language: toolData.language
    };
    
    setHistoricalToolExecutions(prev => {
      // Check if we already have this tool
      const existingIndex = prev.findIndex(tool => tool.id === toolData.id);
      if (existingIndex >= 0) {
        // Update existing tool
        const newTools = [...prev];
        newTools[existingIndex] = {
          ...prev[existingIndex],
          status: toolExecution.status,
          result: toolExecution.result || prev[existingIndex].result,
          endTime: toolExecution.status === 'completed' || toolExecution.status === 'error' ? new Date() : undefined
        };
        return newTools;
      } else {
        // Add new tool
        return [...prev, toolExecution];
      }
    });
  }, []);

  // Update tool executions when tool call data changes
  useEffect(() => {
    if (toolCallData && toolCallData.id) {
      addToolExecution({
        id: toolCallData.id,
        name: toolCallData.name || 'Unknown Tool',
        content: streamContent,
        arguments: toolCallData.arguments,
        status: toolCallData.status || 'running',
        language: toolCallData.language,
        fileName: toolCallData.fileName
      });
    }
  }, [toolCallData, addToolExecution, streamContent]);

  // Initialize tool executions from messages
  useEffect(() => {
    // Only process messages if we have them and our historical tool executions are empty
    if (messages.length > 0 && historicalToolExecutions.length === 0) {
      console.log('Building tool execution history from messages');
      
      // Extract tool messages
      const toolMessages = messages.filter(msg => 
        msg.role === 'tool' || msg.type === 'tool_call'
      );
      
      if (toolMessages.length > 0) {
        // Create tool executions from messages
        const executions: ToolExecution[] = toolMessages.map(msg => {
          let language = 'plaintext';
          
          // Try to determine language
          if (msg.role === 'tool' && msg.content) {
            const fileName = msg.content.match(/(?:Contents of file|Created file|Updated file|Edited file): (.*?)(?:$|\n)/)?.[1]?.split('/').pop() || '';
            if (fileName) {
              const ext = fileName.split('.').pop()?.toLowerCase();
              if (ext === 'js' || ext === 'jsx') language = 'javascript';
              else if (ext === 'ts' || ext === 'tsx') language = 'typescript';
              else if (ext === 'html' || ext === 'xml') language = 'html';
              else if (ext === 'css') language = 'css';
              else if (ext === 'md') language = 'markdown';
              else if (ext === 'json') language = 'json';
              else if (ext === 'py') language = 'python';
            }
          }
          
          return {
            id: msg.id || String(Date.now()) + Math.random().toString(36).substr(2, 9),
            name: msg.name || (msg.role === 'tool' ? 'tool_output' : 'tool_call'),
            status: 'completed' as const,
            startTime: msg.created_at ? new Date(msg.created_at) : new Date(),
            endTime: msg.created_at ? new Date(msg.created_at) : new Date(),
            result: msg.content || '',
            language
          };
        });
        
        // Set historical tool executions
        setHistoricalToolExecutions(executions);
        
        // If we have executions, select the latest one
        if (executions.length > 0) {
          setSelectedToolExecution(executions[executions.length - 1]);
        }
      }
    }
  }, [messages, historicalToolExecutions.length]);

  // Create the streaming tool call object for the secondary view
  const streamingToolCall = toolCallData ? {
    id: toolCallData.id || String(Date.now()),
    name: toolCallData.name || '',
    content: streamContent,
    status: (toolCallData.status as 'running' | 'completed' | 'started') || 'running',
    language: toolCallData.language,
    fileName: toolCallData.fileName
  } : undefined;

  return {
    isSecondaryViewOpen,
    setIsSecondaryViewOpen,
    selectedToolExecution,
    setSelectedToolExecution,
    historicalToolExecutions,
    handleToolClick,
    streamingToolCall
  };
} 