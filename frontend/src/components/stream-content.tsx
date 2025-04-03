import React from 'react';
import { ParsedPart, ParsedToolCall } from '@/lib/parser';
import { ToolCall } from '@/components/tool-call';
import { InlineToolCall } from '@/components/inline-tool-call';
import { useTheme } from 'next-themes';
import { useView } from '@/context/view-context';
import Image from 'next/image';

interface StreamContentProps {
  content: string;
  parsedContent: ParsedPart[];
  isStreaming: boolean;
}

export function StreamContent({ content, parsedContent, isStreaming }: StreamContentProps) {
  const { theme } = useTheme();
  const { isDualView } = useView();
  const logoInverted = theme === 'dark';

  // Function to handle "View Details" button click
  const handleViewToolDetails = (toolIndex: number) => {
    // Post message to the parent to display this tool in the secondary panel
    window.postMessage({
      type: 'STREAM_UPDATE',
      content,
      isStreaming,
      selectedTool: toolIndex
    }, '*');
  };

  // Outside the map function, extract all tool calls once
  const toolCalls = parsedContent.filter(part => typeof part !== 'string') as ParsedToolCall[];

  // If no parsed content or it's only a single string, render as plain text
  if (!parsedContent.length || (parsedContent.length === 1 && typeof parsedContent[0] === 'string')) {
    return (
      <div className="whitespace-pre-wrap break-words">
        <div className="flex items-center mb-2">
          <Image 
            src="/kortix-logo.svg" 
            alt="Kortix" 
            width={80} 
            height={15} 
            className={logoInverted ? "invert" : ""}
          />
        </div>
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
      <div className="flex items-center mb-2">
        <Image 
          src="/kortix-logo.svg" 
          alt="Kortix" 
          width={80} 
          height={15} 
          className={logoInverted ? "invert" : ""}
        />
      </div>
      {parsedContent.map((part, index) => {
        if (typeof part === 'string') {
          return <div key={`text-${index}`} className="whitespace-pre-wrap break-words">{part}</div>;
        } else {
          const toolCall = part as ParsedToolCall;
          
          // Use compact inline tool call in dual view mode
          if (isDualView) {
            // Find this tool call's index in the toolCalls array 
            const toolCallIndex = toolCalls.indexOf(toolCall);
            
            return (
              <InlineToolCall
                key={`tool-${index}`}
                name={toolCall.name}
                arguments={toolCall.arguments}
                index={toolCallIndex}
                state={toolCall.state}
                onViewDetails={handleViewToolDetails}
              />
            );
          }
          
          // Use full tool call in single view mode
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