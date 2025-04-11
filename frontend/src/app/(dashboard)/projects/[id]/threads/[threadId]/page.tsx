'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowDown, File } from 'lucide-react';
import { addUserMessage, getMessages, startAgent, stopAgent, getAgentStatus, streamAgent, getAgentRuns, getProject } from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { ChatInput } from '@/components/chat-input';
import { FileViewerModal } from '@/components/file-viewer-modal';

// Define a type for the params to make React.use() work properly
type ThreadParams = { id: string; threadId: string };

interface ApiMessage {
  role: string;
  content: string;
  type?: 'content' | 'tool_call' | string;
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
  created_at?: string;
}

interface ApiAgentRun {
  id: string;
  thread_id: string;
  status: 'running' | 'completed' | 'stopped' | 'error';
  started_at: string;
  completed_at: string | null;
  responses: ApiMessage[];
  error: string | null;
}

// Helper function to determine tool icon
const getToolIcon = (toolName: string | undefined) => {
  if (!toolName) return <File className="h-4 w-4" />;
  
  const toolNameLower = toolName.toLowerCase();
  
  if (toolNameLower.includes('terminal') || toolNameLower.includes('execute_command')) {
    return <Terminal className="h-4 w-4" />;
  } else if (toolNameLower.includes('file') || toolNameLower.includes('read') || toolNameLower.includes('write') || toolNameLower.includes('create')) {
    return <FileText className="h-4 w-4" />;
  } else if (toolNameLower.includes('search') || toolNameLower.includes('grep')) {
    return <Search className="h-4 w-4" />;
  } else if (toolNameLower.includes('message') || toolNameLower.includes('ask')) {
    return <MessageSquare className="h-4 w-4" />;
  } else {
    return <File className="h-4 w-4" />; // Default icon
  }
};

// Helper function to get friendly description of what the tool is doing
const getToolDescription = (toolName: string | undefined, args: string | undefined) => {
  if (!toolName) return "";
  
  const toolNameLower = toolName.toLowerCase();
  let argObj: Record<string, unknown> = {};
  
  // Try to parse arguments as JSON if available
  if (args) {
    try {
      argObj = JSON.parse(args);
    } catch {
      // If not valid JSON, use as is
    }
  }
  
  // Extract specific information based on tool type
  if (toolNameLower.includes('execute_command')) {
    const command = typeof argObj === 'object' && argObj.command ? String(argObj.command).substring(0, 30) : '';
    return command || 'execute_command';
  } else if (toolNameLower.includes('read_file')) {
    const path = typeof argObj === 'object' && argObj.path ? String(argObj.path) : '';
    const filename = path.split('/').pop() || path;
    return filename || 'read_file';
  } else if (toolNameLower.includes('write') || toolNameLower.includes('create_file')) {
    const path = typeof argObj === 'object' && argObj.file_path 
      ? String(argObj.file_path) 
      : (typeof argObj === 'object' && argObj.path ? String(argObj.path) : '');
    const filename = path.split('/').pop() || path;
    return filename || 'create_file';
  } else if (toolNameLower.includes('delete_file')) {
    const path = typeof argObj === 'object' && argObj.file_path ? String(argObj.file_path) : '';
    const filename = path.split('/').pop() || path;
    return filename || 'delete_file';
  } else if (toolNameLower.includes('grep_search')) {
    const query = typeof argObj === 'object' && argObj.query ? String(argObj.query) : '';
    return query || 'grep_search';
  } else if (toolNameLower.includes('file_search')) {
    const query = typeof argObj === 'object' && argObj.query ? String(argObj.query) : '';
    return query || 'file_search';
  } else if (toolNameLower.includes('list_dir')) {
    const path = typeof argObj === 'object' && argObj.relative_workspace_path ? String(argObj.relative_workspace_path) : '';
    return path || 'list_dir';
  } else if (toolNameLower.includes('str_replace')) {
    const path = typeof argObj === 'object' && argObj.file_path ? String(argObj.file_path) : '';
    const filename = path.split('/').pop() || path;
    return filename || 'str_replace';
  } else if (toolNameLower.includes('message_ask_user')) {
    return 'message_ask_user';
  } else if (toolNameLower.includes('idle')) {
    return 'idle';
  } else {
    // Just return a cleaned up version of the tool name
    return toolName.replace(/_/g, ' ');
  }
};

