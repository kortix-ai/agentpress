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
import { parseStreamContent, ParsedPart } from '@/lib/parser';
import { StreamContent } from '@/components/stream-content';

// Define a type for the params to make React.use() work properly
type ThreadParams = { id: string; threadId: string };

interface ApiMessage {
  role: string;
  content: string;
  type?: 'content' | 'tool_call';
  name?: string;
  arguments?: string;
  parsedContent?: ParsedPart[];
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
  const [parsedStreamContent, setParsedStreamContent] = useState<ParsedPart[]>([]);
  
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
    setParsedStreamContent([]);
    
    console.log(`[PAGE] Setting up stream for agent run ${runId}`);
    
    // Start streaming the agent's responses with improved implementation
    const cleanup = streamAgent(runId, {
      onMessage: (rawData: string) => {
        try {
          // Parse the outer data structure
          const data = JSON.parse(rawData);
          
          // Handle the nested data structure
          if (data.content?.startsWith('data: ')) {
            try {
              const innerJson = data.content.replace('data: ', '');
              const innerData = JSON.parse(innerJson);
              
              // Skip empty messages
              if (!innerData.content && !innerData.arguments) return;
              
              window.requestAnimationFrame(() => {
                if (innerData.type === 'tool_call') {
                  // Legacy format handling - this may be deprecated
                  const toolContent = innerData.name 
                    ? `Tool: ${innerData.name}\n${innerData.arguments || ''}`
                    : innerData.arguments || '';
                  
                  setStreamContent(prev => {
                    const newContent = prev + (prev ? '\n' : '') + toolContent;
                    // Always parse the entire content to ensure proper handling
                    try {
                      const parsed = parseStreamContent(newContent);
                      setParsedStreamContent(parsed);
                    } catch (e) {
                      console.error('[PAGE] Error parsing tool call content:', e);
                    }
                    return newContent;
                  });
                } else if (innerData.type === 'content' && innerData.content) {
                  // Handle standard content
                  setStreamContent(prev => {
                    // Add new content to the buffer
                    const newContent = prev + innerData.content;
                    
                    // Parse the content to identify XML tool calls
                    try {
                      // Always reparse the entire content to ensure XML tags are properly matched
                      const parsed = parseStreamContent(newContent);
                      console.log('[PAGE] Parsed content:', parsed.length, 'parts');
                      setParsedStreamContent(parsed);
                    } catch (e) {
                      console.error('[PAGE] Error parsing content:', e);
                    }
                    
                    return newContent;
                  });
                }
              });
            } catch (innerError) {
              console.warn('[PAGE] Failed to parse inner data:', innerError);
            }
          }
        } catch (error) {
          console.warn('[PAGE] Failed to parse message:', error);
        }
      },
      onToolCall: (name: string, args: Record<string, unknown>) => {
        console.log('[PAGE] Tool call received:', name, args);
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
        
        try {
          console.log(`[PAGE] Checking final status for agent run ${runId}`);
          const status = await getAgentStatus(runId);
          console.log(`[PAGE] Agent status: ${status.status}`);
          
          // Immediately set appropriate UI state
          if (status.status === 'completed' || status.status === 'stopped' || status.status === 'error') {
            setAgentStatus('idle');
            setIsStreaming(false);
            
            // Create a new message that preserves the parsed content
            if (streamContent) {
              const assistantMessage: ApiMessage = {
                role: 'assistant',
                content: streamContent,
                parsedContent: parsedStreamContent
              };
              
              // Add the current message to the messages
              setMessages(prev => [...prev, assistantMessage]);
              
              // Then clear streaming content after a tiny delay
              setTimeout(() => {
                console.log('[PAGE] Clearing streaming content');
                setStreamContent('');
                setParsedStreamContent([]);
              }, 50);
            } else {
              // If no stream content, just fetch the messages
              console.log('[PAGE] Fetching final messages');
              const messagesData = await getMessages(threadId);
              
              // Process messages to detect and parse XML-style tool calls
              const processedMessages = messagesData.map(message => {
                // Only process assistant messages with content
                if (message.role === 'assistant' && message.content) {
                  try {
                    // Check if the message content contains XML tags
                    if (message.content.includes('<') && message.content.includes('>')) {
                      const parsedContent = parseStreamContent(message.content);
                      // Only add parsedContent if we found actual tool calls
                      if (parsedContent.some(part => typeof part !== 'string')) {
                        return { ...message, parsedContent };
                      }
                    }
                  } catch (error) {
                    console.error('Error parsing message content:', error);
                  }
                }
                return message;
              });
              
              setMessages(processedMessages);
            }
            
            // Clear cleanup reference to prevent reconnection
            streamCleanupRef.current = null;
          } else {
            // Still running - shouldn't happen often with proper completion handling
            console.log('[PAGE] Agent still running after stream closed');
            setAgentStatus('running');
            setIsStreaming(false);
          }
        } catch (err) {
          console.error('[PAGE] Error checking agent status:', err);
          setAgentStatus('idle');
          setIsStreaming(false);
          
          // Handle any remaining streaming content
          if (streamContent) {
            console.log('[PAGE] Adding partial streaming content as message');
            const assistantMessage: ApiMessage = {
              role: 'assistant',
              content: streamContent + "\n\n[Connection to agent lost]",
              parsedContent: parsedStreamContent
            };
            setMessages(prev => [...prev, assistantMessage]);
            setStreamContent('');
            setParsedStreamContent([]);
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
            // Process messages to detect and parse XML-style tool calls
            const processedMessages = messagesData.map(message => {
              // Only process assistant messages with content
              if (message.role === 'assistant' && message.content) {
                try {
                  // Check if the message content contains XML tags
                  if (message.content.includes('<') && message.content.includes('>')) {
                    const parsedContent = parseStreamContent(message.content);
                    // Only add parsedContent if we found actual tool calls
                    if (parsedContent.some(part => typeof part !== 'string')) {
                      return { ...message, parsedContent };
                    }
                  }
                } catch (error) {
                  console.error('Error parsing message content:', error);
                }
              }
              return message;
            });
            
            setMessages(processedMessages);
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
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
      }
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
      
      // Send to the API
      await addMessage(threadId, userMessage);
      
      // If an agent is running, stop it first
      if (agentStatus === 'running' && agentRunId) {
        await stopAgent(agentRunId);
      }
      
      // Start a new agent run
      const result = await startAgent(threadId);
      setAgentRunId(result.agent_run_id);
      setAgentStatus('running');
      
      // Scroll to bottom when agent starts responding
      scrollToBottom();
      
      // Start streaming the agent's responses
      handleStreamAgent(result.agent_run_id);
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
      
      // Then stop the agent
      console.log('[PAGE] Sending stop request to backend');
      await stopAgent(agentRunId);
      
      // Update UI
      console.log('[PAGE] Agent stopped successfully');
      toast.info('Agent stopped');
      setAgentStatus('idle');
      
      // Create a new message that preserves the parsed content
      if (streamContent) {
        const assistantMessage: ApiMessage = {
          role: 'assistant',
          content: streamContent,
          parsedContent: parsedStreamContent
        };
        
        // Add the current message to the messages
        setMessages(prev => [...prev, assistantMessage]);
        
        // Then clear streaming content after a tiny delay
        setTimeout(() => {
          console.log('[PAGE] Clearing streaming content');
          setStreamContent('');
          setParsedStreamContent([]);
        }, 50);
      } else {
        // If no stream content, just fetch the messages
        console.log('[PAGE] Fetching final messages after stop');
        const messagesData = await getMessages(threadId) as unknown as ApiMessage[];
        
        // Process messages to detect and parse XML-style tool calls
        const processedMessages = messagesData.map(message => {
          // Only process assistant messages with content
          if (message.role === 'assistant' && message.content) {
            try {
              // Check if the message content contains XML tags
              if (message.content.includes('<') && message.content.includes('>')) {
                const parsedContent = parseStreamContent(message.content);
                // Only add parsedContent if we found actual tool calls
                if (parsedContent.some(part => typeof part !== 'string')) {
                  return { ...message, parsedContent };
                }
              }
            } catch (error) {
              console.error('Error parsing message content:', error);
            }
          }
          return message;
        });
        
        setMessages(processedMessages);
      }
    } catch (err) {
      console.error('[PAGE] Error stopping agent:', err);
      toast.error('Failed to stop agent');
      
      // Still update UI state to avoid being stuck
      setAgentStatus('idle');
      setIsStreaming(false);
      
      // Clear streaming content
      setStreamContent('');
      setParsedStreamContent([]);
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
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-center w-full'}`}
                  >
                    <div 
                      className={`${
                        message.role === 'user' 
                          ? 'max-w-[85%] rounded-lg px-4 py-3 bg-primary text-primary-foreground' 
                          : 'w-full text-left'
                      } text-sm`}
                    >
                      {message.role === 'user' ? (
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      ) : message.parsedContent ? (
                        <StreamContent 
                          content={message.content}
                          parsedContent={message.parsedContent}
                          isStreaming={false}
                        />
                      ) : message.type === 'tool_call' ? (
                        <div className="font-mono text-xs">
                          <div className="text-muted-foreground">Tool: {message.name}</div>
                          <div className="mt-1">{message.arguments}</div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {streamContent && (
                  <div 
                    ref={latestMessageRef}
                    className="flex justify-center w-full"
                  >
                    <div className="w-full text-sm text-left">
                      <StreamContent 
                        content={streamContent}
                        parsedContent={parsedStreamContent}
                        isStreaming={isStreaming}
                      />
                    </div>
                  </div>
                )}
                
                {agentStatus === 'running' && !streamContent && (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-1.5">
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