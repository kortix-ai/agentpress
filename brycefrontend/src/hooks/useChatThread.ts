import { useState, useEffect, useCallback, useRef } from 'react';
import { addUserMessage, getMessages, startAgent, stopAgent, getAgentStatus, streamAgent, getAgentRuns } from '@/lib/api';
import { ApiMessage, ApiAgentRun, ToolCallData } from '@/components/threads/types';
import { toast } from 'sonner';

interface UseChatThreadProps {
  threadId: string;
}

interface UseChatThreadReturn {
  messages: ApiMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  agentRunId: string | null;
  agentStatus: 'idle' | 'running' | 'paused';
  isStreaming: boolean;
  streamContent: string;
  toolCallData: ToolCallData | null;
  sendMessage: (message: string) => Promise<void>;
  stopAgent: () => Promise<void>;
}

export function useChatThread({ threadId }: UseChatThreadProps): UseChatThreadReturn {
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentRunId, setAgentRunId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [toolCallData, setToolCallData] = useState<ToolCallData | null>(null);
  
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const initialLoadCompleted = useRef<boolean>(false);
  const messagesLoadedRef = useRef(false);
  const agentRunsCheckedRef = useRef(false);
  
  // Load messages and check for active agent runs
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!initialLoadCompleted.current) {
        setIsLoading(true);
      }
      
      setError(null);
      
      try {
        if (!threadId) {
          throw new Error('Invalid thread ID');
        }
        
        // Load messages only if not already loaded
        if (!messagesLoadedRef.current) {
          const messagesData = await getMessages(threadId);
          if (isMounted) {
            setMessages(messagesData);
            messagesLoadedRef.current = true;
          }
        }

        // Check for active agent runs only once per thread
        if (!agentRunsCheckedRef.current) {
          try {
            // Get agent runs for this thread
            const agentRuns = await getAgentRuns(threadId) as unknown as ApiAgentRun[];
            agentRunsCheckedRef.current = true;
            
            // Look for running agent runs
            const activeRuns = agentRuns.filter(run => run.status === 'running');
            if (activeRuns.length > 0 && isMounted) {
              // Sort by start time to get the most recent
              activeRuns.sort((a, b) => 
                new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
              );
              
              // Set the current agent run
              const latestRun = activeRuns[0];
              if (latestRun) {
                setAgentRunId(latestRun.id);
                setAgentStatus('running');
                
                // Start streaming only on initial page load
                handleStreamAgent(latestRun.id);
              }
            }
          } catch (err) {
            console.error('Error checking for active runs:', err);
          }
        }
        
        // Mark that we've completed the initial load
        initialLoadCompleted.current = true;
      } catch (err) {
        console.error('Error loading thread data:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load thread');
          toast.error('Failed to load thread data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
      
      // Properly clean up stream
      if (streamCleanupRef.current) {
        console.log('Cleaning up stream on unmount');
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
    };
  }, [threadId]);

  // Handle streaming agent responses
  const handleStreamAgent = useCallback(async (runId: string) => {
    // Clean up any existing stream
    if (streamCleanupRef.current) {
      console.log(`Cleaning up existing stream before starting new one`);
      streamCleanupRef.current();
      streamCleanupRef.current = null;
    }
    
    setIsStreaming(true);
    setStreamContent('');
    
    console.log(`Setting up stream for agent run ${runId}`);
    
    // Start streaming the agent's responses
    const cleanup = streamAgent(runId, {
      onMessage: async (rawData: string) => {
        try {
          let processedData = rawData;
          let jsonData: {
            type?: string;
            status?: string;
            content?: string;
            message?: string;
            name?: string;
            arguments?: string;
            tool_call?: {
              id: string;
              function: {
                name: string;
                arguments: string;
              };
              type: string;
              index: number;
            };
          } | null = null;
          
          // Handle data: prefix format (SSE standard format)
          if (rawData.startsWith('data: ')) {
            processedData = rawData.substring(6).trim(); // Remove "data: " prefix
          }
          
          try {
            jsonData = JSON.parse(processedData);
            
            // Handle status messages
            if (jsonData?.type === 'status') {
              if (jsonData?.status === 'completed') {
                // Reset tool call data on completion
                setToolCallData(null);
                
                // Update UI state
                setIsStreaming(false);
                setAgentStatus('idle');
                
                // Clean up stream
                if (streamCleanupRef.current) {
                  streamCleanupRef.current();
                  streamCleanupRef.current = null;
                }
                
                // Reset agent run ID
                setAgentRunId(null);
                
                // Reload messages
                const updatedMsgs = await getMessages(threadId);
                setMessages(updatedMsgs);
                setStreamContent('');
                
                return;
              }
              
              // Skip other status messages
              return;
            }
            
            // Handle tool status messages
            if (jsonData?.type === 'tool_status') {
              if (jsonData?.status === 'completed' || jsonData?.status === 'failed' || jsonData?.status === 'error') {
                // Reset tool call data when a tool execution completes
                setToolCallData(null);
              }
              return;
            }
            
            // Handle tool output messages
            if (jsonData && 'role' in jsonData && jsonData.role === 'tool') {
              // Parse file extension to determine language when receiving tool output
              let language = 'plaintext';
              let fileName = '';
              
              // Try to extract file info from content
              if (jsonData?.content) {
                // Try to detect a file path
                const filePathMatch = jsonData.content.match(/Contents of file: (.+?)($|\n)/);
                const fileCreatedMatch = jsonData.content.match(/(Created|Updated|Edited) file: (.+?)($|\n)/);
                
                if (filePathMatch && filePathMatch[1]) {
                  fileName = filePathMatch[1].split('/').pop() || '';
                } else if (fileCreatedMatch && fileCreatedMatch[2]) {
                  fileName = fileCreatedMatch[2].split('/').pop() || '';
                }
                
                // Determine language based on extension
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
              
              // Update tool call data then clear it
              setToolCallData(prev => prev ? { ...prev, language, fileName } : null);
              
              // Clear tool call data after a delay
              setTimeout(() => {
                setToolCallData(null);
              }, 500);
              
              // For tool output, also append to stream content
              if (jsonData?.content) {
                setStreamContent(prev => prev + jsonData?.content);
              }
              
              return;
            }
            
            // Handle tool call messages
            if (jsonData?.type === 'content' && jsonData?.tool_call) {
              const { id, function: toolFunction } = jsonData.tool_call;
              
              // Detect file paths and language from tool call
              let fileName = '';
              let language = 'plaintext';
              
              try {
                const partialArgs = toolFunction.arguments;
                
                // Look for common file path patterns
                const filePathMatch = partialArgs.match(/"(file_path|target_file|path)":\s*"([^"]+)"/);
                if (filePathMatch && filePathMatch[2]) {
                  fileName = filePathMatch[2].split('/').pop() || '';
                  
                  // Determine language based on file extension
                  const ext = fileName.split('.').pop()?.toLowerCase();
                  if (ext === 'js' || ext === 'jsx') language = 'javascript';
                  else if (ext === 'ts' || ext === 'tsx') language = 'typescript';
                  else if (ext === 'html' || ext === 'xml') language = 'html';
                  else if (ext === 'css') language = 'css';
                  else if (ext === 'md') language = 'markdown';
                  else if (ext === 'json') language = 'json';
                  else if (ext === 'py') language = 'python';
                }
              } catch {
                // Ignore parsing errors for partial data
              }
              
              // Update tool call data - accumulate arguments
              setToolCallData(prev => ({
                id,
                name: toolFunction?.name,
                arguments: prev && prev.id === id ? 
                  (prev.arguments || '') + (toolFunction?.arguments || '') : 
                  toolFunction?.arguments,
                fileName,
                language
              }));
              
              return;
            }
            
            // Handle regular content messages
            if (jsonData?.type === 'content' && jsonData?.content) {
              // Only reset tool call data for regular content when no active tool
              if (!toolCallData || toolCallData.status === 'completed') {
                setToolCallData(null);
              }
              
              // Append content
              setStreamContent(prev => prev + jsonData?.content);
            }
          } catch (error) {
            console.warn('Failed to process message as JSON:', error);
          }
        } catch (error) {
          console.warn('Failed to process message:', error);
        }
      },
      onError: (error: Error | unknown) => {
        console.error('Streaming error:', error);
        
        if (error instanceof Error && !error.message.includes('connect')) {
          toast.error(`Error: ${error.message}`);
        }
        
        // Clean up on error
        streamCleanupRef.current = null;
        setIsStreaming(false);
        setAgentStatus('idle');
      },
      onClose: async () => {
        console.log('Stream connection closed');
        
        // Update UI state
        setAgentStatus('idle');
        setIsStreaming(false);
        setToolCallData(null);
        
        try {
          console.log(`Checking final status for agent run ${runId}`);
          await getAgentStatus(runId);
          
          // Clear cleanup reference
          streamCleanupRef.current = null;
          setAgentRunId(null);
          
          // Fetch final messages and clear streaming content
          const updatedMessages = await getMessages(threadId);
          setMessages(updatedMessages);
          
          // Clear streaming content after a delay for smooth transition
          setTimeout(() => {
            setStreamContent('');
          }, 50);
        } catch (err) {
          console.error('Error checking agent status:', err);
          
          // Clear agent run ID
          setAgentRunId(null);
          
          // Add streaming content as a message if connection lost
          if (streamContent) {
            const assistantMessage = {
              role: 'assistant',
              content: streamContent + "\n\n[Connection to agent lost]"
            };
            setMessages(prev => [...prev, assistantMessage]);
            setStreamContent('');
          }
          
          // Clear cleanup reference
          streamCleanupRef.current = null;
        }
      }
    });
    
    // Store cleanup function
    streamCleanupRef.current = cleanup;
  }, [threadId, toolCallData, streamContent]);

  // Send a message and start the agent
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    setIsSending(true);
    
    try {
      // Add the message optimistically to the UI
      const userMessage: ApiMessage = {
        role: 'user',
        content: message
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Send to the API and start agent in parallel
      const [, agentResult] = await Promise.all([
        addUserMessage(threadId, userMessage.content),
        startAgent(threadId)
      ]);
      
      setAgentRunId(agentResult.agent_run_id);
      setAgentStatus('running');
      
      // Start streaming the agent's responses
      handleStreamAgent(agentResult.agent_run_id);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [threadId, handleStreamAgent]);

  // Stop the currently running agent
  const stopCurrentAgent = useCallback(async () => {
    if (!agentRunId) {
      console.warn('No agent run ID to stop');
      return;
    }
    
    console.log(`Stopping agent run: ${agentRunId}`);
    
    try {
      // Clean up the stream
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
      
      // Update UI state
      setIsStreaming(false);
      setAgentStatus('idle');
      
      // Stop the agent
      await stopAgent(agentRunId);
      
      // Show notification
      toast.info('Agent stopped');
      
      // Reset state
      setAgentRunId(null);
      
      // Fetch latest messages
      const updatedMessages = await getMessages(threadId);
      setMessages(updatedMessages);
      
      // Clear streaming content
      setTimeout(() => {
        setStreamContent('');
      }, 50);
    } catch (err) {
      console.error('Error stopping agent:', err);
      toast.error('Failed to stop agent');
      
      // Update UI state even on error
      setAgentStatus('idle');
      setIsStreaming(false);
      setAgentRunId(null);
      setStreamContent('');
    }
  }, [agentRunId, threadId]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    agentRunId,
    agentStatus,
    isStreaming,
    streamContent,
    toolCallData,
    sendMessage,
    stopAgent: stopCurrentAgent
  };
} 