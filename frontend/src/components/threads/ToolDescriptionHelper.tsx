import React, { ReactNode } from 'react';
import { ToolCallData } from './types';

// Helper function to format a detailed description of what a tool is doing
export const getDetailedToolDescription = (toolCallData: ToolCallData): ReactNode => {
  // Don't process if no arguments
  if (!toolCallData.arguments) return "Processing...";
  
  try {
    const args = JSON.parse(toolCallData.arguments);
    
    // Create/write file operation
    if (toolCallData.name?.toLowerCase().includes('create_file') || 
        toolCallData.name?.toLowerCase().includes('write')) {
      const filePath = args.file_path || args.path;
      if (filePath) {
        const fileName = filePath.split('/').pop();
        return (
          <>
            Creating file: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{fileName}</span>
          </>
        );
      }
    }
    
    // Read file operation
    else if (toolCallData.name?.toLowerCase().includes('read_file')) {
      const filePath = args.target_file || args.path;
      if (filePath) {
        const fileName = filePath.split('/').pop();
        return (
          <>
            Reading file: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{fileName}</span>
          </>
        );
      }
    }
    
    // Delete file operation
    else if (toolCallData.name?.toLowerCase().includes('delete_file')) {
      const filePath = args.target_file || args.file_path;
      if (filePath) {
        const fileName = filePath.split('/').pop();
        return (
          <>
            Deleting file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span>
          </>
        );
      }
    }
    
    // Edit file operation
    else if (toolCallData.name?.toLowerCase().includes('edit_file')) {
      const filePath = args.target_file;
      if (filePath) {
        const fileName = filePath.split('/').pop();
        return (
          <>
            Editing file: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{fileName}</span>
          </>
        );
      }
    }
    
    // Execute command
    else if (toolCallData.name?.toLowerCase().includes('command') || 
            toolCallData.name?.toLowerCase().includes('terminal')) {
      const command = args.command;
      if (command) {
        return (
          <>
            Running: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{command.substring(0, 40)}{command.length > 40 ? '...' : ''}</span>
          </>
        );
      }
    }
    
    // Search operations
    else if (toolCallData.name?.toLowerCase().includes('search') || 
            toolCallData.name?.toLowerCase().includes('grep')) {
      const query = args.query;
      if (query) {
        return (
          <>
            Searching for: <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{query.substring(0, 40)}{query.length > 40 ? '...' : ''}</span>
          </>
        );
      }
    }
    
    // List directory
    else if (toolCallData.name?.toLowerCase().includes('list_dir')) {
      const path = args.relative_workspace_path;
      if (path) {
        return (
          <>
            Listing directory <span className="text-zinc-500 font-mono pl-1" style={{fontFamily: 'monospace'}}>{path}</span>
          </>
        );
      }
    }
  } catch (error) {
    // If JSON parsing fails, try regex approach for common patterns
    if (toolCallData.arguments) {
      const filePathMatch = toolCallData.arguments.match(/"(?:file_path|target_file|path)"\s*:\s*"([^"]+)"/);
      if (filePathMatch && filePathMatch[1]) {
        const filePath = filePathMatch[1];
        const fileName = filePath.split('/').pop();
        
        if (toolCallData.name?.toLowerCase().includes('create') || 
            toolCallData.name?.toLowerCase().includes('write')) {
          return (
            <>
              Creating file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span>
            </>
          );
        } else if (toolCallData.name?.toLowerCase().includes('read')) {
          return (
            <>
              Reading file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span>
            </>
          );
        } else if (toolCallData.name?.toLowerCase().includes('edit')) {
          return (
            <>
              Editing file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span>
            </>
          );
        } else if (toolCallData.name?.toLowerCase().includes('delete')) {
          return (
            <>
              Deleting file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span>
            </>
          );
        }
        return (
          <>
            Processing file <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{fileName}</span>
          </>
        );
      }
      
      const commandMatch = toolCallData.arguments.match(/"command"\s*:\s*"([^"]+)"/);
      if (commandMatch && commandMatch[1]) {
        const command = commandMatch[1];
        return (
          <>
            Running: <span className="text-zinc-500 font-mono pl-1.5" style={{fontFamily: 'monospace'}}>{command.substring(0, 40)}{command.length > 40 ? '...' : ''}</span>
          </>
        );
      }
    }
  }
  
  // Default fallback
  return toolCallData.name || "Processing...";
}; 