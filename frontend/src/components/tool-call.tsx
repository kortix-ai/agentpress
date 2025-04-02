import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Code, Terminal } from 'lucide-react';

interface ToolCallProps {
  name?: string;
  arguments?: Record<string, string>;
  content?: string;
  type?: 'content' | 'tool_call';
  state?: 'processing' | 'complete';
}

export function ToolCall({ name, arguments: args, content, state = 'complete' }: ToolCallProps) {
  // Format the attributes for display
  const formattedArgs = args 
    ? Object.entries(args).map(([key, value]) => `${key}="${value}"`).join(' ')
    : '';
    
  // Determine icon based on tool name
  const getIcon = () => {
    const toolName = name?.toLowerCase() || '';
    if (toolName.includes('create') || toolName.includes('file')) {
      return <Code className="h-4 w-4 mr-1" />;
    }
    if (toolName.includes('execute') || toolName.includes('command')) {
      return <Terminal className="h-4 w-4 mr-1" />;
    }
    return null;
  };
  
  return (
    <Card className={`w-full my-2 border ${state === 'processing' ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/10' : 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10'}`}>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {state === 'processing' ? (
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
          ) : (
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
          )}
          <div className="flex items-center">
            {state === 'processing' ? 'Running' : 'Completed'}:
            <div className="ml-2 flex items-center">
              {getIcon()}
              <code className="font-mono text-xs bg-muted p-1 rounded">
                &lt;{name}{formattedArgs ? ' ' + formattedArgs : ''}&gt;
              </code>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3 text-xs">
        {content && (
          <Collapsible className="w-full" defaultOpen={true}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium hover:underline mb-1">
              <ChevronDown className="h-3 w-3" />
              {state === 'processing' ? 'Partial content' : 'Content'}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="p-2 rounded bg-background whitespace-pre-wrap break-words overflow-auto max-h-[400px] overflow-y-auto">{content}</pre>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
} 