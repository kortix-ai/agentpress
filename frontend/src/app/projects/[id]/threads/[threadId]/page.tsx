'use client';

import React from 'react';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Play, Square, Wifi } from 'lucide-react';
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
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
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


  // Handle user sending a message
  const handleUserMessageSent = () => {
    // Create space for agent response
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  };

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
      
      // Scroll to bottom after sending message (ChatGPT style)
      handleUserMessageSent();
      
      // Clear the input
      setNewMessage('');
      
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
      
      // Start streaming the agent's responses
      handleStreamAgent(result.agent_run_id);
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleStartAgent = async () => {
    try {
      console.log('[PAGE] Starting new agent run');
      
      // Reset the streaming content
      setStreamContent('');
      
      // Start the agent
      const result = await startAgent(threadId);
      console.log(`[PAGE] Agent started with run ID: ${result.agent_run_id}`);
      
      setAgentRunId(result.agent_run_id);
      setAgentStatus('running');
      toast.success('Agent started');
      
      // Create visual space for agent response
      handleUserMessageSent();
      
      // Start streaming the agent's responses
      handleStreamAgent(result.agent_run_id);
    } catch (err: any) {
      console.error('[PAGE] Error starting agent:', err);
      toast.error('Failed to start agent');
      setAgentStatus('idle');
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
    
    // Start streaming the agent's responses
    const cleanup = streamAgent(runId, {
      onMessage: (content: string) => {
        // Skip empty content chunks
        if (!content.trim()) return;
        
        // Immediately append content as it arrives without forcing scroll
        setStreamContent(prev => prev + content);
        
        // Never auto-scroll during streaming - let user control scrolling
        // This ensures user can freely scroll up and down during streaming
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

  if (isAuthLoading || isLoading) {
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

  if (!project || !thread) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 flex flex-col h-[calc(100vh-64px)]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-gray-500">Thread {thread.thread_id.slice(0, 8)}</p>
        </div>
        <div className="flex gap-2 items-center">
          {isStreaming && (
            <div className="flex items-center text-green-600 text-sm mr-2">
              <Wifi className="h-4 w-4 mr-1 animate-pulse" />
              <span>Streaming</span>
            </div>
          )}
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            Back to Project
          </Button>
          {agentStatus === 'idle' ? (
            <Button onClick={handleStartAgent}>
              <Play className="h-4 w-4 mr-2" />
              Run Agent
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleStopAgent}>
              <Square className="h-4 w-4 mr-2" />
              Stop Agent
            </Button>
          )}
        </div>
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto mb-4 border relative"
      >
        {messages.length === 0 && !streamContent ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Send a message to start the conversation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            
            {/* Streaming content */}
            {streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-2 rounded-lg bg-white border border-gray-200 rounded-bl-none">
                  <div className="whitespace-pre-wrap">
                    {streamContent}
                    {isStreaming && <span className="animate-pulse">▌</span>}
                  </div>
                </div>
              </div>
            )}
            
            {/* Create space for agent response when running */}
            {agentStatus === 'running' && !streamContent && (
              <div className="min-h-[calc(100vh-400px)]" />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
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
          className="flex-1 min-h-[50px] max-h-[200px] pr-12 resize-none py-3 shadow-sm focus-visible:ring-blue-500"
          disabled={isSending || agentStatus === 'running'}
          rows={1}
        />
        
        {agentStatus === 'running' ? (
          <Button 
            type="button"
            onClick={handleStopAgent}
            className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full bg-red-500 hover:bg-red-600"
            aria-label="Stop agent"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="submit"
            className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full"
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        )}
      </form>

      {/* Fixed height container to prevent layout shifts */}
      <div className="h-5 mt-1">
        {agentStatus === 'running' && (
          <div className="text-xs text-gray-500 text-center">
            Agent is responding... Click the stop button to interrupt.
          </div>
        )}
      </div>
    </div>
  );
} 