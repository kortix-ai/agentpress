import React from 'react';
import { ParsedPart, ParsedToolCall } from '@/lib/parser';
import { ToolCall } from '@/components/tool-call';

interface StreamContentProps {
  content: string;
  parsedContent: ParsedPart[];
  isStreaming: boolean;
}

export function StreamContent({ content, parsedContent, isStreaming }: StreamContentProps) {
  // If no parsed content or it's only a single string, render as plain text
  if (!parsedContent.length || (parsedContent.length === 1 && typeof parsedContent[0] === 'string')) {
    return (
      <div className="whitespace-pre-wrap break-words">
        {content}
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
    );
  }

  // Otherwise, render the parsed content with tool calls
  return (
    <div className="space-y-2">
      {parsedContent.map((part, index) => {
        if (typeof part === 'string') {
          return <div key={`text-${index}`} className="whitespace-pre-wrap break-words">{part}</div>;
        } else {
          const toolCall = part as ParsedToolCall;
          return (
            <ToolCall 
              key={`tool-${index}`}
              name={toolCall.name}
              arguments={toolCall.arguments}
              content={toolCall.content}
              state={toolCall.state}
              type="tool_call"
            />
          );
        }
      })}
      
      {isStreaming && (
        <span className="inline-flex items-center ml-0.5">
          <span 
            className="inline-block h-4 w-0.5 bg-foreground/50 mx-px"
            style={{ 
              opacity: 0.7,
              animation: 'cursorBlink 1s ease-in-out infinite',
            }}
          />
        </span>
      )}
    </div>
  );
} 