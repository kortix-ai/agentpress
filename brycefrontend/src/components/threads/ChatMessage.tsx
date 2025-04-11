import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, Share, ThumbsDown, ThumbsUp, Terminal, FileText, Search, Trash2, Edit, FolderOpen, File, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { ApiMessage } from './types';


interface ChatMessageProps {
  message: ApiMessage;
  index: number;
  messageRef: (el: HTMLDivElement | null) => void;
  editingMessageIndex: number | null;
  editedContent: string;
  editRef: React.RefObject<HTMLTextAreaElement>;
  handleEditMessage: (index: number) => void;
  handleCancelEdit: () => void;
  handleSubmitEdit: () => void;
  setEditedContent: (content: string) => void;
  handleToolClick: (message: ApiMessage) => void;
  messages: ApiMessage[];
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  index,
  messageRef,
  editingMessageIndex,
  editedContent,
  editRef,
  handleEditMessage,
  handleCancelEdit,
  handleSubmitEdit,
  setEditedContent,
  handleToolClick,
  messages
}) => {
  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success('Copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
        toast.error('Failed to copy to clipboard');
      });
  };

  const getToolIcon = (toolName: string | undefined) => {
    if (!toolName) return <File className="h-4 w-4" />;
    
    const toolNameLower = toolName.toLowerCase();
    
    if (toolNameLower.includes('terminal') || toolNameLower.includes('execute_command')) {
      return <Terminal className="h-4 w-4" />;
    } else if (toolNameLower.includes('file') || toolNameLower.includes('read') || toolNameLower.includes('write') || toolNameLower.includes('create')) {
      return <FileText className="h-4 w-4" />;
    } else if (toolNameLower.includes('search') || toolNameLower.includes('grep')) {
      return <Search className="h-4 w-4" />;
    } else if (toolNameLower.includes('message') || toolNameLower.includes('ask')) {
      return <MessageSquare className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />; // Default icon
    }
  }; 

  const getToolDescription = (toolName: string | undefined, args: string | undefined): string => {
    if (!toolName) return "";
    
    const toolNameLower = toolName.toLowerCase();
    let argObj: Record<string, unknown> = {};
    
    // Try to parse arguments as JSON if available
    if (args) {
      try {
        argObj = JSON.parse(args);
      } catch {
        // If not valid JSON, use as is
      }
    }
    
    // Extract specific information based on tool type
    if (toolNameLower.includes('execute_command')) {
      const command = typeof argObj === 'object' && argObj.command ? String(argObj.command).substring(0, 30) : '';
      return command || 'execute_command';
    } else if (toolNameLower.includes('read_file')) {
      const path = typeof argObj === 'object' && argObj.path ? String(argObj.path) : '';
      const filename = path.split('/').pop() || path;
      return filename || 'read_file';
    } else if (toolNameLower.includes('write') || toolNameLower.includes('create_file')) {
      const path = typeof argObj === 'object' && argObj.file_path 
        ? String(argObj.file_path) 
        : (typeof argObj === 'object' && argObj.path ? String(argObj.path) : '');
      const filename = path.split('/').pop() || path;
      return filename || 'create_file';
    } else if (toolNameLower.includes('delete_file')) {
      const path = typeof argObj === 'object' && argObj.file_path ? String(argObj.file_path) : '';
      const filename = path.split('/').pop() || path;
      return filename || 'delete_file';
    } else if (toolNameLower.includes('grep_search')) {
      const query = typeof argObj === 'object' && argObj.query ? String(argObj.query) : '';
      return query || 'grep_search';
    } else if (toolNameLower.includes('file_search')) {
      const query = typeof argObj === 'object' && argObj.query ? String(argObj.query) : '';
      return query || 'file_search';
    } else if (toolNameLower.includes('list_dir')) {
      const path = typeof argObj === 'object' && argObj.relative_workspace_path ? String(argObj.relative_workspace_path) : '';
      return path || 'list_dir';
    } else if (toolNameLower.includes('str_replace')) {
      const path = typeof argObj === 'object' && argObj.file_path ? String(argObj.file_path) : '';
      const filename = path.split('/').pop() || path;
      return filename || 'str_replace';
    } else if (toolNameLower.includes('message_ask_user')) {
      return 'message_ask_user';
    } else if (toolNameLower.includes('idle')) {
      return 'idle';
    } else {
      // Just return a cleaned up version of the tool name
      return toolName.replace(/_/g, ' ');
    }
  }; 


  return (
    <div 
      ref={messageRef}
      className={`flex flex-col message-container ${message.role === 'user' ? 'justify-end items-end' : 'justify-start'} relative ${
        editingMessageIndex !== null && index > editingMessageIndex ? 'z-0' : 'z-20'} ${message.role === 'user' ? 'group' : ''}`}
    >
      {/* Add timestamp above for user messages - only visible on hover */}
      {message.role === 'user' && message.created_at && (
        <div className="text-xs text-zinc-400 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {new Date(message.created_at).toLocaleString()}
        </div>
      )}
      
      <div 
        className={`${message.role === 'user' ? 'max-w-[85%]' : 'max-w-full'} rounded-md px-2 py-2 text-sm ${
          message.role === 'user' 
            ? 'bg-zinc-50 text-zinc-800 border border-zinc-100 relative rounded-br-none' 
            : ''
        } ${message.role === 'user' ? 'hover:ring-2 hover:ring-zinc-200 transition-all duration-200' : 'group'}`}
      >
        {/* Keep timestamp inside for assistant messages only */}
        {message.created_at && message.role === 'assistant' && (
          <div className="text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-end mt-1">
            {new Date(message.created_at).toLocaleString()}
          </div>
        )}
        
        {editingMessageIndex === index ? (
          <div className="flex flex-col">
            <textarea
              ref={editRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="bg-transparent border-none outline-none resize-none w-full text-zinc-800"
              rows={Math.max(3, editedContent.split('\n').length)}
              placeholder="Edit your message..."
            />
            <div className="flex justify-between items-center gap-2 mt-2 pt-2 border-t border-zinc-200 edit-actions">
              <div className="text-xs text-zinc-500">
                Press Esc to cancel, Ctrl+Enter to submit
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-7 px-2 text-xs text-zinc-600 hover:text-zinc-800 hover:bg-zinc-200/50"
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSubmitEdit}
                  className="h-7 px-3 text-xs bg-zinc-800 text-white hover:bg-zinc-700"
                  disabled={!editedContent.trim()}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Update
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className={`whitespace-pre-wrap break-words ${
              message.role === 'user' ? 'cursor-pointer relative' : ''
            }`} 
            onClick={() => message.role === 'user' ? handleEditMessage(index) : null}
          >
            {/* Add Kortix logo for assistant messages that are not tool calls */}
            {message.role === 'assistant' && message.type !== 'tool_call' && !message.tool_calls && (
              <div className="flex items-center mb-4">
                <img 
                  src="/Kortix-Logo-Only.svg" 
                  alt="Kortix Logo" 
                  className="h-4 w-4 mr-1.5"
                />
                <span className="text-xs suna-text font-medium">SUNA</span>
              </div>
            )}
            
            {message.type === 'tool_call' ? (
              <div className="font-mono text-xs">
                <div className="mt-0.5 p-2 bg-secondary/20 rounded-md overflow-hidden">
                  {/* Action line with icon */}
                  <div className="flex items-center gap-2 mb-1 pb-1 border-b border-gray-200/30 text-muted-foreground">
                    <div className="flex items-center justify-center">
                      {getToolIcon(message.name)}
                    </div>
                    <span>{getToolDescription(message.name, message.arguments)}</span>
                  </div>

                  {/* Arguments */}
                  <div className="overflow-x-auto">
                    {message.arguments}
                  </div>
                </div>
              </div>
            ) : message.role === 'tool' ? (
              <div className="font-mono text-xs w-full relative group">
                {message.created_at && (
                  <div className="absolute -right-6 top-2 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    {new Date(message.created_at).toLocaleString()}
                  </div>
                )}
                <div className="inline-block max-w-full">
                  {(() => {
                    const toolNameLower = message.name?.toLowerCase() || '';
                    
                    // Try to parse tool output as JSON
                    let jsonOutput = null;
                    try {
                      jsonOutput = JSON.parse(message.content);
                    } catch {
                      // Not JSON, continue with regular formatting
                    }

                    // File creation/write result
                    if ((toolNameLower.includes('create_file') || toolNameLower.includes('write') || toolNameLower.includes('full_file_rewrite')) && message.content) {
                      const filePath = message.content.match(/Created file: (.*)/)?.[1] || 
                                      message.content.match(/Updated file: (.*)/)?.[1] ||
                                      message.content.match(/path: "(.*?)"/)?.[1] ||
                                      message.content.match(/File '(.*)' created/)?.[1];
                      const fileName = filePath?.split('/').pop();
                      
                      // Always prioritize getting file content from the original tool call
                      let fileContent = '';
                      
                      // First try to get content from the original tool call
                      if (message.tool_call_id) {
                        const originalToolCall = messages.find(m => 
                          m.role === 'assistant' && 
                          m.tool_calls && m.tool_calls.some(tc => tc.id === message.tool_call_id)
                        );
                        
                        if (originalToolCall?.tool_calls) {
                          const toolCall = originalToolCall.tool_calls.find(tc => tc.id === message.tool_call_id);
                          if (toolCall) {
                            try {
                              const args = JSON.parse(toolCall.function.arguments);
                              fileContent = args.file_contents || args.content || '';
                            } catch (e) {
                              // Parsing failed, continue to next method
                            }
                          }
                        }
                      }
                      
                      // If we couldn't get from tool call, try to parse from response
                      if (!fileContent) {
                        if (jsonOutput?.output) {
                          fileContent = jsonOutput.output.includes('File created') ? 
                            message.content.split('\n').slice(1).join('\n') : jsonOutput.output;
                        } else if (message.content.includes('\n')) {
                          // If result contains a newline, extract content after first line
                          fileContent = message.content.split('\n').slice(1).join('\n');
                        }
                      }
                      
                      // Fallback - check for line breaks to separate the content
                      if (!fileContent && message.content.includes('\n')) {
                        const lines = message.content.split('\n');
                        if (lines.length > 1) {
                          // Skip the first line (success message) and use the rest as content
                          fileContent = lines.slice(1).join('\n');
                        }
                      }
                      
                      return (
                        <div 
                          className="mt-0 rounded-md overflow-hidden inline-block cursor-pointer hover:border-success/40 transition-all relative"
                          onClick={() => handleToolClick(message)}
                        >
                          <div className="flex items-center justify-between py-2 bg-success/10">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-success" />
                              <span className="font-normal text-success/90">File created successfully</span>
                            </div>
                            <span className="text-xs text-success/70 ml-3">{fileName}</span>
                          </div>
                          {fileContent && (
                            <div className="px-3 py-2 bg-white max-h-60 overflow-y-auto">
                              <pre className="text-xs text-slate-700">{fileContent}</pre>
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // Read file result
                    else if (toolNameLower.includes('read_file') && message.content) {
                      const filePath = message.content.match(/Contents of file: (.*)/)?.[1] || 
                                    message.content.match(/path: "(.*?)"/)?.[1];
                      const fileName = filePath?.split('/').pop() || filePath;
                      
                      // Get file content - remove any "Contents of file:" prefix
                      const fileContent = message.content.includes('Contents of file:') ? 
                        message.content.split('\n').slice(1).join('\n') : message.content;
                      
                      return (
                        <div 
                          className="mt-0.5 rounded-md overflow-hidden border border-blue-200 inline-block cursor-pointer hover:border-blue-300 transition-all relative"
                          onClick={() => handleToolClick(message)}
                        >
                          <div className="flex items-center justify-between px-2 py-1.5 bg-blue-50">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <span className="font-normal text-blue-600">File contents</span>
                            </div>
                            <span className="text-xs text-blue-500 ml-3">{fileName}</span>
                          </div>
                          <div className="px-3 py-2 bg-white max-h-60 overflow-y-auto">
                            <pre className="text-xs text-slate-700">{fileContent}</pre>
                          </div>
                        </div>
                      );
                    }
                    
                    // Delete file result
                    else if (toolNameLower.includes('delete_file') && message.content) {
                      const filePath = message.content.match(/Deleted file: (.*)/)?.[1] || 
                                    message.content.match(/path: "(.*?)"/)?.[1];
                      const fileName = filePath?.split('/').pop() || filePath;
                      
                      return (
                        <div 
                          className="mt-0.5 rounded-md overflow-hidden border border-orange-200 inline-block cursor-pointer hover:border-orange-300 transition-all relative"
                          onClick={() => handleToolClick(message)}
                        >
                          <div className="px-2 py-1.5 bg-orange-50">
                            <div className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4 text-orange-500" />
                              <span className="font-normal text-orange-600">File deleted: {fileName}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Edit file result
                    else if (toolNameLower.includes('edit_file') || toolNameLower.includes('str_replace') && message.content) {
                      const filePath = message.content.match(/Edited file: (.*)/)?.[1] || 
                                      message.content.match(/Replacement successful.*?: (.*)/)?.[1] ||
                                      message.content.match(/path: "(.*?)"/)?.[1];
                      const fileName = filePath?.split('/').pop() || filePath;
                      
                      // Extract snippet of changes for preview
                      let snippet = '';
                      if (message.content.includes('Snippet of changes:')) {
                        snippet = message.content.split('Snippet of changes:')[1].trim();
                      }
                      
                      return (
                        <div 
                          className="mt-0.5 rounded-md overflow-hidden border border-purple-200 inline-block cursor-pointer hover:border-purple-300 transition-all relative"
                          onClick={() => handleToolClick(message)}
                        >
                          <div className="flex items-center justify-between px-2 py-1.5 bg-purple-50">
                            <div className="flex items-center gap-2">
                              <Edit className="h-4 w-4 text-purple-500" />
                              <span className="font-normal text-purple-600">File edited successfully</span>
                            </div>
                            <span className="text-xs text-purple-500 ml-3">{fileName}</span>
                          </div>
                          {snippet && (
                            <div className="px-3 py-2 bg-white max-h-60 overflow-y-auto">
                              <pre className="text-xs text-slate-700">{snippet}</pre>
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // Terminal/command result
                    else if ((toolNameLower.includes('command') || toolNameLower.includes('terminal')) && message.content) {
                      let commandOutput = message.content;
                      
                      // Try to parse JSON output
                      try {
                        const jsonResult = JSON.parse(message.content);
                        if (jsonResult.output) {
                          commandOutput = jsonResult.output;
                        }
                      } catch (e) {
                        // Not JSON, keep as is
                      }
                      
                      return (
                        <div 
                          className="mt-0.5 rounded-md overflow-hidden border border-zinc-200 inline-block cursor-pointer hover:border-zinc-300 transition-all relative"
                          onClick={() => handleToolClick(message)}
                        >
                          <div className="flex items-center px-3 py-2 bg-zinc-50">
                            <div className="flex items-center gap-2">
                              <Terminal className="h-4 w-4 text-zinc-600" />
                              <span className="font-normal text-zinc-700">Command output</span>
                            </div>
                          </div>
                          <div className="p-2 bg-black max-h-80 overflow-y-auto">
                            <pre className="text-xs text-green-400">{commandOutput}</pre>
                          </div>
                        </div>
                      );
                    }
                    
                    // Search results
                    else if ((toolNameLower.includes('search') || toolNameLower.includes('grep')) && message.content) {
                      return (
                        <div 
                          className="mt-0.5 rounded-md overflow-hidden border border-amber-200 inline-block cursor-pointer hover:border-amber-300 transition-all relative"
                          onClick={() => handleToolClick(message)}
                        >
                          <div className="flex items-center px-2 py-1.5 bg-amber-50">
                            <div className="flex items-center gap-2">
                              <Search className="h-4 w-4 text-amber-600" />
                              <span className="font-normal text-amber-700">Search results</span>
                            </div>
                          </div>
                          <div className="p-2 bg-white max-h-60 overflow-y-auto">
                            <pre className="text-xs text-slate-700 whitespace-pre-wrap">{message.content}</pre>
                          </div>
                        </div>
                      );
                    }
                    
                    // List directory results
                    else if (toolNameLower.includes('list_dir') && message.content) {
                      return (
                        <div 
                          className="mt-0.5 rounded-md overflow-hidden border border-teal-200 inline-block cursor-pointer hover:border-teal-300 transition-all relative"
                          onClick={() => handleToolClick(message)}
                        >
                          <div className="flex items-center px-2 py-1.5 bg-teal-50">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-4 w-4 text-teal-600" />
                              <span className="font-normal text-teal-700">Directory contents</span>
                            </div>
                          </div>
                          <div className="p-2 bg-white max-h-60 overflow-y-auto">
                            <pre className="text-xs text-slate-700">{message.content}</pre>
                          </div>
                        </div>
                      );
                    }
                    
                    // Default tool result display
                    return (
                      <div 
                        className="mt-0.5 p-2 bg-success/5 rounded-md inline-block cursor-pointer hover:bg-success/10 transition-all relative"
                        onClick={() => handleToolClick(message)}
                      >
                        <pre className="whitespace-pre-wrap">{message.content}</pre>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <>
                {message.content}
                {/* Add reaction icons for assistant messages */}
                {message.role === 'assistant' && (
                  <div className={`flex justify-end mt-1 pt-0.5 gap-2 ${index === 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle thumbs up
                        toast.success('Response rated as helpful');
                      }}
                      className="p-1 rounded-md hover:bg-zinc-100 transition-colors duration-200"
                      title="Helpful"
                    >
                      <ThumbsUp className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle thumbs down
                        toast.info('Response rated as not helpful');
                      }}
                      className="p-1 rounded-md hover:bg-zinc-100 transition-colors duration-200"
                      title="Not helpful"
                    >
                      <ThumbsDown className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Copy assistant message
                        copyToClipboard(message.content);
                      }}
                      className="p-1 rounded-md hover:bg-zinc-100 transition-colors duration-200"
                      title="Copy response"
                    >
                      <Copy className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle share
                        toast.info('Sharing options coming soon');
                      }}
                      className="p-1 rounded-md hover:bg-zinc-100 transition-colors duration-200"
                      title="Share"
                    >
                      <Share className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
