
import { ReactNode } from 'react';

import { useState, useCallback, useEffect } from 'react';
import { ApiMessage } from '@/components/threads/types';


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

  // Helper function to determine language from file extension
  const getLanguageFromFileExtension = (filepath?: string): string => {
    if (!filepath) return '';
    
    const fileName = filepath.split('/').pop() || '';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (ext === 'js' || ext === 'jsx') return 'javascript';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'html' || ext === 'xml') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'md') return 'markdown';
    if (ext === 'json') return 'json';
    if (ext === 'py') return 'python';
    if (ext === 'rb') return 'ruby';
    if (ext === 'go') return 'go';
    if (ext === 'java') return 'java';
    if (ext === 'c' || ext === 'cpp' || ext === 'h') return 'cpp';
    
    return '';
  };

  // Extract file path from arguments
  const extractFilePath = (args: string): string => {
    try {
      const parsedArgs = JSON.parse(args);
      return parsedArgs.file_path || parsedArgs.target_file || parsedArgs.path || '';
    } catch (e) {
      return '';
    }
  };

  // Extract file content from arguments (for create_file, etc.)
  const extractFileContent = (args: string): string => {
    try {
      const parsedArgs = JSON.parse(args);
      return parsedArgs.file_contents || '';
    } catch (e) {
      return '';
    }
  };

  // Convert a message to a tool execution
  const handleToolClick = useCallback((message: ApiMessage) => {
    let language = '';
    let result = message.content || '';
    let toolName = message.name || 'unknown';
    
    // Handle the case where this is a tool response
    if (message.role === 'tool' && message.tool_call_id) {
      // Find the corresponding tool call to get additional information
      const toolCall = messages.find(m => 
        m.role === 'assistant' && 
        m.tool_calls && m.tool_calls.some(tc => tc.id === message.tool_call_id)
      );
      
      if (toolCall?.tool_calls) {
        const matchingCall = toolCall.tool_calls.find(tc => tc.id === message.tool_call_id);
        if (matchingCall) {
          // For certain operations, we want to include the arguments from the call
          const functionName = matchingCall.function.name;
          const functionArgs = matchingCall.function.arguments;
          
          if (functionName.includes('create_file') || functionName.includes('write') || functionName.includes('full_file_rewrite')) {
            // For file creation, we want to include the file content from the arguments
            const filePath = extractFilePath(functionArgs);
            const fileContent = extractFileContent(functionArgs);
            language = getLanguageFromFileExtension(filePath);
            
            if (fileContent) {
              // Rather than success message with prefix, just show the content directly
              result = fileContent;
              
              // Log that we found file content from tool call
              console.log(`Found file content for ${filePath} from tool call:`, fileContent.substring(0, 100) + (fileContent.length > 100 ? '...' : ''));
            } else {
              console.warn(`Tool ${functionName} has no file_contents in arguments:`, 
                typeof functionArgs === 'string' ? functionArgs.substring(0, 100) : JSON.stringify(functionArgs).substring(0, 100)
              );
              
              // Attempt to parse file_contents from a potential object argument
              try {
                const args = JSON.parse(functionArgs);
                if (typeof args === 'object') {
                  // Check for various possible property names containing file content
                  const possibleContent = args.file_contents || args.content || args.contents || args.fileContents;
                  if (possibleContent) {
                    result = possibleContent;
                    console.log(`Found file content in parsed arguments for ${filePath}`);
                  }
                }
              } catch (e) {
                // Parsing failed, ignore
              }
            }
          } else if (functionName.includes('edit_file') || functionName.includes('str_replace')) {
            // For edits, determine the language based on file path
            const filePath = extractFilePath(functionArgs);
            language = getLanguageFromFileExtension(filePath);
            
            // Add a proper "before/after" format that can be detected by the secondary view
            if (message.content && message.content.includes('Replacement successful') || 
                message.content.includes('Edit successful')) {
              // Try to extract before/after content from response
              if (!message.content.match(/Before:/i)) {
                // Create an artificial Before/After section for proper diff viewing
                try {
                  const args = JSON.parse(functionArgs);
                  if (args.old_str && args.new_str) {
                    result = `Before:${args.old_str}\nAfter:${args.new_str}`;
                  }
                } catch (e) {
                  // Use original content if parsing fails
                }
              }
            }
          }
          
          // Update the tool name to use the function name from the original call
          toolName = functionName;
        }
      }
    }
    
    // Create a tool execution object
    const toolExecution: ToolExecution = {
      id: message.id || String(Date.now()),
      name: toolName,
      status: 'completed' as const,
      startTime: message.created_at ? new Date(message.created_at) : new Date(),
      endTime: message.created_at ? new Date(message.created_at) : new Date(),
      result: result,
      language
    };
    
    // Log created tool execution to debug
    console.log(`Created tool execution for ${toolName}:`, {
      id: toolExecution.id,
      language: toolExecution.language,
      resultPreview: toolExecution.result ? (toolExecution.result.substring(0, 100) + (toolExecution.result.length > 100 ? '...' : '')) : 'No result'
    });
    
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
  }, [isSecondaryViewOpen, messages, extractFilePath, extractFileContent, getLanguageFromFileExtension]);

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
      
      // Get all tool executions by pairing assistant tool calls with their responses
      const toolExecutionPairs: {
        call: { 
          id: string; 
          function: { 
            name: string; 
            arguments: string; 
          }; 
          type: string;
        };
        response: ApiMessage | undefined;
        timestamp: Date;
      }[] = [];
      
      // First, collect all tool calls and their responses
      messages.forEach(msg => {
        if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
          // For each tool call in an assistant message
          msg.tool_calls.forEach(toolCall => {
            // Find the corresponding tool response
            const response = messages.find(m => 
              m.role === 'tool' && m.tool_call_id === toolCall.id
            );
            
            toolExecutionPairs.push({
              call: toolCall,
              response,
              timestamp: msg.created_at ? new Date(msg.created_at) : new Date()
            });
          });
        }
      });
      
      console.log('toolExecutionPairs');
      console.log(toolExecutionPairs);

      if (toolExecutionPairs.length > 0) {
        // Create tool executions from pairs
        const executions: ToolExecution[] = toolExecutionPairs.map(pair => {
          let result = pair.response?.content || '';
          let language = 'plaintext';
          
          // Extract useful information from the tool call and response
          const functionName = pair.call.function.name;
          const functionArgs = pair.call.function.arguments;
          
          // Process file operations
          if (functionName.includes('create_file') || functionName.includes('write') || functionName.includes('full_file_rewrite')) {
            // For file creation, include the file content
            const filePath = extractFilePath(functionArgs);
            const fileContent = extractFileContent(functionArgs);
            language = getLanguageFromFileExtension(filePath);
            
            if (fileContent) {
              // IMPORTANT: Just put the file content without any header prefixes
              // This is cleaner for display in the secondary view
              result = fileContent;
              
              // Log file content extraction
              console.log(`Extracted file content for ${filePath}:`, fileContent.substring(0, 100) + (fileContent.length > 100 ? '...' : ''));
            } else {
              console.warn(`Failed to extract file content for ${filePath} from arguments:`, 
                typeof functionArgs === 'string' ? functionArgs.substring(0, 100) : JSON.stringify(functionArgs).substring(0, 100)
              );
            }
          } else if (functionName.includes('edit_file') || functionName.includes('str_replace')) {
            // For edit operations, create a before/after view if possible
            const filePath = extractFilePath(functionArgs);
            language = getLanguageFromFileExtension(filePath);
            
            try {
              const args = JSON.parse(functionArgs);
              if ((args.old_str && args.new_str) || 
                  (args.target_file && args.code_edit)) {
                // Create a before/after view for diff display
                if (args.old_str && args.new_str) {
                  result = `Before:${args.old_str}\nAfter:${args.new_str}`;
                } else if (result.includes('successfully')) {
                  // Handle generic success response
                  result = `Edited file: ${filePath}`;
                }
              }
            } catch (e) {
              // Use original response content if parsing fails
            }
          } else if (functionName.includes('execute_command')) {
            // Process terminal commands
            try {
              // Try to parse the result as JSON if it's a structured output
              const jsonResult = JSON.parse(result);
              if (jsonResult.output) {
                result = jsonResult.output;
              }
            } catch (e) {
              // Not JSON, keep as is
            }
          }
          
          return {
            id: pair.call.id,
            name: functionName,
            status: 'completed' as const,
            startTime: pair.timestamp,
            endTime: pair.response?.created_at ? new Date(pair.response.created_at) : pair.timestamp,
            result: result,
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