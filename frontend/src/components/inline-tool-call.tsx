import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Code, Terminal, File, FileText, Trash2, ArrowRight, RefreshCcw, ExternalLink } from "lucide-react";

interface InlineToolCallProps {
  name?: string;
  arguments?: Record<string, string>;
  index: number;
  state?: 'processing' | 'complete';
  onViewDetails?: (toolIndex: number) => void;
}

export function InlineToolCall({ 
  name, 
  arguments: args, 
  index,
  state = 'complete', 
  onViewDetails
}: InlineToolCallProps) {
  if (!name) return null;
  
  // Get filename from args if it exists
  const fileName = args?.file_path || args?.filename || args?.path || '';
  
  // Determine tool type and icon
  const getToolInfo = () => {
    if (!name) return { icon: ArrowRight, colorClass: 'bg-muted/50' };
    
    const toolName = name.toLowerCase();
    
    // String replacement tool
    if (
      toolName === 'str-replace' ||
      toolName === 'str_replace' ||
      toolName === 'strreplace' ||
      toolName === 'replace'
    ) {
      return { 
        icon: RefreshCcw, 
        colorClass: '',
        label: 'Replace Text'
      };
    }
    
    // File deletion tool
    if (
      toolName === 'delete-file' ||
      toolName === 'delete_file' ||
      toolName === 'deletefile' ||
      toolName === 'file-delete' ||
      toolName === 'remove-file'
    ) {
      return { 
        icon: Trash2, 
        colorClass: '',
        label: 'Delete File'
      };
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
      return { 
        icon: File, 
        colorClass: '',
        label: 'Create/Edit File'
      };
    }
    
    if (
      toolName.includes('read-file') ||
      toolName.includes('read_file') ||
      toolName.includes('readfile') ||
      (toolName.includes('read') && fileName)
    ) {
      return { 
        icon: FileText, 
        colorClass: '',
        label: 'Read File'
      };
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
      return { 
        icon: Terminal, 
        colorClass: '',
        label: 'Run Command'
      };
    }
    
    // Code search tools
    if (
      toolName.includes('search') ||
      toolName.includes('grep') ||
      toolName.includes('find')
    ) {
      return { 
        icon: Code, 
        colorClass: 'bg-secondary/30',
        label: 'Search Code'
      };
    }
    
    return { 
      icon: ArrowRight, 
      colorClass: 'bg-muted/50',
      label: 'Tool Call'
    };
  };
  
  const { icon: Icon, colorClass } = getToolInfo();
  const displayName = fileName || name;
  
  // Truncate long names
  const truncatedName = displayName.length > 30 
    ? displayName.substring(0, 27) + '...' 
    : displayName;
  
  // Get tool details based on its type
  const getToolDetails = () => {
    const toolName = name?.toLowerCase() || '';
    const toolType = getToolInfo();
    
    // For read-file
    if (toolName.includes('read') && fileName) {
      return {
        title: 'File Read',
        description: `Reading ${truncatedName}`
      };
    }
    
    // For write/create file
    if ((toolName.includes('write') || toolName.includes('create') || toolName.includes('edit')) && fileName) {
      return {
        title: 'File Modified',
        description: `Editing ${truncatedName}`
      };
    }
    
    // For terminal commands
    if (toolName.includes('terminal') || toolName.includes('command') || toolName.includes('execute')) {
      const command = args?.command || '';
      const truncatedCommand = command.length > 40 ? command.substring(0, 37) + '...' : command;
      return {
        title: 'Terminal Command',
        description: truncatedCommand ? `$ ${truncatedCommand}` : 'Running command'
      };
    }
    
    // For search
    if (toolName.includes('search') || toolName.includes('find') || toolName.includes('grep')) {
      const query = args?.query || '';
      const truncatedQuery = query.length > 40 ? query.substring(0, 37) + '...' : query;
      return {
        title: 'Code Search',
        description: truncatedQuery ? `"${truncatedQuery}"` : 'Searching codebase'
      };
    }
    
    // Default
    return {
      title: toolType.label || 'Tool Call',
      description: truncatedName
    };
  };
  
  const toolDetails = getToolDetails();
  
  const handleClick = () => {
    if (onViewDetails) {
      onViewDetails(index);
    }
  };
  
  return (
    <div 
      className="inline-flex items-center gap-2 my-1 rounded-md border border-border bg-primary/5 hover:bg-primary/10 transition-colors px-2 py-1 cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1.5 px-0 py-0 ${colorClass} border-transparent whitespace-nowrap text-foreground`}
      >
        <span className="h-5 w-5 flex items-center justify-center rounded-[4px] bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-700 dark:to-zinc-800 border border-border">
          {state === 'processing' ? (
            <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Icon className="h-3 w-3" />
          )}
        </span>
        <span className="font-mono text-xs tracking-tight">
          {toolDetails.title}
        </span>
      </Badge>
      
      <span className="font-mono text-xs tracking-tighter text-muted-foreground truncate max-w-[12rem] tabular-nums">
        {toolDetails.description}
      </span>
      
      <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
    </div>
  );
} 