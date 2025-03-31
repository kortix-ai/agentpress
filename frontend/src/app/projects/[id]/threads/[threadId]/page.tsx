'use client';

import React from 'react';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Play, Square, Wifi, ChevronDown, ArrowDown } from 'lucide-react';
import { getProject, getThread, addMessage, getMessages, startAgent, stopAgent, getAgentStatus, streamAgent, getAgentRuns } from '@/lib/api';
import { toast } from 'sonner';

// Define a type for the params to make React.use() work properly
type ThreadParams = { id: string; threadId: string };

export default function ThreadPage({ params }: { params: ThreadParams }) {
  const unwrappedParams = React.use(params as any) as ThreadParams;
  const projectId = unwrappedParams.id;
  const threadId = unwrappedParams.threadId;
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState(0);
  const [isLatestMessageVisible, setIsLatestMessageVisible] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
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
        
        // Load project data
        const projectData = await getProject(projectId);
        setProject(projectData);
        
        // Load thread data
        const threadData = await getThread(threadId);
        setThread(threadData);
        
        // Load messages
        const messagesData = await getMessages(threadId);
        setMessages(messagesData);

        // Check for active agent runs
        await checkForActiveAgentRuns();
        
        // Mark that we've completed the initial load
        initialLoadCompleted.current = true;
      } catch (err: any) {
        console.error('Error loading thread data:', err);
        setError(err.message || 'Failed to load thread');
        toast.error('Failed to load thread data');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (user) {
      loadData();
    }

    // Cleanup function
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
      }
    };
  }, [projectId, threadId, user]);

  const checkForActiveAgentRuns = async () => {
    try {
      // Get agent runs for this thread using the proper API function
      const agentRuns = await getAgentRuns(threadId);
      
      // Look for running agent runs
      const activeRuns = agentRuns.filter(run => run.status === 'running');
      if (activeRuns.length > 0) {
        // Sort by start time to get the most recent
        activeRuns.sort((a, b) => 
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
        
        // Set the current agent run
        const latestRun = activeRuns[0];
        setAgentRunId(latestRun.id);
        setAgentStatus('running');
        
        // Start streaming only on initial page load
        console.log('Starting stream for active run on initial page load');
        handleStreamAgent(latestRun.id);
      }
    } catch (err) {
      console.error('Error checking for active runs:', err);
    }
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    
    try {
      // Add the message optimistically to the UI
      const userMessage = {
        role: 'user',
        content: newMessage
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
    } catch (err: any) {
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
      
      // Fetch final messages to get state from database
      console.log('[PAGE] Fetching final messages after stop');
      const updatedMessages = await getMessages(threadId);
      
      // Update messages first
      setMessages(updatedMessages);
      
      // Then clear streaming content after a tiny delay for smooth transition
      setTimeout(() => {
        console.log('[PAGE] Clearing streaming content');
        setStreamContent('');
      }, 50);
    } catch (err: any) {
      console.error('[PAGE] Error stopping agent:', err);
      toast.error('Failed to stop agent');
      
      // Still update UI state to avoid being stuck
      setAgentStatus('idle');
      setIsStreaming(false);
      
      // Clear streaming content
      setStreamContent('');
    }
  };

  const handleStreamAgent = (runId: string) => {
    // Clean up any existing stream
    if (streamCleanupRef.current) {
      console.log(`[PAGE] Cleaning up existing stream before starting new one`);
      streamCleanupRef.current();
      streamCleanupRef.current = null;
    }
    
    setIsStreaming(true);
    
    // Reset stream content when starting a new stream
    if (!streamContent) {
      setStreamContent('');
    }
    
    console.log(`[PAGE] Setting up stream for agent run ${runId}`);
    
    // Start streaming the agent's responses with improved implementation
    const cleanup = streamAgent(runId, {
      onMessage: (content: string) => {
        // Skip empty content chunks
        if (!content.trim()) return;
        
        // Improved stream update with requestAnimationFrame for smoother UI updates
        window.requestAnimationFrame(() => {
          setStreamContent(prev => prev + content);
        });
      },
      onToolCall: (name: string, args: any) => {
        console.log('[PAGE] Tool call received:', name, args);
      },
      onError: (error: any) => {
        console.error('[PAGE] Streaming error:', error);
        
        if (typeof error === 'object' && error.message) {
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
            
            // Keep the streaming content visible during transition
            // but mark that we're no longer actively streaming
            setIsStreaming(false);
            
            // Fetch final messages first, then clear streaming content
            console.log('[PAGE] Fetching final messages');
            const updatedMessages = await getMessages(threadId);
            
            // Clear cleanup reference to prevent reconnection
            streamCleanupRef.current = null;
            
            // Update messages first
            setMessages(updatedMessages);
            
            // Then clear streaming content after a tiny delay for smooth transition
            setTimeout(() => {
              console.log('[PAGE] Clearing streaming content');
              setStreamContent('');
            }, 50);
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
  };

  // Auto-focus on textarea when component loads
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // Adjust textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px
      textarea.style.height = `${newHeight}px`;
    };

    adjustHeight();
    
    // Adjust on window resize too
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [newMessage]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (newMessage.trim() && !isSending && agentStatus !== 'running') {
        handleSubmitMessage(e as any);
      }
    }
  };

  // Check if user has scrolled up from bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    
    // If we're scrolled up a significant amount and latest message isn't visible
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    
    if (isScrolledUp !== showScrollButton) {
      setShowScrollButton(isScrolledUp);
      setButtonOpacity(isScrolledUp ? 1 : 0);
    }
    
    // Track if user has manually scrolled
    if (isScrolledUp) {
      setUserHasScrolled(true);
    } else {
      // Reset user scroll state when they scroll back to bottom
      setUserHasScrolled(false);
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    // Only auto-scroll if:
    // 1. User hasn't manually scrolled up, or
    // 2. This is a new message sent by the user (but not during streaming)
    const isNewUserMessage = messages.length > 0 && messages[messages.length - 1]?.role === 'user';
    
    if ((!userHasScrolled && isLatestMessageVisible) || (isNewUserMessage && !isStreaming)) {
      scrollToBottom();
    }
  }, [messages, streamContent, isLatestMessageVisible, userHasScrolled, isStreaming]);

  // Scroll to bottom explicitly when user sends a message
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    if (behavior === 'instant' || behavior === 'auto') {
      setUserHasScrolled(false);
    }
  };

  // Setup intersection observer to detect if latest message is visible
  useEffect(() => {
    if (!latestMessageRef.current || messages.length === 0) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Ensure we're setting a boolean value, not null
        setIsLatestMessageVisible(entry.isIntersecting === true);
      },
      {
        root: messagesContainerRef.current,
        threshold: 0.1, // 10% of the element needs to be visible
      }
    );
    
    observer.observe(latestMessageRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [messages, streamContent]);

  // Update scroll button visibility based on latest message visibility and scroll position
  useEffect(() => {
    const shouldShowButton = !isLatestMessageVisible || 
      (messagesContainerRef.current && 
       messagesContainerRef.current.scrollHeight - 
       messagesContainerRef.current.scrollTop - 
       messagesContainerRef.current.clientHeight > 100);
    
    // Fix the linter error by ensuring we pass a boolean
    setShowScrollButton(!!shouldShowButton);
    setButtonOpacity(shouldShowButton ? 1 : 0);
  }, [isLatestMessageVisible]);

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
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[80vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl text-red-800 font-medium mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  const projectName = project?.name || 'Loading...';

  // Make sure clicking the scroll button resets user scroll state
  const handleScrollButtonClick = () => {
    scrollToBottom();
    setUserHasScrolled(false);
  };

  return (
    <div className="container mx-auto p-6 flex flex-col h-[calc(100vh-64px)]">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline">
            <h1 className="text-2xl font-bold">{projectName}</h1>
            <div className="mx-2 text-zinc-300">•</div>
            <div className="text-zinc-500 text-sm">Thread {thread?.thread_id ? thread.thread_id.slice(0, 8) : '...'}</div>
          </div>
                    
          <div className="flex items-center text-zinc-700 border border-zinc-200 py-1 px-2.5 rounded-full shadow-sm bg-white">
            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-xs font-medium">{isStreaming ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 bg-gray-50 rounded-lg overflow-y-auto mb-4 border relative" 
        onScroll={handleScroll}
      >
        <div className="p-4 min-h-full flex flex-col">
          {messages.length === 0 && !streamContent ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-8 px-4 max-w-md mx-auto">
                <p className="text-zinc-500 mb-1">Send a message to start the conversation.</p>
                <p className="text-zinc-400 text-xs">The AI agent will respond automatically.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  ref={index === messages.length - 1 && message.role === 'assistant' ? latestMessageRef : null}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
                      message.role === 'user' 
                        ? 'bg-zinc-900 text-white rounded-br-none' 
                        : 'bg-white border border-zinc-100 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm break-words overflow-hidden">{message.content}</div>
                  </div>
                </div>
              ))}
              
              {/* Streaming content with improved rendering */}
              {streamContent && (
                <div 
                  ref={latestMessageRef}
                  className="flex justify-start"
                >
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl shadow-sm bg-white border border-zinc-100 rounded-bl-none">
                    <div className="whitespace-pre-wrap text-sm break-words overflow-hidden">
                      {streamContent}
                      {isStreaming && (
                        <span className="inline-flex items-center ml-0.5">
                          <span 
                            className="inline-block h-4 w-0.5 bg-zinc-800 mx-px"
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
              
              {/* Create space for agent response when running */}
              {agentStatus === 'running' && !streamContent && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] pl-6 rounded-2xl shadow-sm bg-white border border-zinc-100 rounded-bl-none min-h-[2.5rem] min-w-[5rem]">
                    <div className="flex items-center justify-start h-full w-full space-x-1">
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse delay-150"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse delay-300"></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Invisible element at the end to scroll to */}
              <div ref={messagesEndRef} />
              
              {/* Extra space at the bottom with smoother transitions */}
              <div 
                className="transition-all duration-700 ease-in-out" 
                style={{ 
                  height: (isStreaming || agentStatus === 'running') ? '20px' : '20px',
                  opacity: (isStreaming || agentStatus === 'running') ? 1 : 0.5
                }}
              />
            </div>
          )}
        </div>
        
        {/* Scroll to bottom button - improved UI with smooth animation */}
        <div 
          className="sticky bottom-6 w-full flex justify-center pointer-events-none"
          style={{ 
            marginTop: '-60px',
            opacity: buttonOpacity,
            transition: 'opacity 0.3s ease-in-out',
            visibility: showScrollButton ? 'visible' : 'hidden'
          }}
        >
          <div className="bg-zinc-900/90 backdrop-blur-sm rounded-full shadow-lg p-2.5 flex items-center justify-center hover:bg-black transition-all duration-200 transform hover:scale-105 cursor-pointer pointer-events-auto" onClick={handleScrollButtonClick}>
            <ArrowDown className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitMessage} className="flex gap-2 items-end relative">
        <Textarea
          ref={textareaRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            agentStatus === 'running' 
              ? "Agent is thinking..." 
              : "Type your message... (Enter to send, Shift+Enter for new line)"
          }
          className="flex-1 min-h-[50px] max-h-[200px] pr-12 resize-none py-3 shadow-sm focus-visible:ring-zinc-500 rounded-xl"
          disabled={isSending || agentStatus === 'running'}
          rows={1}
        />
        
        <Button 
          type={agentStatus === 'running' ? 'button' : 'submit'}
          onClick={agentStatus === 'running' ? handleStopAgent : undefined}
          className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full bg-zinc-900 hover:bg-black"
          disabled={(!newMessage.trim() && agentStatus !== 'running') || isSending}
          aria-label={agentStatus === 'running' ? 'Stop agent' : 'Send message'}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : agentStatus === 'running' ? (
            <Square className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Status indicator with improved spacing and styling */}
      <div className="h-6 mt-2">
        {agentStatus === 'running' && (
          <div className="flex items-center justify-center gap-1.5">
            <div className="text-xs text-zinc-500 flex items-center gap-1.5">
              {isStreaming ? (
                <>
                  <span className="inline-flex items-center">
                    <span className="relative flex h-2 w-2 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Agent is responding
                  </span>
                  <span className="font-normal border-l border-zinc-200 pl-1.5 ml-0.5 text-zinc-400">
                    Press <kbd className="inline-flex items-center justify-center p-0.5 bg-zinc-100 border border-zinc-200 rounded text-zinc-600"><Square className="h-2.5 w-2.5" /></kbd> to stop
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Agent is thinking...
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 