import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Code, Terminal, File, FileText, Trash2, ArrowRight, RefreshCcw } from "lucide-react";

interface CompactToolCallProps {
  name?: string;
  arguments?: Record<string, string>;
  state?: 'processing' | 'complete';
  onClick?: () => void;
  isActive?: boolean;
}

export function CompactToolCall({ 
  name, 
  arguments: args, 
  state = 'complete', 
  onClick,
  isActive = false
}: CompactToolCallProps) {
  if (!name) return null;
  
  // Get filename from args if it exists
  const fileName = args?.file_path || args?.filename || args?.path || '';
  
  // Determine tool type and icon
  const getToolInfo = () => {
    if (!name) return { icon: ArrowRight, color: 'bg-neutral-100 dark:bg-neutral-800' };
    
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
        color: 'bg-amber-100 dark:bg-amber-950/30',
        textColor: 'text-amber-700 dark:text-amber-400'
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
        color: 'bg-red-100 dark:bg-red-950/30',
        textColor: 'text-red-700 dark:text-red-400'
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
      toolName.includes('read-file') ||
      toolName.includes('read_file') ||
      toolName.includes('readfile') ||
      (toolName.includes('create') && fileName) ||
      (toolName.includes('write') && fileName) ||
      (toolName.includes('read') && fileName)
    ) {
      const isRead = toolName.includes('read');
      return { 
        icon: isRead ? FileText : File, 
        color: isRead ? 'bg-blue-100 dark:bg-blue-950/30' : 'bg-green-100 dark:bg-green-950/30',
        textColor: isRead ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'
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
        color: 'bg-purple-100 dark:bg-purple-950/30',
        textColor: 'text-purple-700 dark:text-purple-400'
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
        color: 'bg-indigo-100 dark:bg-indigo-950/30',
        textColor: 'text-indigo-700 dark:text-indigo-400'
      };
    }
    
    return { 
      icon: ArrowRight, 
      color: 'bg-neutral-100 dark:bg-neutral-800',
      textColor: 'text-neutral-700 dark:text-neutral-400'
    };
  };
  
  const { icon: Icon, color, textColor } = getToolInfo();
  const displayName = fileName || name;
  
  // Truncate long names
  const truncatedName = displayName.length > 30 
    ? displayName.substring(0, 27) + '...' 
    : displayName;
  
  return (
    <div className="py-1">
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1.5 px-2 py-1 ${color} border-transparent whitespace-nowrap ${textColor || 'text-foreground'} cursor-pointer transition-all hover:opacity-90 ${isActive ? 'ring-2 ring-primary/30' : ''}`}
        onClick={onClick}
      >
        {state === 'processing' ? (
          <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Icon className="h-3 w-3" />
        )}
        <span className="font-normal text-xs">
          {truncatedName}
        </span>
      </Badge>
    </div>
  );
} 