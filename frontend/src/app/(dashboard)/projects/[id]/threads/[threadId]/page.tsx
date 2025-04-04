'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import { addMessage, getMessages, startAgent, stopAgent, getAgentStatus, streamAgent, getAgentRuns } from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { ChatInput } from '@/components/chat-input';

// Define a type for the params to make React.use() work properly
type ThreadParams = { id: string; threadId: string };

interface ApiMessage {
  role: string;
  content: string;
  type?: 'content' | 'tool_call';
  name?: string;
  arguments?: string;
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
                    console.log('[PAGE] 🚨 Force fetching messages after completion');
                    // Fire and forget - we don't need to await this
                    getMessages(threadId)
                      .then(updatedMsgs => {
                        console.log('[PAGE] 🚨 Forcefully updated messages after completion');
                        setMessages(updatedMsgs);
                        setStreamContent('');
                      })
                      .catch(err => console.error('[PAGE] Failed force message update:', err));
                  }
                } catch (forceErr) {
                  console.error('[PAGE] Error in forced completion handling:', forceErr);
                }
                
                // Continue with normal status verification
                if (runId) {
                  try {
                    // Force the verification request and log its execution
                    console.log(`[PAGE] ⚠️ EXPLICITLY verifying agent run status with backend for runId: ${runId}`);
                    let agentStatusResult;
                    try {
                      agentStatusResult = await getAgentStatus(runId);
                      console.log(`[PAGE] ✅ Backend agent status API response:`, agentStatusResult);
                    } catch (statusError) {
                      console.error(`[PAGE] ❌ Failed to get agent status from API:`, statusError);
                      throw statusError;
                    }
                    
                    // Ensure the stream is cleaned up first
                    if (streamCleanupRef.current) {
                      console.log('[PAGE] Explicitly cleaning up stream due to completion status');
                      streamCleanupRef.current();
                      streamCleanupRef.current = null;
                    }
                    
                    // Log and fetch messages
                    console.log('[PAGE] Fetching final messages after completion');
                    let updatedMessages;
                    try {
                      updatedMessages = await getMessages(threadId);
                      console.log('[PAGE] ✅ Successfully fetched messages:', updatedMessages.length);
                    } catch (messagesError) {
                      console.error('[PAGE] ❌ Failed to fetch messages:', messagesError);
                      throw messagesError;
                    }
                    
                    // Update messages
                    setMessages(updatedMessages);
                    
                    // Clear streaming content after a tiny delay for smooth transition
                    setTimeout(() => {
                      console.log('[PAGE] Clearing streaming content');
                      setStreamContent('');
                    }, 50);
                    
                    // Set agent run ID to null to prevent lingering state
                    setAgentRunId(null);
                    console.log('[PAGE] ✅ Completion fully handled!');
                    
                  } catch (err) {
                    console.error('[PAGE] Error verifying agent status:', err);
                    // If verification fails, still mark as completed to avoid hanging UI
                    setAgentStatus('idle');
                    setIsStreaming(false);
                    setAgentRunId(null);
                    
                    // Clear streaming content
                    setStreamContent('');
                  }
                } else {
                  console.warn('[PAGE] Received completion status but no runId is available');
                  // Still update UI to avoid hanging
                  setAgentStatus('idle');
                  setIsStreaming(false);
                  setAgentRunId(null);
                }
                
                return;
              }
              
              // Handle regular content with data: prefix
              if (jsonData?.type === 'content' && jsonData?.content) {
                // For regular content, just append to the existing content
                setStreamContent(prev => prev + jsonData?.content);
                console.log('[PAGE] Added content from prefixed data:', jsonData?.content.substring(0, 30) + '...');
                return;
              }
              
              // Handle tool calls with data: prefix
              if (jsonData?.type === 'tool_call') {
                const toolContent = jsonData.name 
                  ? `Tool: ${jsonData.name}\n${jsonData.arguments || ''}`
                  : jsonData.arguments || '';
                
                // Update UI with tool call content
                setStreamContent(prev => prev + (prev ? '\n' : '') + toolContent);
                console.log('[PAGE] Added tool call content from prefixed data:', toolContent.substring(0, 30) + '...');
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
            
            // Skip empty messages
            if (!jsonData?.content && !jsonData?.arguments) return;
            
            // Handle different message types
            if (jsonData?.type === 'tool_call') {
              const toolContent = jsonData.name 
                ? `Tool: ${jsonData.name}\n${jsonData.arguments || ''}`
                : jsonData.arguments || '';
              
              // Update UI with tool call content
              setStreamContent(prev => prev + (prev ? '\n' : '') + toolContent);
              console.log('[PAGE] Added tool call content:', toolContent.substring(0, 30) + '...');
            } else if (jsonData?.type === 'content' && jsonData?.content) {
              // For regular content, just append to the existing content
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
      const [messageResult, agentResult] = await Promise.all([
        addMessage(threadId, userMessage),
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
      {/* <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{projectName}</h1>
          <div className="text-muted-foreground">•</div>
          <div className="text-sm text-muted-foreground">Thread {thread?.thread_id ? thread.thread_id.slice(0, 8) : '...'}</div>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs">
          <div className={`h-1.5 w-1.5 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="font-medium">{isStreaming ? 'Live' : 'Offline'}</span>
        </div>
      </div> */}

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
                            <div className="text-muted-foreground">Tool: {message.name}</div>
                            <div className="mt-1">{message.arguments}</div>
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
                        {streamContent}
                        {isStreaming && (
                          <span className="inline-flex items-center ml-0.5">
                            <span 
                              className="inline-block h-4 w-0.5 bg-foreground/50 mx-px"
                              style={{ 
                                opacity: 0.7,
                                animation: 'cursorBlink 1s ease-in-out infinite',
                              }}
                            />
                            <style jsx global>{`
                              @keyframes cursorBlink {
                                0%, 100% { opacity: 1; }
                                50% { opacity: 0; }
                              }
                            `}</style>
                          </span>
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
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={handleScrollButtonClick}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
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
            />
          </div>
        </div>
      </div>
    </div>
  );
} 