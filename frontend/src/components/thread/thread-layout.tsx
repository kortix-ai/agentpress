import React from 'react';
import { MessageList } from './message-list';
import { EmptyState } from './empty-state';
import { ScrollButton } from './scroll-button';
import { ChatInput } from '@/components/chat-input';
import { Message } from '@/lib/types';

interface ThreadLayoutProps {
  projectName: string;
  projectId: string;
  messages: Message[];
  streamContent?: string;
  isStreaming?: boolean;
  agentStatus: 'idle' | 'running' | 'paused';
  isSending: boolean;
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSubmitMessage: (e: React.FormEvent) => void;
  onStopAgent: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  latestMessageRef: React.RefObject<HTMLDivElement | null>;
  showScrollButton: boolean;
  buttonOpacity: number;
  onScrollButtonClick: () => void;
  onScroll: () => void;
}

export function ThreadLayout({
  projectName,
  projectId,
  messages,
  streamContent,
  isStreaming,
  agentStatus,
  isSending,
  newMessage,
  onNewMessageChange,
  onSubmitMessage,
  onStopAgent,
  messagesEndRef,
  messagesContainerRef,
  latestMessageRef,
  showScrollButton,
  buttonOpacity,
  onScrollButtonClick,
  onScroll,
}: ThreadLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div 
            className="h-full py-4 px-6 sm:px-12"
            ref={messagesContainerRef}
            onScroll={onScroll}
          >
            <div className="max-w-3xl mx-auto">
              {messages.length === 0 ? (
                <EmptyState />
              ) : (
                <MessageList
                  messages={messages}
                  streamContent={streamContent}
                  isStreaming={isStreaming}
                  agentStatus={agentStatus}
                  messagesEndRef={messagesEndRef}
                  latestMessageRef={latestMessageRef}
                />
              )}
            </div>
          </div>
        </div>
        
        <ScrollButton
          show={showScrollButton}
          opacity={buttonOpacity}
          onClick={onScrollButtonClick}
        />
      </div>

      <div className="h-8 bg-gradient-to-t from-background to-transparent relative z-10 pointer-events-none"></div>

      <div className="pt-2 pb-3">
        <div className="max-w-3xl mx-auto px-6 sm:px-12">
          <ChatInput
            onSubmit={(message) => {
              const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
              onNewMessageChange(message);
              onSubmitMessage(fakeEvent);
            }}
            value={newMessage}
            onChange={onNewMessageChange}
            loading={isSending}
            disabled={isSending}
            isAgentRunning={agentStatus === 'running'}
            onStopAgent={onStopAgent}
            placeholder="Message the AI..."
          />
        </div>
      </div>
    </div>
  );
} 