import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CodePreview } from './code-preview';
import { TerminalView } from './terminal-view';
import { Button } from '@/components/ui/button';

interface ToolCallProps {
  name?: string;
  arguments?: Record<string, string>;
  content?: string;
  type?: 'content' | 'tool_call';
  state?: 'processing' | 'complete';
}

// New component for string replacement visualization
interface TextDiffViewProps {
  filePath: string;
  oldStr: string;
  newStr: string;
}

function TextDiffView({ filePath, oldStr, newStr }: TextDiffViewProps) {
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-neutral-100 dark:bg-neutral-900 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <span className="font-medium text-sm">{filePath}</span>
      </div>
      <div className="p-4 bg-neutral-50 dark:bg-neutral-900">
        <div className="mb-3">
          <div className="text-xs text-neutral-500 mb-1">Replacing:</div>
          <div className="p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded text-red-700 dark:text-red-300 font-mono text-sm">
            {oldStr}
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 mb-1">With:</div>
          <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded text-green-700 dark:text-green-300 font-mono text-sm">
            {newStr}
          </div>
        </div>
      </div>
    </div>
  );
}

// New component for file deletion visualization
interface DeleteFileViewProps {
  filePath: string;
}

function DeleteFileView({ filePath }: DeleteFileViewProps) {
  return (
    <div className="border border-red-200 dark:border-red-950 rounded-md overflow-hidden">
      <div className="p-4 bg-red-50 dark:bg-red-950/20">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
          <span className="font-medium">File deleted:</span>
          <code className="bg-white dark:bg-neutral-900 px-2 py-1 rounded text-xs">{filePath}</code>
        </div>
      </div>
    </div>
  );
}

// Truncated content component with expand button
function TruncatedContent({ content, toolType, fileName, args }: { 
  content: string; 
  toolType: string;
  fileName?: string;
  args?: Record<string, string>; 
}) {
  // Always define useState at the top level
  const [expanded, setExpanded] = useState(false);
  const isLongContent = content.length > 800;
  
  // Render the appropriate component based on tool type
  if (toolType === 'code') {
    return <CodePreview content={content} fileName={fileName} />;
  }
  
  if (toolType === 'terminal') {
    // Parse command and output if possible
    const commandLines = content.trim().split('\n');
    const command = commandLines[0] || '';
    const output = commandLines.length > 1 ? commandLines.slice(1).join('\n') : undefined;
    
    return <TerminalView command={command} output={output} />;
  }
  
  if (toolType === 'str-replace' && args) {
    const filePath = args.file_path || '';
    const oldStr = args.old_str || '';
    const newStr = args.new_str || '';
    
    if (filePath && oldStr && newStr) {
      return <TextDiffView filePath={filePath} oldStr={oldStr} newStr={newStr} />;
    }
  }
  
  if (toolType === 'delete-file' && args?.file_path) {
    return <DeleteFileView filePath={args.file_path} />;
  }
  
  // For generic content, implement expanding behavior here
  const displayContent = isLongContent && !expanded 
    ? content.substring(0, 800) + '...' 
    : content;

  return (
    <div className="relative">
      <pre className="p-2 rounded bg-background whitespace-pre-wrap break-words overflow-auto max-h-[400px] overflow-y-auto">
        {displayContent}
      </pre>
      
      {isLongContent && !expanded && (
        <div className="flex justify-center py-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setExpanded(true)}
          >
            <ChevronDown className="h-3 w-3" />
            <span>Show more</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export function SimplifiedToolCall({ name, arguments: args, content, state = 'complete' }: ToolCallProps) {
  // Format the attributes for display
  const formattedArgs = args 
    ? Object.entries(args).map(([key, value]) => `${key}="${value}"`).join(' ')
    : '';
    
  // Get filename from args if it exists
  const fileName = args?.file_path || args?.filename || args?.path || '';
  
  // Determine tool type for specialized rendering
  const getToolType = (): 'code' | 'terminal' | 'str-replace' | 'delete-file' | 'generic' => {
    if (!name) return 'generic';
    
    const toolName = name.toLowerCase();
    
    // String replacement tool
    if (
      toolName === 'str-replace' ||
      toolName === 'str_replace' ||
      toolName === 'strreplace' ||
      toolName === 'replace'
    ) {
      return 'str-replace';
    }
    
    // File deletion tool
    if (
      toolName === 'delete-file' ||
      toolName === 'delete_file' ||
      toolName === 'deletefile' ||
      toolName === 'file-delete' ||
      toolName === 'remove-file'
    ) {
      return 'delete-file';
    }
    
    // Code/file-related tools
    if (
      toolName.includes('create-file') ||
      toolName.includes('create_file') ||
      toolName.includes('createfile') ||
      toolName.includes('file-create') ||
      toolName.includes('write-file') ||
      toolName.includes('write_file') ||
      toolName.includes('writefile') ||
      toolName.includes('file-write') ||
      toolName.includes('rewrite-file') ||
      toolName.includes('full-file-rewrite') ||
      (toolName.includes('create') && fileName) ||
      (toolName.includes('write') && fileName)
    ) {
      return 'code';
    }
    
    // Terminal/command tools
    if (
      toolName.includes('execute-command') ||
      toolName.includes('execute_command') ||
      toolName.includes('executecommand') ||
      toolName.includes('command-execute') ||
      toolName.includes('run-terminal') ||
      toolName.includes('run_terminal') ||
      toolName.includes('runterminal') ||
      toolName.includes('terminal-run') ||
      toolName.includes('shell') ||
      toolName.includes('bash') ||
      toolName.includes('execute')
    ) {
      return 'terminal';
    }
    
    return 'generic';
  };
  
  // Determine component based on tool type
  const renderContent = () => {
    if (!content && name === 'delete-file' && args?.file_path) {
      return <DeleteFileView filePath={args.file_path} />;
    }
    
    if (!content) return null;
    
    const toolType = getToolType();
    
    return <TruncatedContent content={content} toolType={toolType} fileName={fileName} args={args} />;
  };
  
  return (
    <div className="w-full my-3">
      <div className="flex items-center mb-1">
        <span className={`inline-block h-2 w-2 rounded-full mr-2 ${state === 'processing' ? 'bg-amber-400' : 'bg-emerald-500'}`}></span>
        <code className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
          &lt;{name}{formattedArgs ? ' ' + formattedArgs : ''}&gt;
        </code>
      </div>
      <div className="mt-2">
        {(content || name === 'delete-file') && renderContent()}
      </div>
    </div>
  );
} 