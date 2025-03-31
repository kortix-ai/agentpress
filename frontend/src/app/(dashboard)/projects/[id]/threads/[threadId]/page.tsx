'use client';

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getProject, getThread, addMessage, getMessages, startAgent, stopAgent, getAgentStatus, streamAgent } from '@/lib/api';
import { toast } from 'sonner';
import { Thread, Message, ThreadPageProps } from '@/lib/types';
import { ThreadLayout } from '@/components/thread/thread-layout';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';

export default function ThreadPage({ params }: ThreadPageProps) {
  const unwrappedParams = React.use(params as any) as ThreadPageProps['params'];
  const projectId = unwrappedParams.id;
  const threadId = unwrappedParams.threadId;
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState(0);
  
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const initialLoadCompleted = useRef<boolean>(false);

  useEffect(() => {
    async function loadData() {
      if (!initialLoadCompleted.current) {
        setIsLoading(true);
      }
      
      setError(null);
      
      try {
        if (!projectId || !threadId) {
          throw new Error('Invalid project or thread ID');
        }
        
        const [projectData, threadData, messagesData] = await Promise.all([
          getProject(projectId),
          getThread(threadId),
          getMessages(threadId)
        ]);
        
        setProject(projectData);
        setThread(threadData as Thread);
        setMessages(messagesData as Message[]);
        
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

    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
      }
    };
  }, [projectId, threadId, user]);

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    
    try {
      const userMessage: Message = {
        role: 'user',
        content: newMessage
      };
      
      setMessages(prev => [...prev, userMessage]);
      setNewMessage('');
      scrollToBottom();
      
      await addMessage(threadId, userMessage);
      
      if (agentStatus === 'running') {
        await stopAgent(threadId);
      }
      
      const result = await startAgent(threadId);
      setAgentStatus('running');
      scrollToBottom();
      
      handleStreamAgent(result.agent_run_id);
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleStopAgent = async () => {
    try {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
      
      setIsStreaming(false);
      await stopAgent(threadId);
      
      toast.info('Agent stopped');
      setAgentStatus('idle');
      
      const updatedMessages = await getMessages(threadId);
      setMessages(updatedMessages as Message[]);
      
      setTimeout(() => {
        setStreamContent('');
      }, 50);
    } catch (err: any) {
      console.error('Error stopping agent:', err);
      toast.error('Failed to stop agent');
      
      setAgentStatus('idle');
      setIsStreaming(false);
      setStreamContent('');
    }
  };

  const handleStreamAgent = (runId: string) => {
    setIsStreaming(true);
    setStreamContent('');
    
    const cleanup = streamAgent(runId, {
      onMessage: (content) => {
        setStreamContent(prev => prev + content);
        scrollToBottom();
      },
      onToolCall: () => {},
      onError: (error) => {
        console.error('Stream error:', error);
        toast.error('Error receiving agent response');
        setIsStreaming(false);
        setAgentStatus('idle');
        setStreamContent('');
      },
      onClose: async () => {
        setIsStreaming(false);
        setAgentStatus('idle');
        
        const updatedMessages = await getMessages(threadId);
        setMessages(updatedMessages as Message[]);
        
        setTimeout(() => {
          setStreamContent('');
        }, 50);
      }
    });
    
    streamCleanupRef.current = cleanup;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowScrollButton(!isAtBottom);
    setButtonOpacity(isAtBottom ? 0 : 1);
  };

  const handleScrollButtonClick = () => {
    scrollToBottom();
  };

  if (isLoading) {
    return (
      <div className="flex-1 h-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-3xl mx-auto">
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start space-x-2.5 animate-pulse">
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-16 mb-2" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-5/6 mb-1" />
                        <Skeleton className="h-4 w-4/6" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-border">
              <div className="max-w-3xl mx-auto px-6 sm:px-12">
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full p-6">
        <div className="w-full max-w-md bg-destructive/10 border border-destructive/20 rounded-lg p-8 text-center">
          <h2 className="text-base font-medium text-destructive mb-2">Error Loading Conversation</h2>
          <p className="text-sm text-destructive/80 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={() => router.push(`/projects/${projectId}`)}>
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
    <ThreadLayout
      projectName={project.name}
      projectId={projectId}
      messages={messages}
      streamContent={streamContent}
      isStreaming={isStreaming}
      agentStatus={agentStatus}
      isSending={isSending}
      newMessage={newMessage}
      onNewMessageChange={setNewMessage}
      onSubmitMessage={handleSubmitMessage}
      onStopAgent={handleStopAgent}
      messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
      messagesContainerRef={messagesContainerRef as React.RefObject<HTMLDivElement>}
      latestMessageRef={latestMessageRef as React.RefObject<HTMLDivElement>}
      showScrollButton={showScrollButton}
      buttonOpacity={buttonOpacity}
      onScrollButtonClick={handleScrollButtonClick}
      onScroll={handleScroll}
    />
  );
} 