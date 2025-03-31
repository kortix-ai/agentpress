import React from 'react';
import { Message } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  streamContent?: string;
  isStreaming?: boolean;
  agentStatus: 'idle' | 'running' | 'paused';
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  latestMessageRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({
  messages,
  streamContent,
  isStreaming,
  agentStatus,
  messagesEndRef,
  latestMessageRef,
}: MessageListProps) {
  return (
    <div className="space-y-8">
      {messages.map((message, index) => (
        <div
          key={index}
          ref={index === messages.length - 1 && message.role === 'assistant' ? latestMessageRef : null}
          className="w-full group"
        >
          <div className="flex items-start space-x-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium">
                {message.role === 'user' ? 'You' : 'AI'}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium mb-1.5">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </p>
              <div className="whitespace-pre-wrap text-sm break-words">
                {message.content}
              </div>
            </div>
          </div>

          {message.role === 'assistant' && (
            <div className="pl-10 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={() => navigator.clipboard.writeText(message.content)}
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Streaming content */}
      {streamContent && (
        <div ref={latestMessageRef} className="w-full">
          <div className="flex items-start space-x-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium">AI</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium mb-1.5">Assistant</p>
              <div className="whitespace-pre-wrap text-sm break-words">
                {streamContent}
                {isStreaming && (
                  <span className="inline-flex items-center ml-0.5">
                    <span
                      className="inline-block h-4 w-0.5 bg-foreground mx-px"
                      style={{
                        opacity: 0.7,
                        animation: 'cursorBlink 1s ease-in-out infinite',
                      }}
                    />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent typing indicator */}
      {agentStatus === 'running' && !streamContent && (
        <div className="w-full">
          <div className="flex items-start space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium">AI</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-1.5">Assistant</p>
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-pulse"></div>
                <div className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-pulse delay-150"></div>
                <div className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-pulse delay-300"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
} 