export default function ThreadPage({ params }: { params: Promise<ThreadParams> }) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.id;
  const threadId = unwrappedParams.threadId;
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentRunId, setAgentRunId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [toolCallData, setToolCallData] = useState<{id?: string, name?: string, arguments?: string, index?: number} | null>(null);
  
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const initialLoadCompleted = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const messagesLoadedRef = useRef(false);
  const agentRunsCheckedRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState(0);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const hasInitiallyScrolled = useRef<boolean>(false);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);

  const handleStreamAgent = useCallback(async (runId: string) => {
    // Clean up any existing stream
    if (streamCleanupRef.current) {
      console.log(`[PAGE] Cleaning up existing stream before starting new one`);
      streamCleanupRef.current();
      streamCleanupRef.current = null;
    }
    
    setIsStreaming(true);
    setStreamContent('');
    
    console.log(`[PAGE] Setting up stream for agent run ${runId}`);
    
    // Start streaming the agent's responses with improved implementation
    const cleanup = streamAgent(runId, {
      onMessage: async (rawData: string) => {
        try {
          // Log the raw data first for debugging
          console.log(`[PAGE] Raw message data:`, rawData);
          
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
            
            try {
              jsonData = JSON.parse(processedData);
              console.log('[PAGE] Successfully parsed data: prefixed JSON:', jsonData);
              
              // Specifically check for completion status
              if (jsonData?.type === 'status' && jsonData?.status === 'completed') {
                console.log('[PAGE] Detected completion status event:', processedData);
                
                try {
                  // Direct access verification - forcing immediate state update
                  // This will execute regardless of the normal flow
                  console.log(`[PAGE] 🚨 FORCE VERIFYING completion status for run: ${runId || 'unknown'}`);
                  
                  // Reset tool call data on completion
                  setToolCallData(null);
                  
                  // Immediately mark as not streaming to update UI
                  setIsStreaming(false);
                  setAgentStatus('idle');
                  
                  // Explicitly clean up stream to ensure it's closed
                  if (streamCleanupRef.current) {
                    console.log('[PAGE] 🚨 Force closing stream on completion status');
                    streamCleanupRef.current();
                    streamCleanupRef.current = null;
                  }
                  
                  // Explicitly set agent run ID to null to reset state
                  setAgentRunId(null);
                  
                  // Attempt to load fresh messages
                  if (threadId) {
                    console.log('[PAGE] 🚨 Loading fresh messages after run completion');
                    getMessages(threadId)
                      .then(updatedMsgs => {
                        console.log('[PAGE] 🚨 Updated messages after run completion');
                        setMessages(updatedMsgs);
                        setStreamContent('');
                      })
                      .catch(err => console.error('[PAGE] Failed run completion message update:', err));
                  }
                } catch (forceErr) {
                  console.error('[PAGE] Error in run completion handling:', forceErr);
                }
                
                return;
              }
              
              // Handle tool status messages
              if (jsonData?.type === 'tool_status') {
                console.log('[PAGE] Received tool status message:', jsonData);
                
                if (jsonData?.status === 'completed' || jsonData?.status === 'failed' || jsonData?.status === 'error') {
                  console.log('[PAGE] Tool completed/failed/error, resetting toolCallData');
                  // Reset tool call data when a tool execution completes
                  setToolCallData(null);
                }
                
                return;
              }
              
              // Handle tool result messages
              if (jsonData?.type === 'tool_result') {
                console.log('[PAGE] Received tool output message, resetting toolCallData');
                setToolCallData(null);
                
                // For tool output, also append to stream content
                if (jsonData?.content) {
                  setStreamContent(prev => prev + jsonData?.content);
                  console.log('[PAGE] Added tool output content:', jsonData?.content.substring(0, 30) + '...');
                }
                return;
              }
            } catch (e) {
              console.warn('[PAGE] Failed to parse data: prefix event:', e);
              // Continue with standard parsing if data: prefix parsing fails
            }
          }
          
          // Standard JSON parsing for non-prefixed messages
          try {
            jsonData = JSON.parse(processedData);
            
            // Handle status messages specially
            if (jsonData?.type === 'status') {
              console.log(`[PAGE] Received status update: ${jsonData?.status}`);
              
              if (jsonData?.status === 'completed') {
                // Same handling as the data: prefix section
                console.log('[PAGE] Received standard completed status message');
                
                // IMPORTANT: Add the same completion handling here
                try {
                  // Direct access verification - forcing immediate state update
                  console.log(`[PAGE] 🚨 FORCE VERIFYING completion status for standard message: ${runId || 'unknown'}`);
                  
                  // Reset tool call data
                  setToolCallData(null);
                  
                  // Immediately mark as not streaming to update UI
                  setIsStreaming(false);
                  setAgentStatus('idle');
                  
                  // Explicitly clean up stream to ensure it's closed
                  if (streamCleanupRef.current) {
                    console.log('[PAGE] 🚨 Force closing stream on standard completion status');
                    streamCleanupRef.current();
                    streamCleanupRef.current = null;
                  }
                  
                  // Explicitly set agent run ID to null to reset state
                  setAgentRunId(null);
                  
                  // Load fresh messages
                  if (threadId) {
                    getMessages(threadId)
                      .then(updatedMsgs => {
                        console.log('[PAGE] 🚨 Updated messages after standard completion');
                        setMessages(updatedMsgs);
                        setStreamContent('');
                      })
                      .catch(err => console.error('[PAGE] Failed standard message update:', err));
                  }
                } catch (forceErr) {
                  console.error('[PAGE] Error in standard completion handling:', forceErr);
                }
                
                return;
              }
              
              // Don't process other status messages further
              return;
            }
            
            // Handle tool output messages - reset toolCallData when we receive a tool output
            if (jsonData && 'role' in jsonData && jsonData.role === 'tool') {
              console.log('[PAGE] Received standard tool output message, resetting toolCallData');
              
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
              
              // Set tool call data with the determined language before clearing it
              // This ensures the language is properly tracked for the last tool output
              setToolCallData(prev => prev ? { ...prev, language, fileName } : null);
              
              // Then clear the tool call data after a short delay
              setTimeout(() => {
                setToolCallData(null);
              }, 500);
              
              // For tool output, also append to stream content
              if (jsonData?.content) {
                setStreamContent(prev => prev + jsonData?.content);
                console.log('[PAGE] Added standard tool output content:', jsonData?.content.substring(0, 30) + '...');
              }
              return;
            }
            
            // Skip empty messages
            if (!jsonData?.content && !jsonData?.arguments && !jsonData?.tool_call) return;
            
            // Handle different message types
            if (jsonData?.type === 'content' && jsonData?.tool_call) {
              console.log('[PAGE] Processing tool call chunk:', jsonData.tool_call);
              
              const { id, function: toolFunction } = jsonData.tool_call;
              
              // Detect file paths and language from tool call
              let fileName = '';
              let language = 'plaintext';
              
              try {
                // Try to parse arguments as they come in
                // Sometimes they may be incomplete, so we handle errors gracefully
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
                  else language = 'plaintext'; // Default fallback
                }
              } catch {
                // Ignore parsing errors for partial data
                console.debug('[PAGE] Error parsing partial tool arguments');
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
              
              // Don't update streamContent directly for tool calls - they go to the secondary view
              return;
            } else if (jsonData?.type === 'tool_status') {
              // Handle tool status messages
              console.log('[PAGE] Received tool status message:', jsonData);
              
              if (jsonData?.status === 'completed' || jsonData?.status === 'failed' || jsonData?.status === 'error') {
                console.log('[PAGE] Tool completed/failed/error, resetting toolCallData');
                // Reset tool call data when a tool execution completes
                setToolCallData(prev => prev ? {...prev, status: jsonData?.status} : null);
                
                // After a short delay, clear the tool call data
                setTimeout(() => {
                  setToolCallData(null);
                }, 1000);
              }
              
              return;
            } else if (jsonData?.type === 'tool_call') {
              // Create proper tool call object for secondary view
              if (jsonData?.name && jsonData?.arguments) {
                setToolCallData(prev => {
                  // If it's an update to the current tool, update arguments
                  if (prev && !prev.id) {
                    return {
                      ...prev,
                      id: String(Date.now()), // Generate an ID if none exists
                      name: jsonData?.name || prev.name,
                      arguments: jsonData?.arguments || ''
                    };
                  }
                  // Otherwise create a new tool call
                  return {
                    id: String(Date.now()),
                    name: jsonData?.name || '',
                    arguments: jsonData?.arguments || '',
                    status: 'running'
                  };
                });
              }
              
              // For the main view, format the tool call as a message
              const toolContent = jsonData?.name 
                ? `Tool: ${jsonData?.name}\n${jsonData?.arguments || ''}`
                : jsonData?.arguments || '';
              
              // Update UI with tool call content
              setStreamContent(prev => prev + (prev ? '\n' : '') + toolContent);
              console.log('[PAGE] Added tool call content from prefixed data:', toolContent.substring(0, 30) + '...');
            } else if (jsonData?.type === 'content' && jsonData?.content) {
              // Only reset tool call data if we're receiving regular content and no tool is currently active
              // This prevents explanation text from interrupting a streaming tool display
              if (!toolCallData || toolCallData.status === 'completed') {
                console.log('[PAGE] Resetting tool call data for regular content');
                setToolCallData(null);
              } else {
                console.log('[PAGE] Keeping tool call data active while receiving content', toolCallData);
              }
              
              // For regular content, just append to the existing content in main view
              setStreamContent(prev => prev + jsonData?.content);
              console.log('[PAGE] Added content:', jsonData?.content.substring(0, 30) + '...');
            }
          } catch (error) {
            console.warn('[PAGE] Failed to process message as JSON:', error);
          }
        } catch (error) {
          console.warn('[PAGE] Failed to process message:', error, 'Raw data:', rawData);
        }
      },
      onError: (error: Error | unknown) => {
        console.error('[PAGE] Streaming error:', error);
        
        if (error instanceof Error) {
          // Only show critical errors
          if (!error.message.includes('connect')) {
            toast.error(`Error: ${error.message}`);
          }
        }
        
        // Clean up on error
        streamCleanupRef.current = null;
        setIsStreaming(false);
        setAgentStatus('idle');
      },
      onClose: async () => {
        console.log('[PAGE] Stream connection closed');
        
        // Immediately set UI state to idle
        setAgentStatus('idle');
        setIsStreaming(false);
        
        // Reset tool call data
        setToolCallData(null);
        
        try {
          console.log(`[PAGE] Checking final status for agent run ${runId}`);
          const status = await getAgentStatus(runId);
          console.log(`[PAGE] Agent status: ${status.status}`);
          
          // Clear cleanup reference to prevent reconnection
          streamCleanupRef.current = null;
          
          // Set agent run ID to null to prevent lingering state
          setAgentRunId(null);
          
          // Fetch final messages first, then clear streaming content
          console.log('[PAGE] Fetching final messages');
          const updatedMessages = await getMessages(threadId);
          
          // Update messages first
          setMessages(updatedMessages);
          
          // Then clear streaming content after a tiny delay for smooth transition
          setTimeout(() => {
            console.log('[PAGE] Clearing streaming content');
            setStreamContent('');
          }, 50);
        } catch (err) {
          console.error('[PAGE] Error checking agent status:', err);
          
          // Clear the agent run ID
          setAgentRunId(null);
          
          // Handle any remaining streaming content
          if (streamContent) {
            console.log('[PAGE] Adding partial streaming content as message');
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
  }, [threadId]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // Only show loading state on the first load, not when switching tabs
      if (!initialLoadCompleted.current) {
        setIsLoading(true);
      }
      
      setError(null);
      
      try {
        if (!projectId || !threadId) {
          throw new Error('Invalid project or thread ID');
        }
        
        // Fetch project details to get sandbox_id
        const projectData = await getProject(projectId);
        if (isMounted && projectData && projectData.sandbox_id) {
          setSandboxId(projectData.sandbox_id);
          
          // Load messages only if not already loaded
          if (!messagesLoadedRef.current) {
            const messagesData = await getMessages(threadId) as unknown as ApiMessage[];
            if (isMounted) {
              setMessages(messagesData);
              messagesLoadedRef.current = true;
              
              // Only scroll to bottom on initial page load
              if (!hasInitiallyScrolled.current) {
                scrollToBottom('auto');
                hasInitiallyScrolled.current = true;
              }
            }
          }

          // Check for active agent runs only once per thread
          if (!agentRunsCheckedRef.current) {
            try {
              // Get agent runs for this thread using the proper API function
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
                  console.log('Starting stream for active run on initial page load');
                  handleStreamAgent(latestRun.id);
                }
              }
            } catch (err) {
              console.error('Error checking for active runs:', err);
            }
          }
          
          // Mark that we've completed the initial load
          initialLoadCompleted.current = true;
        }
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
    
    if (user) {
      loadData();
    }

    // Cleanup function
    return () => {
      isMounted = false;
      
      // Properly clean up stream
      if (streamCleanupRef.current) {
        console.log('[PAGE] Cleaning up stream on unmount');
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
      
      // Reset component state to prevent memory leaks
      console.log('[PAGE] Resetting component state on unmount');
    };
  }, [projectId, threadId, user, handleStreamAgent]);

  const handleSubmitMessage = async (message: string) => {
    if (!message.trim()) return;
    
    setIsSending(true);
    
    try {
      // Add the message optimistically to the UI
      const userMessage: ApiMessage = {
        role: 'user',
        content: message
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Clear the input
      setNewMessage('');
      
      // Scroll to bottom immediately when user sends a message
      scrollToBottom();
      
      // Send to the API and start agent in parallel
      const [, agentResult] = await Promise.all([
        addUserMessage(threadId, userMessage.content),
        startAgent(threadId)
      ]);
      
      setAgentRunId(agentResult.agent_run_id);
      setAgentStatus('running');
      
      // Start streaming the agent's responses immediately
      handleStreamAgent(agentResult.agent_run_id);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleStopAgent = async () => {
    if (!agentRunId) {
      console.warn('[PAGE] No agent run ID to stop');
      return;
    }
    
    console.log(`[PAGE] Stopping agent run: ${agentRunId}`);
    
    try {
      // First clean up the stream if it exists
      if (streamCleanupRef.current) {
        console.log('[PAGE] Cleaning up stream connection');
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
      
      // Mark as not streaming, but keep content visible during transition
      setIsStreaming(false);
      setAgentStatus('idle');
      
      // Then stop the agent
      console.log('[PAGE] Sending stop request to backend');
      await stopAgent(agentRunId);
      
      // Update UI
      console.log('[PAGE] Agent stopped successfully');
      toast.info('Agent stopped');
      
      // Reset agent run ID
      setAgentRunId(null);
      
      // Fetch final messages to get state from database
      console.log('[PAGE] Fetching final messages after stop');
      const updatedMessages = await getMessages(threadId) as unknown as ApiMessage[];
      
      // Update messages first
      setMessages(updatedMessages);
      
      // Then clear streaming content after a tiny delay for smooth transition
      setTimeout(() => {
        console.log('[PAGE] Clearing streaming content');
        setStreamContent('');
      }, 50);
    } catch (err) {
      console.error('[PAGE] Error stopping agent:', err);
      toast.error('Failed to stop agent');
      
      // Still update UI state to avoid being stuck
      setAgentStatus('idle');
      setIsStreaming(false);
      setAgentRunId(null);
      
      // Clear streaming content
      setStreamContent('');
    }
  };

  // Auto-focus on textarea when component loads
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // Adjust textarea height based on content
  useEffect(() => {
    const adjustHeight = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };

    adjustHeight();
    
    // Adjust on window resize too
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [newMessage]);

  // // Handle keyboard shortcuts
  // const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  //   // Send on Enter (without Shift)
  //   if (e.key === 'Enter' && !e.shiftKey) {
  //     e.preventDefault();
      
  //     if (newMessage.trim() && !isSending && agentStatus !== 'running') {
  //       handleSubmitMessage(newMessage);
  //     }
  //   }
  // };

  // Check if user has scrolled up from bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    
    setShowScrollButton(isScrolledUp);
    setButtonOpacity(isScrolledUp ? 1 : 0);
    setUserHasScrolled(isScrolledUp);
  };

  // Scroll to bottom explicitly
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Auto-scroll only when:
  // 1. User sends a new message
  // 2. Agent starts responding
  // 3. User clicks the scroll button
  useEffect(() => {
    const isNewUserMessage = messages.length > 0 && messages[messages.length - 1]?.role === 'user';
    
    if ((isNewUserMessage || agentStatus === 'running') && !userHasScrolled) {
      scrollToBottom();
    }
  }, [messages, agentStatus, userHasScrolled]);

  // Make sure clicking the scroll button scrolls to bottom
  const handleScrollButtonClick = () => {
    scrollToBottom();
    setUserHasScrolled(false);
  };

  // Remove unnecessary scroll effects
  useEffect(() => {
    if (!latestMessageRef.current || messages.length === 0) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollButton(!entry?.isIntersecting);
        setButtonOpacity(entry?.isIntersecting ? 0 : 1);
      },
      {
        root: messagesContainerRef.current,
        threshold: 0.1,
      }
    );
    
    observer.observe(latestMessageRef.current);
    return () => observer.disconnect();
  }, [messages, streamContent]);

  // Update UI states when agent status changes
  useEffect(() => {
    // Scroll to bottom when agent starts responding, but only if user hasn't scrolled up manually
    if (agentStatus === 'running' && !userHasScrolled) {
      scrollToBottom();
    }
  }, [agentStatus, userHasScrolled]);

  // Add synchronization effect to ensure agentRunId and agentStatus are in sync
  useEffect(() => {
    // If agentRunId is null, make sure agentStatus is 'idle'
    if (agentRunId === null && agentStatus !== 'idle') {
      console.log('[PAGE] Synchronizing agent status to idle because agentRunId is null');
      setAgentStatus('idle');
      setIsStreaming(false);
    }
    
    // If we have an agentRunId but status is idle, check if it should be running
    if (agentRunId !== null && agentStatus === 'idle') {
      const checkAgentRunStatus = async () => {
        try {
          const status = await getAgentStatus(agentRunId);
          if (status.status === 'running') {
            console.log('[PAGE] Synchronizing agent status to running based on backend status');
            setAgentStatus('running');
            
            // If not already streaming, start streaming
            if (!isStreaming && !streamCleanupRef.current) {
              console.log('[PAGE] Starting stream due to status synchronization');
              handleStreamAgent(agentRunId);
            }
          } else {
            // If the backend shows completed/stopped but we have an ID, reset it
            console.log('[PAGE] Agent run is not running, resetting agentRunId');
            setAgentRunId(null);
          }
        } catch (err) {
          console.error('[PAGE] Error checking agent status for sync:', err);
          // In case of error, reset to idle state
          setAgentRunId(null);
          setAgentStatus('idle');
          setIsStreaming(false);
        }
      };
      
      checkAgentRunStatus();
    }
  }, [agentRunId, agentStatus, isStreaming, handleStreamAgent]);

  // Add debug logging for agentStatus changes
  useEffect(() => {
    console.log(`[PAGE] 🔄 AgentStatus changed to: ${agentStatus}, isStreaming: ${isStreaming}, agentRunId: ${agentRunId}`);
  }, [agentStatus, isStreaming, agentRunId]);

  // Failsafe effect to ensure UI consistency
  useEffect(() => {
    // Force agentStatus to idle if not streaming or no agentRunId
    if ((!isStreaming || agentRunId === null) && agentStatus !== 'idle') {
      console.log('[PAGE] 🔒 FAILSAFE: Forcing agentStatus to idle because isStreaming is false or agentRunId is null');
      setAgentStatus('idle');
    }
  }, [isStreaming, agentRunId, agentStatus]);

  // Open the file viewer modal
  const handleOpenFileViewer = () => {
    setFileViewerOpen(true);
  };

  // Only show a full-screen loader on the very first load
  if (isAuthLoading || (isLoading && !initialLoadCompleted.current)) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="relative flex-1 flex flex-col">
          <div className="absolute inset-0 overflow-y-auto px-6 py-4 pb-[5.5rem]">
            <div className="mx-auto max-w-3xl">
              <div className="space-y-4">
                {/* User message skeleton */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-primary/10 px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                
                {/* Assistant message skeleton */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg bg-muted px-4 py-3">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                
                {/* User message skeleton */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-primary/10 px-4 py-3">
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                
                {/* Assistant message skeleton */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg bg-muted px-4 py-3">
                    <Skeleton className="h-4 w-56 mb-2" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input area skeleton */}
          <div className="absolute inset-x-0 bottom-0 border-t bg-background/80 backdrop-blur-sm">
            <div className="mx-auto max-w-3xl px-6 py-4">
              <div className="relative">
                <Skeleton className="h-[50px] w-full rounded-md" />
                <div className="absolute right-2 bottom-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">Error</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  // const projectName = project?.name || 'Loading...';

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="relative flex-1 flex flex-col">
        <div 
          ref={messagesContainerRef}
          className="absolute inset-0 overflow-y-auto px-6 py-4 pb-[5.5rem]" 
          onScroll={handleScroll}
        >
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 && !streamContent ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="text-sm text-muted-foreground">Send a message to start the conversation.</p>
                  <p className="text-xs text-muted-foreground/60">The AI agent will respond automatically.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    ref={index === messages.length - 1 && message.role === 'assistant' ? latestMessageRef : null}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Add timestamp above for user messages - only visible on hover */}
                    {message.role === 'user' && message.created_at && (
                      <div className="text-xs text-zinc-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    )}
                    
                    <div 
                      className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {message.type === 'tool_call' ? (
                          <div className="font-mono text-xs">
                            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                                <div className="h-2 w-2 rounded-full bg-primary"></div>
                              </div>
                              <span>Tool: {message.name}</span>
                            </div>
                            <div className="mt-1 p-3 bg-secondary/20 rounded-md overflow-x-auto">
                              {message.arguments}
                            </div>
                          </div>
                        ) : message.role === 'tool' ? (
                          <div className="font-mono text-xs">
                            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-success/10">
                                <div className="h-2 w-2 rounded-full bg-success"></div>
                              </div>
                              <span>Tool Result: {message.name}</span>
                            </div>
                            <div className="mt-1 p-3 bg-success/5 rounded-md">
                              {message.content}
                            </div>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {streamContent && (
                  <div 
                    ref={latestMessageRef}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] rounded-lg bg-muted px-4 py-3 text-sm">
                      <div className="whitespace-pre-wrap break-words">
                        {toolCallData ? (
                          <div className="font-mono text-xs">
                            <div className="mt-1 p-3 bg-secondary/0 rounded-md overflow-hidden relative border border-zinc-100">
                              {/* Metallic pulse overlay */}
                              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                                <div 
                                  className="h-full w-40 absolute top-0 left-0" 
                                  style={{ 
                                    animation: 'toolPulse 3s linear infinite',
                                    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%)',
                                    mixBlendMode: 'overlay',
                                    zIndex: 20
                                  }}
                                />
                              </div>
                              
                              {/* Tool execution status with clear indication of what's running */}
                              <div className="flex items-center gap-3 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                
                                <span className="text-zinc-700">
                                  {(() => {
                                    // Enhanced tool description display with parsing for all tool types
                                    if (!toolCallData.arguments) return "Processing...";
                                    
                                    try {
                                      const args = JSON.parse(toolCallData.arguments);
                                      
                                      // Create/write file operation
                                      if (toolCallData.name?.toLowerCase().includes('create_file') || 
                                          toolCallData.name?.toLowerCase().includes('write')) {
                                        const filePath = args.file_path || args.path;
                                        if (filePath) {
                                          const fileName = filePath.split('/').pop();
                                          return <>Creating file: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{fileName}</span></>;
                                        }
                                      }
                                      
                                      // Read file operation
                                      else if (toolCallData.name?.toLowerCase().includes('read_file')) {
                                        const filePath = args.target_file || args.path;
                                        if (filePath) {
                                          const fileName = filePath.split('/').pop();
                                          return <>Reading file: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{fileName}</span></>;
                                        }
                                      }
                                      
                                      // Delete file operation
                                      else if (toolCallData.name?.toLowerCase().includes('delete_file')) {
                                        const filePath = args.target_file || args.file_path;
                                        if (filePath) {
                                          const fileName = filePath.split('/').pop();
                                          return <>Deleting file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span></>;
                                        }
                                      }
                                      
                                      // Edit file operation
                                      else if (toolCallData.name?.toLowerCase().includes('edit_file')) {
                                        const filePath = args.target_file;
                                        if (filePath) {
                                          const fileName = filePath.split('/').pop();
                                          return <>Editing file: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{fileName}</span></>;
                                        }
                                      }
                                      
                                      // Execute command
                                      else if (toolCallData.name?.toLowerCase().includes('command') || 
                                              toolCallData.name?.toLowerCase().includes('terminal')) {
                                        const command = args.command;
                                        if (command) {
                                          return <>Running: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{command.substring(0, 40)}{command.length > 40 ? '...' : ''}</span></>;
                                        }
                                      }
                                      
                                      // Search operations
                                      else if (toolCallData.name?.toLowerCase().includes('search') || 
                                              toolCallData.name?.toLowerCase().includes('grep')) {
                                        const query = args.query;
                                        if (query) {
                                          return <>Searching for: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{query.substring(0, 40)}{query.length > 40 ? '...' : ''}</span></>;
                                        }
                                      }
                                      
                                      // List directory
                                      else if (toolCallData.name?.toLowerCase().includes('list_dir')) {
                                        const path = args.relative_workspace_path;
                                        if (path) {
                                          return <>Listing directory <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{path}</span></>;
                                        }
                                      }
                                    } catch {
                                      // If JSON parsing fails, try regex approach for common patterns
                                      if (toolCallData.arguments) {
                                        const filePathMatch = toolCallData.arguments.match(/"(?:file_path|target_file|path)"\s*:\s*"([^"]+)"/);
                                        if (filePathMatch && filePathMatch[1]) {
                                          const filePath = filePathMatch[1];
                                          const fileName = filePath.split('/').pop();
                                          
                                          if (toolCallData.name?.toLowerCase().includes('create') || 
                                              toolCallData.name?.toLowerCase().includes('write')) {
                                            return <>Creating file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span></>;
                                          } else if (toolCallData.name?.toLowerCase().includes('read')) {
                                            return <>Reading file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span></>;
                                          } else if (toolCallData.name?.toLowerCase().includes('edit')) {
                                            return <>Editing file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span></>;
                                          } else if (toolCallData.name?.toLowerCase().includes('delete')) {
                                            return <>Deleting file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span></>;
                                          }
                                          return <>Processing file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span></>;
                                        }
                                        
                                        const commandMatch = toolCallData.arguments.match(/"command"\s*:\s*"([^"]+)"/);
                                        if (commandMatch && commandMatch[1]) {
                                          const command = commandMatch[1];
                                          return <>Running: <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{command.substring(0, 40)}{command.length > 40 ? '...' : ''}</span></>;
                                        }
                                      }
                                    }
                                    
                                    // Fallback to the original getToolDescription with formatted output
                                    const desc = getToolDescription(toolCallData.name, toolCallData.arguments);
                                    const parts = desc.split(':');
                                    if (parts.length > 1) {
                                      return <>{parts[0]}: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{parts.slice(1).join(':')}</span></>;
                                    }
                                    return desc;
                                  })()}
                                </span>
                              </div>
                            </div>
                            
                            <style jsx global>{`
                              @keyframes toolPulse {
                                0% { transform: translateX(-100%); }
                                100% { transform: translateX(400%); }
                              }
                            `}</style>
                          </div>
                        ) : (
                          <div 
                            className={`whitespace-pre-wrap break-words ${
                              message.role === 'user' ? 'cursor-pointer relative' : ''
                            }`} 
                            onClick={() => message.role === 'user' ? handleEditMessage(index) : null}
                          >
                            {message.type === 'tool_call' ? (
                              <div className="font-mono text-xs">
                                <div className="mt-0.5 p-2 bg-secondary/20 rounded-md overflow-hidden">
                                  {/* Action line with icon */}
                                  <div className="flex items-center gap-2 mb-1 pb-1 border-b border-gray-200/30 text-muted-foreground">
                                    <div className="flex items-center justify-center">
                                      {getToolIcon(message.name)}
                                    </div>
                                    <span>{getToolDescription(message.name, message.arguments)}</span>
                                  </div>

                                  {/* Arguments */}
                                  <div className="overflow-x-auto">
                                    {message.arguments}
                                  </div>
                                </div>
                              </div>
                            ) : message.role === 'tool' ? (
                              <div className="font-mono text-xs w-full relative group">
                                {message.created_at && (
                                  <div className="absolute -right-6 top-2 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                    {new Date(message.created_at).toLocaleString()}
                                  </div>
                                )}
                                <div className="inline-block max-w-full">
                                  {(() => {
                                    const toolNameLower = message.name?.toLowerCase() || '';
                                    
                                    // Try to parse tool output as JSON
                                    let jsonOutput = null;
                                    try {
                                      jsonOutput = JSON.parse(message.content);
                                    } catch {
                                      // Not JSON, continue with regular formatting
                                    }

                                    // File creation/write result
                                    if ((toolNameLower.includes('create_file') || toolNameLower.includes('write')) && message.content) {
                                      const filePath = message.content.match(/Created file: (.*)/)?.[1] || 
                                                      message.content.match(/Updated file: (.*)/)?.[1] ||
                                                      message.content.match(/path: "(.*?)"/)?.[1];
                                      const fileName = filePath?.split('/').pop();
                                      
                                      // Look for file content in the tool result
                                      let fileContent = '';
                                      if (jsonOutput?.output) {
                                        fileContent = jsonOutput.output.includes('File created') ? 
                                          message.content.split('\n').slice(1).join('\n') : jsonOutput.output;
                                      }
                                      
                                      return (
                                        <div 
                                          className="mt-0 rounded-md overflow-hidden inline-block cursor-pointer hover:border-success/40 transition-all relative"
                                          onClick={() => handleToolClick(message)}
                                        >
                                          <div className="flex items-center justify-between py-2 bg-success/10">
                                            <div className="flex items-center gap-2">
                                              <FileText className="h-4 w-4 text-success" />
                                              <span className="font-normal text-success/90">File created successfully</span>
                                            </div>
                                            <span className="text-xs text-success/70 ml-3">{fileName}</span>
                                          </div>
                                          {fileContent && (
                                            <div className="px-3 py-2 bg-white max-h-60 overflow-y-auto">
                                              <pre className="text-xs text-slate-700">{fileContent}</pre>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                    
                                    // Read file result
                                    else if (toolNameLower.includes('read_file') && message.content) {
                                      const filePath = message.content.match(/Contents of file: (.*)/)?.[1] || 
                                                    message.content.match(/path: "(.*?)"/)?.[1];
                                      const fileName = filePath?.split('/').pop() || filePath;
                                      
                                      // Get file content - remove any "Contents of file:" prefix
                                      const fileContent = message.content.includes('Contents of file:') ? 
                                        message.content.split('\n').slice(1).join('\n') : message.content;
                                      
                                      return (
                                        <div 
                                          className="mt-0.5 rounded-md overflow-hidden border border-blue-200 inline-block cursor-pointer hover:border-blue-300 transition-all relative"
                                          onClick={() => handleToolClick(message)}
                                        >
                                          <div className="flex items-center justify-between px-2 py-1.5 bg-blue-50">
                                            <div className="flex items-center gap-2">
                                              <FileText className="h-4 w-4 text-blue-500" />
                                              <span className="font-normal text-blue-600">File contents</span>
                                            </div>
                                            <span className="text-xs text-blue-500 ml-3">{fileName}</span>
                                          </div>
                                          <div className="px-3 py-2 bg-white max-h-60 overflow-y-auto">
                                            <pre className="text-xs text-slate-700">{fileContent}</pre>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    // Delete file result
                                    else if (toolNameLower.includes('delete_file') && message.content) {
                                      const filePath = message.content.match(/Deleted file: (.*)/)?.[1] || 
                                                    message.content.match(/path: "(.*?)"/)?.[1];
                                      const fileName = filePath?.split('/').pop() || filePath;
                                      
                                      return (
                                        <div 
                                          className="mt-0.5 rounded-md overflow-hidden border border-orange-200 inline-block cursor-pointer hover:border-orange-300 transition-all relative"
                                          onClick={() => handleToolClick(message)}
                                        >
                                          <div className="px-2 py-1.5 bg-orange-50">
                                            <div className="flex items-center gap-2">
                                              <Trash2 className="h-4 w-4 text-orange-500" />
                                              <span className="font-normal text-orange-600">File deleted: {fileName}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    // Edit file result
                                    else if (toolNameLower.includes('edit_file') && message.content) {
                                      const filePath = message.content.match(/Edited file: (.*)/)?.[1] || 
                                                    message.content.match(/path: "(.*?)"/)?.[1];
                                      const fileName = filePath?.split('/').pop() || filePath;
                                      
                                      return (
                                        <div 
                                          className="mt-0.5 rounded-md overflow-hidden border border-purple-200 inline-block cursor-pointer hover:border-purple-300 transition-all relative"
                                          onClick={() => handleToolClick(message)}
                                        >
                                          <div className="flex items-center justify-between px-2 py-1.5 bg-purple-50">
                                            <div className="flex items-center gap-2">
                                              <Edit className="h-4 w-4 text-purple-500" />
                                              <span className="font-normal text-purple-600">File edited successfully</span>
                                            </div>
                                            <span className="text-xs text-purple-500 ml-3">{fileName}</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    // Terminal/command result
                                    else if ((toolNameLower.includes('command') || toolNameLower.includes('terminal')) && message.content) {
                                      const commandOutput = message.content;
                                      
                                      return (
                                        <div 
                                          className="mt-0.5 rounded-md overflow-hidden border border-zinc-200 inline-block cursor-pointer hover:border-zinc-300 transition-all relative"
                                          onClick={() => handleToolClick(message)}
                                        >
                                          <div className="flex items-center px-3 py-2 bg-zinc-50">
                                            <div className="flex items-center gap-2">
                                              <Terminal className="h-4 w-4 text-zinc-600" />
                                              <span className="font-normal text-zinc-700">Command output</span>
                                            </div>
                                          </div>
                                          <div className="p-2 bg-black max-h-80 overflow-y-auto">
                                            <pre className="text-xs text-green-400">{commandOutput}</pre>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    // Search results
                                    else if ((toolNameLower.includes('search') || toolNameLower.includes('grep')) && message.content) {
                                      return (
                                        <div 
                                          className="mt-0.5 rounded-md overflow-hidden border border-amber-200 inline-block cursor-pointer hover:border-amber-300 transition-all relative"
                                          onClick={() => handleToolClick(message)}
                                        >
                                          <div className="flex items-center px-2 py-1.5 bg-amber-50">
                                            <div className="flex items-center gap-2">
                                              <Search className="h-4 w-4 text-amber-600" />
                                              <span className="font-normal text-amber-700">Search results</span>
                                            </div>
                                          </div>
                                          <div className="p-2 bg-white max-h-60 overflow-y-auto">
                                            <pre className="text-xs text-slate-700 whitespace-pre-wrap">{message.content}</pre>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    // List directory results
                                    else if (toolNameLower.includes('list_dir') && message.content) {
                                      return (
                                        <div 
                                          className="mt-0.5 rounded-md overflow-hidden border border-teal-200 inline-block cursor-pointer hover:border-teal-300 transition-all relative"
                                          onClick={() => handleToolClick(message)}
                                        >
                                          <div className="flex items-center px-2 py-1.5 bg-teal-50">
                                            <div className="flex items-center gap-2">
                                              <FolderOpen className="h-4 w-4 text-teal-600" />
                                              <span className="font-normal text-teal-700">Directory contents</span>
                                            </div>
                                          </div>
                                          <div className="p-2 bg-white max-h-60 overflow-y-auto">
                                            <pre className="text-xs text-slate-700">{message.content}</pre>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    // Default tool result display
                                    return (
                                      <div 
                                        className="mt-0.5 p-2 bg-success/5 rounded-md inline-block cursor-pointer hover:bg-success/10 transition-all relative"
                                        onClick={() => handleToolClick(message)}
                                      >
                                        <pre className="whitespace-pre-wrap">{message.content}</pre>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            ) : (
                              <>
                                {message.content}
                                {/* Add reaction icons for assistant messages */}
                                {message.role === 'assistant' && (
                                  <div className={`flex justify-end mt-1 pt-0.5 gap-2 ${index === messages.length - 1 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle thumbs up
                                        toast.success('Response rated as helpful');
                                      }}
                                      className="p-1 rounded-md hover:bg-zinc-100 transition-colors duration-200"
                                      title="Helpful"
                                    >
                                      <ThumbsUp className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle thumbs down
                                        toast.info('Response rated as not helpful');
                                      }}
                                      className="p-1 rounded-md hover:bg-zinc-100 transition-colors duration-200"
                                      title="Not helpful"
                                    >
                                      <ThumbsDown className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Copy assistant message
                                        copyToClipboard(message.content);
                                      }}
                                      className="p-1 rounded-md hover:bg-zinc-100 transition-colors duration-200"
                                      title="Copy response"
                                    >
                                      <Copy className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle share
                                        toast.info('Sharing options coming soon');
                                      }}
                                      className="p-1 rounded-md hover:bg-zinc-100 transition-colors duration-200"
                                      title="Share"
                                    >
                                      <Share className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {agentStatus === 'running' && !streamContent && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-lg bg-muted px-4 py-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-pulse" />
                      <div className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-pulse delay-150" />
                      <div className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-pulse delay-300" />
                    </div>
                  )}
                  
                  {agentStatus === 'running' && !streamContent && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 max-w-full">
                        <div className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-pulse" />
                        <div className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-pulse delay-150" />
                        <div className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-pulse delay-300" />
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            <div 
              className="sticky bottom-6 flex justify-center"
              style={{ 
                opacity: buttonOpacity,
                transition: 'opacity 0.3s ease-in-out',
                visibility: showScrollButton ? 'visible' : 'hidden'
              }}
            >
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background z-[200]"
                onClick={handleScrollButtonClick}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-background z-50">
            <div className="mx-auto max-w-2xl px-4 mb-4">
              {/* Connector component above chat input */}
              <div className="flex items-center justify-center rounded-t-md border-t border-x border-zinc-200 mx-2 pt-3 pb-1 relative">
                {/* Zinc rectangle button that extends above the connector */}
                <div 
                  className="absolute left-5 -top-17 h-20 w-36 bg-zinc-200 rounded-md border border-zinc-300 flex items-center justify-center cursor-pointer hover:bg-zinc-300 transition-colors"
                  onClick={() => setIsSecondaryViewOpen(prev => !prev)}
                >
                  <PlusCircle className="h-6 w-6 text-zinc-600 mr-2" />
                  <span className="text-sm text-zinc-600">{isSecondaryViewOpen ? 'Hide Panel' : 'Show Panel'}</span>
                </div>
                
                <div className="flex space-x-2">
                  <div className="h-1 w-8 rounded-full bg-zinc-200"></div>
                  <div className="h-1 w-12 rounded-full bg-muted-foreground/30"></div>
                  <div className="h-1 w-8 rounded-full bg-muted-foreground/20"></div>
                </div>
              </div>
              
              <ChatInput
                value={newMessage}
                onChange={setNewMessage}
                onSubmit={handleSubmitMessage}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                loading={isSending}
                disabled={isSending}
                isAgentRunning={agentStatus === 'running'}
                onStopAgent={handleStopAgent}
                autoFocus={!isLoading}
              />
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl px-6 py-4">
            <ChatInput
              value={newMessage}
              onChange={setNewMessage}
              onSubmit={handleSubmitMessage}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              loading={isSending}
              disabled={isSending}
              isAgentRunning={agentStatus === 'running'}
              onStopAgent={handleStopAgent}
              autoFocus={!isLoading}
              onFileBrowse={handleOpenFileViewer}
              sandboxId={sandboxId || undefined}
            />
            
            {/* File Viewer Modal */}
            {sandboxId && (
              <FileViewerModal
                open={fileViewerOpen}
                onOpenChange={setFileViewerOpen}
                sandboxId={sandboxId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
} 