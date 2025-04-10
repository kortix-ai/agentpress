'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useAgentStatus } from '@/context/agent-status-context';
import { Button } from '@/components/ui/button';
import { ArrowDown, PlusCircle} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { ChatInput } from '@/components/chat-input';
import SecondaryView from '@/components/secondary-view';
import ChatMessage from '@/components/threads/ChatMessage';
import StreamingMessage from '@/components/threads/StreamingMessage';
import ThinkingIndicator from '@/components/threads/ThinkingIndicator';
import { useChatThread } from '@/hooks/useChatThread';
import { useScrollManager } from '@/hooks/useScrollManager';
import { useMessageEditor } from '@/hooks/useMessageEditor';
import { useToolExecutions } from '@/hooks/useToolExecutions';

// Define a type for the params to make React.use() work properly
type ThreadParams = { id: string; threadId: string };

export default function ThreadPage({ params }: { params: Promise<ThreadParams> }) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.id;
  const threadId = unwrappedParams.threadId;
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const { setIsStreaming: setGlobalIsStreaming, setAgentStatus: setGlobalAgentStatus } = useAgentStatus();
  const router = useRouter();
  
  // Use the chat thread hook
  const {
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
  } = useChatThread({ threadId });
  
  // Add state for the input message
  const [inputMessage, setInputMessage] = useState('');
  
  // Use the scroll manager hook
  const {
    messagesEndRef,
    messagesContainerRef,
    showScrollButton,
    buttonOpacity,
    userHasScrolled,
    scrollToBottom,
    handleScroll,
    handleScrollButtonClick
  } = useScrollManager();
  
  // Use the message editor hook
  const {
    editingMessageIndex,
    editedContent,
    editRef,
    messageRefs,
    overlayTop,
    handleEditMessage: baseHandleEditMessage,
    handleCancelEdit,
    handleSubmitEdit,
    setEditedContent,
    updateOverlayOnScroll
  } = useMessageEditor({ messagesContainerRef });
  
  // Use the tool executions hook
  const {
    isSecondaryViewOpen,
    setIsSecondaryViewOpen,
    selectedToolExecution,
    setSelectedToolExecution,
    historicalToolExecutions,
    handleToolClick,
    streamingToolCall
  } = useToolExecutions({
    messages,
    toolCallData,
    streamContent
  });
  
  // Create a custom handleEditMessage that sets content too
  const handleEditMessage = useCallback((index: number) => {
    if (messages[index].role === 'user') {
      setEditedContent(messages[index].content);
      baseHandleEditMessage(index);
    }
  }, [messages, baseHandleEditMessage, setEditedContent]);
  
  // Add the onScroll callback to include overlay update
  useEffect(() => {
    // Customize the scroll handler to also update overlay position
    if (editingMessageIndex !== null) {
      updateOverlayOnScroll();
    }
  }, [editingMessageIndex, updateOverlayOnScroll]);

  // Update global context when local state changes
  useEffect(() => {
    // Sync streaming state
    setGlobalIsStreaming(isStreaming);
    
    // Sync agent status with compatible mapping
    if (agentStatus === 'running') {
      setGlobalAgentStatus('running');
    } else {
      // Map both 'idle' and 'paused' to global 'idle'
      setGlobalAgentStatus('idle');
    }
  }, [isStreaming, agentStatus, setGlobalIsStreaming, setGlobalAgentStatus]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isAuthLoading, router]);

  // Auto-scroll only when:
  // 1. User sends a new message
  // 2. Agent starts responding
  // 3. User clicks the scroll button
  useEffect(() => {
    const isNewUserMessage = messages.length > 0 && messages[messages.length - 1]?.role === 'user';
    
    if ((isNewUserMessage || agentStatus === 'running') && !userHasScrolled) {
      scrollToBottom();
    }
  }, [messages, agentStatus, userHasScrolled, scrollToBottom]);

  // Update UI states when agent status changes
  useEffect(() => {
    // Scroll to bottom when agent starts responding, but only if user hasn't scrolled up manually
    if (agentStatus === 'running' && !userHasScrolled) {
      scrollToBottom();
    }
  }, [agentStatus, userHasScrolled, scrollToBottom]);
  
  // Handle sending the message
  const handleSendMessage = (message: string) => {
    sendMessage(message);
    setInputMessage(''); // Clear the input after sending
  };

  // Only show a full-screen loader on the very first load
  if (isAuthLoading || isLoading) {
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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-1 w-full h-full">
        {/* Left side: Chat UI */}
        <div className={`${isSecondaryViewOpen ? 'w-3/5' : 'w-full'} border-r border-zinc-100 relative transition-all duration-300`}>
          <div 
            ref={messagesContainerRef}
            className="absolute inset-0 overflow-y-auto px-4 py-4 pb-[5.5rem]" 
            onScroll={handleScroll}
          >
            <div className="mx-auto max-w-2xl">
              {messages.length === 0 && !streamContent ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <p className="text-sm text-muted-foreground">Send a message to start the conversation.</p>
                    <p className="text-xs text-muted-foreground/60">The AI agent will respond automatically.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0 relative">
                  {/* Overlay when editing */}
                  {editingMessageIndex !== null && overlayTop !== null && (
                    <div 
                      className="absolute left-0 right-0 bottom-0 bg-background/60 z-10 transition-all duration-300"
                      style={{
                        top: `${overlayTop}px`
                      }}
                      onClick={handleCancelEdit} // Allow clicking the overlay to cancel
                    />
                  )}
                  
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={index} 
                      message={message}
                      index={index}
                      messageRef={(el) => {
                        // Store references to message elements
                        messageRefs.current[index] = el;
                      }}
                      editingMessageIndex={editingMessageIndex}
                      editedContent={editedContent}
                      editRef={editRef as React.RefObject<HTMLTextAreaElement>}
                      handleEditMessage={handleEditMessage}
                      handleCancelEdit={handleCancelEdit}
                      handleSubmitEdit={handleSubmitEdit}
                      setEditedContent={setEditedContent}
                      handleToolClick={handleToolClick}
                    />
                  ))}
                  
                  {streamContent && (
                    <div className="flex justify-start">
                      <StreamingMessage 
                        streamContent={streamContent}
                        isStreaming={isStreaming}
                        toolCallData={toolCallData}
                      />
                    </div>
                  )}
                  
                  {agentStatus === 'running' && !streamContent && (
                    <ThinkingIndicator />
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
                {!isSecondaryViewOpen && (
                  <div 
                    className="absolute left-5 -top-17 h-20 w-36 bg-zinc-200 rounded-md border border-zinc-300 flex items-center justify-center cursor-pointer hover:bg-zinc-300 transition-colors"
                    onClick={() => setIsSecondaryViewOpen(prev => !prev)}
                  >
                    <PlusCircle className="h-6 w-6 text-zinc-600 mr-2" />
                    <span className="text-sm text-zinc-600">Show Panel</span>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <div className="h-1 w-8 rounded-full bg-zinc-200"></div>
                  <div className="h-1 w-12 rounded-full bg-muted-foreground/30"></div>
                  <div className="h-1 w-8 rounded-full bg-muted-foreground/20"></div>
                </div>
              </div>
              
              <ChatInput
                value={inputMessage}
                onChange={setInputMessage}
                onSubmit={handleSendMessage}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                loading={isSending}
                disabled={isSending}
                isAgentRunning={agentStatus === 'running'}
                onStopAgent={stopCurrentAgent}
                autoFocus={!isLoading}
              />
            </div>
          </div>
        </div>

        {/* Right side: Secondary View */}
        {isSecondaryViewOpen && (
          <div className="w-2/5 p-4 flex flex-col">
            <SecondaryView 
              onClose={() => setIsSecondaryViewOpen(false)} 
              selectedTool={selectedToolExecution || undefined}
              toolExecutions={historicalToolExecutions}
              onSelectTool={(id) => {
                // Find and select a specific tool execution
                const tool = historicalToolExecutions.find(t => t.id === id);
                if (tool) {
                  setSelectedToolExecution(tool);
                }
              }}
              streamingToolCall={streamingToolCall}
            />
          </div>
        )}
      </div>
    </div>
  );
}