'use client';

import React from 'react';
import { ParsedTag, ToolComponentProps, ToolDisplayMode, ToolStatusLabels } from '@/lib/types/tool-calls';
import { 
  File, FileText, Terminal, FolderPlus, Folder, Code, Search as SearchIcon, 
  Bell, Replace, ChevronDown, ChevronRight, Plus, Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { diffLines } from 'diff';
import { useTheme } from 'next-themes';

interface BaseToolProps {
  tag: ParsedTag;
  mode: ToolDisplayMode;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Base Tool Component
 */
export const BaseTool: React.FC<BaseToolProps> = ({ tag, mode, title, children, icon }) => {
  // Determine if we should use dark mode based on the display mode
  const isDark = mode === 'detailed';
  const isRunning = tag.status === 'running';
  
  return (
    <div className="border rounded-lg overflow-hidden border-subtle dark:border-white/10">
      <div className={cn(
        "flex items-center px-2 py-1 text-xs font-medium border-b border-subtle dark:border-white/10",
        isDark
          ? "bg-background-secondary dark:bg-background-secondary text-foreground"
          : "bg-background-secondary dark:bg-background-secondary text-foreground"
      )}>
        {icon}
        <div className="flex-1">{title}</div>
        {isRunning && (
          <div className="flex items-center gap-2">
            <span className="text-amber-500">Running</span>
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
          </div>
        )}
      </div>
      <div className={cn(
        "p-3",
        isDark ? "bg-card-bg dark:bg-background-secondary text-foreground" : "bg-card-bg dark:bg-background-secondary text-foreground"
      )}>
        {children}
      </div>
    </div>
  );
};

/**
 * Create File Tool Component
 */
export const CreateFileTool: React.FC<ToolComponentProps> = ({ tag, mode }) => {
  const filePath = tag.attributes.file_path || '';
  const fileContent = tag.content || '';
  
  return (
    <BaseTool
      tag={tag}
      mode={mode}
      title={`Creating file: ${filePath}`}
      icon={<FileText className="h-4 w-4 mr-2" />}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <FileText className="h-3 w-3" />
          <span className="font-mono">{filePath}</span>
        </div>
        <pre className="whitespace-pre-wrap bg-muted p-2 rounded-md text-xs overflow-x-auto max-h-60">
          {fileContent}
        </pre>
      </div>
    </BaseTool>
  );
};

/**
 * Full File Rewrite Tool Component
 */

export const FullFileRewriteTool: React.FC<ToolComponentProps> = ({ tag, mode }) => {
  const filePath = tag.attributes.file_path || '';
  const fileContent = tag.content || '';
  
  return (
    <BaseTool
      tag={tag}
      mode={mode}
      title={`Full file rewrite: ${filePath}`}
      icon={<FileText className="h-4 w-4 mr-2" />}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <FileText className="h-3 w-3" />
          <span className="font-mono">{filePath}</span>
          </div>
        <pre className="whitespace-pre-wrap bg-muted p-2 rounded-md text-xs overflow-x-auto max-h-60">
          {fileContent}
        </pre>
      </div>
    </BaseTool>
  );
};

/**
  );
};

/**
 * Read File Tool Component
 */
export const ReadFileTool: React.FC<ToolComponentProps> = ({ tag, mode }) => {
  const filePath = tag.attributes.file_path || '';
  const fileContent = tag.content || '';
  
  return (
    <BaseTool
      tag={tag}
      mode={mode}
      title={`Reading file: ${filePath}`}
      icon={<File className="h-4 w-4 mr-2" />}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <File className="h-3 w-3" />
          <span className="font-mono">{filePath}</span>
        </div>
        <pre className="whitespace-pre-wrap bg-muted p-2 rounded-md text-xs overflow-x-auto max-h-60">
          {fileContent}
        </pre>
      </div>
    </BaseTool>
  );
};

/**
 * Execute Command Tool Component
 */
export const ExecuteCommandTool: React.FC<ToolComponentProps> = ({ tag, mode }) => {
  const command = tag.attributes.command || '';
  const output = tag.content || '';
  const resultOutput = tag.resultTag?.content || '';
  
  // Only show paired view if explicitly paired
  const showPairedView = tag.isPaired && tag.resultTag?.content;
  
  // Check status
  const isRunning = tag.status === 'running';
  
  return (
    <BaseTool
      tag={tag}
      mode={mode}
      title={isRunning ? `Executing: ${command}` : `Executed: ${command}`}
      icon={<Terminal className="h-4 w-4 mr-2" />}
    >
      <div className="space-y-2">
        <div className="flex items-start gap-1 text-xs">
          <span className="text-green-500 font-mono">$</span>
          <span className="font-mono text-green-500 dark:text-green-400">{command}</span>
        </div>
        
        {showPairedView ? (
          <div className="space-y-3">
            {output && (
              <div>
                <div className="text-xs font-medium mb-1 text-amber-500 dark:text-amber-400">Command Output</div>
                <div className="bg-muted dark:bg-gray-900 rounded-md p-2 text-xs font-mono text-green-500 dark:text-green-400 overflow-x-auto max-h-60">
                  <pre className="whitespace-pre-wrap">{output}</pre>
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-medium mb-1 text-green-500 dark:text-green-400">Result</div>
              <div className="bg-muted dark:bg-gray-900 rounded-md p-2 text-xs font-mono text-green-500 dark:text-green-400 overflow-x-auto max-h-60">
                <pre className="whitespace-pre-wrap">{resultOutput}</pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-muted dark:bg-gray-900 rounded-md p-2 text-xs font-mono text-green-500 dark:text-green-400 overflow-x-auto max-h-60">
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>
        )}
      </div>
    </BaseTool>
  );
};
/**
 * String Replace Tool Component
 */
export const StringReplaceTool: React.FC<ToolComponentProps> = ({ tag, mode }) => {
  const content = tag.content || '';
  
  // Parse the old and new strings from the content
  const oldStrMatch = content.match(/<old_str>([\s\S]*?)<\/old_str>/);
  const newStrMatch = content.match(/<new_str>([\s\S]*?)<\/new_str>/);
  
  const oldStr = oldStrMatch ? oldStrMatch[1] : '';
  const newStr = newStrMatch ? newStrMatch[1] : '';
  
  // Calculate the diff between old and new strings
  const diff = diffLines(oldStr, newStr);
  
  interface DiffPart {
    added?: boolean;
    removed?: boolean;
    value: string;
  }
  
  return (
    <BaseTool
      tag={tag}
      mode={mode}
      title="File update"
      icon={<Replace className="h-4 w-4 mr-2" />}
    >
      <div className="space-y-2">
        <div className="border border-subtle dark:border-white/10 rounded-md overflow-hidden font-mono text-xs">
          {diff.map((part: DiffPart, index: number) => (
            <div 
              key={index}
              className={cn(
                "px-2 py-0.5 flex items-start",
                part.added ? "bg-green-500/10 text-green-700 dark:text-green-400" : 
                part.removed ? "bg-red-500/10 text-red-700 dark:text-red-400" : 
                "text-foreground"
              )}
            >
              <span className="mr-2">
                {part.added ? <Plus className="h-3 w-3" /> : 
                 part.removed ? <Minus className="h-3 w-3" /> : 
                 <span className="w-3" />}
              </span>
              <pre className="whitespace-pre-wrap flex-1">{part.value}</pre>
            </div>
          ))}
        </div>
      </div>
    </BaseTool>
  );
};

/**
 * Notification Tool Component
 */
export const NotifyTool: React.FC<ToolComponentProps> = ({ tag, mode }) => {
  const message = tag.attributes.message || '';
  const type = tag.attributes.type || 'info';
  
  return (
    <BaseTool
      tag={tag}
      mode={mode}
      title={`Notification: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`}
      icon={<Bell className="h-4 w-4 mr-2" />}
    >
      <div className={cn(
        "p-2 rounded-md",
        type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
        type === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
        type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
        'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      )}>
        {message}
      </div>
    </BaseTool>
  );
};

/**
 * Directory Tool Component (for create-directory and list-directory)
 */
export const DirectoryTool: React.FC<ToolComponentProps> = ({ tag, mode }) => {
  const path = tag.attributes.path || '';
  const content = tag.content || '';
  const isListDirectory = tag.tagName === 'list-directory';
  
  return (
    <BaseTool
      tag={tag}
      mode={mode}
      title={isListDirectory ? `Listing directory: ${path}` : `Creating directory: ${path}`}
      icon={isListDirectory ? <Folder className="h-4 w-4 mr-2" /> : <FolderPlus className="h-4 w-4 mr-2" />}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Folder className="h-3 w-3" />
          <span className="font-mono">{path}</span>
        </div>
        {isListDirectory && content && (
          <pre className="whitespace-pre-wrap bg-muted p-2 rounded-md text-xs overflow-x-auto max-h-60">
            {content}
          </pre>
        )}
      </div>
    </BaseTool>
  );
};

/**
 * Search Code Tool Component
 */
export const SearchCodeTool: React.FC<ToolComponentProps> = ({ tag, mode }) => {
  const query = tag.attributes.query || '';
  const content = tag.content || '';
  
  return (
    <BaseTool
      tag={tag}
      mode={mode}
      title={`Searching code: ${query}`}
      icon={<SearchIcon className="h-4 w-4 mr-2" />}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs bg-primary/10 p-1 rounded">
          <SearchIcon className="h-3 w-3" />
          <span className="font-mono">{query}</span>
        </div>
        <pre className="whitespace-pre-wrap bg-muted p-2 rounded-md text-xs overflow-x-auto max-h-60">
          {content}
        </pre>
      </div>
    </BaseTool>
  );
};

// Tool component registry
export const ToolComponentRegistry: Record<string, React.FC<ToolComponentProps>> = {
  'create-file': CreateFileTool,
  'read-file': ReadFileTool,
  'execute-command': ExecuteCommandTool,
  'str-replace': StringReplaceTool,
  'create-directory': DirectoryTool,
  'list-directory': DirectoryTool,
  'search-code': SearchCodeTool,
  'notify': NotifyTool,
  'ask': NotifyTool,  // Handle ask similar to notify for now
  'complete': NotifyTool, // Handle complete similar to notify for now
  'full-file-rewrite': FullFileRewriteTool,
};

// Helper function to get the appropriate component for a tag
export function getComponentForTag(tag: ParsedTag): React.FC<ToolComponentProps> {
  if (!ToolComponentRegistry[tag.tagName]) {
    console.warn(`No component registered for tag type: ${tag.tagName}`);
  }
  return ToolComponentRegistry[tag.tagName] || 
    // Fallback component for unknown tag types
    (({tag, mode}) => {
      console.log(`Rendering fallback component for tag: ${tag.tagName}`, tag);
      return (
        <BaseTool
          tag={tag}
          mode={mode}
          title={`${tag.tagName} operation`}
          icon={<Code className="h-4 w-4 mr-2" />}
        >
          <pre className="whitespace-pre-wrap bg-muted p-2 rounded-md text-xs">{tag.content || ''}</pre>
        </BaseTool>
      );
    });
} 