import { StreamedContent } from '@/hooks/useStreamParser';
import { FileText, Wrench, Terminal } from 'lucide-react';

interface StreamContentProps {
  content: StreamedContent;
  isStreaming: boolean;
}

export function StreamContent({ content, isStreaming }: StreamContentProps) {
  const { text, toolCalls, fileCreations } = content;
  
  // Debug logging
  console.log('[STREAM COMPONENT] Rendering with:', { 
    textLength: text.length, 
    toolCallsCount: toolCalls.length, 
    fileCreationsCount: fileCreations.length 
  });
  
  // If there's some content but nothing is visible, log it
  if ((text.length > 0 || toolCalls.length > 0 || fileCreations.length > 0) && 
      text.trim() === '' && toolCalls.length === 0 && fileCreations.length === 0) {
    console.warn('[STREAM COMPONENT] Has content but nothing to render:', { 
      textSample: text.substring(0, 100),
      toolCalls,
      fileCreations
    });
  }
  
  // Combine all items (text, tool calls, file creations) and sort by index
  const allItems = [
    ...toolCalls.map(tool => ({
      type: 'tool' as const,
      content: tool,
      index: tool.index
    })),
    ...fileCreations.map(file => ({
      type: 'file' as const,
      content: file,
      index: file.index
    }))
  ].sort((a, b) => a.index - b.index);
  
  return (
    <div className="whitespace-pre-wrap break-words">
      {/* Regular text content */}
      {text && <p>{text}</p>}
      
      {/* Tool calls and file creations */}
      {allItems.map((item, idx) => (
        <div key={idx} className="mt-2 mb-3">
          {item.type === 'tool' && (
            <div className="rounded bg-background/50 p-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium mb-1">
                <Wrench className="h-3 w-3" />
                <span>Tool: {item.content.name || 'unnamed'}</span>
              </div>
              <div className="font-mono text-xs mt-1 pl-2 border-l-2 border-muted-foreground/20">
                {item.content.arguments}
              </div>
            </div>
          )}
          
          {item.type === 'file' && (
            <div className="rounded bg-background/50 p-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium mb-1">
                <FileText className="h-3 w-3" /> 
                <span>Creating file: {item.content.path}</span>
              </div>
              {item.content.content && (
                <div className="font-mono text-xs mt-1 pl-2 border-l-2 border-muted-foreground/20 max-h-24 overflow-y-auto">
                  {item.content.content.split('\n').slice(0, 3).join('\n')}
                  {item.content.content.split('\n').length > 3 && (
                    <div className="text-muted-foreground">... (content truncated)</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      
      {/* Debug info - hidden in production */}
      {process.env.NODE_ENV !== 'production' && !text && toolCalls.length === 0 && fileCreations.length === 0 && (
        <div className="text-xs text-muted-foreground border border-dashed border-muted-foreground/20 p-2 rounded">
          No content to display yet. Status: {isStreaming ? 'Streaming' : 'Idle'}
        </div>
      )}
      
      {/* Cursor */}
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