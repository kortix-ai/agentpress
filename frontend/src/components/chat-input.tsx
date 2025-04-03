'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square, Loader2, Plus } from "lucide-react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  isAgentRunning?: boolean;
  onStopAgent?: () => void;
  autoFocus?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onFileUpload?: (file: File) => void;
}

export function ChatInput({
  onSubmit,
  placeholder = "Type your message... (Enter to send, Shift+Enter for new line)",
  loading = false,
  disabled = false,
  isAgentRunning = false,
  onStopAgent,
  autoFocus = true,
  value,
  onChange,
  onFileUpload
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Allow controlled or uncontrolled usage
  const isControlled = value !== undefined && onChange !== undefined;
  
  // Update local state if controlled and value changes
  useEffect(() => {
    if (isControlled && value !== inputValue) {
      setInputValue(value);
    }
  }, [value, isControlled, inputValue]);

  // Auto-focus on textarea when component loads
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Adjust textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px
      textarea.style.height = `${newHeight}px`;
    };

    adjustHeight();
    
    // Adjust on window resize too
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [inputValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading || (disabled && !isAgentRunning)) return;
    
    if (isAgentRunning && onStopAgent) {
      onStopAgent();
      return;
    }
    
    onSubmit(inputValue);
    
    if (!isControlled) {
      setInputValue("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (isControlled) {
      onChange(newValue);
    } else {
      setInputValue(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !loading && (!disabled || isAgentRunning)) {
        handleSubmit(e as React.FormEvent);
      }
    }
  };

  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFileUpload) {
      onFileUpload(files[0]);
      e.target.value = ''; // Reset the input
    }
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleSubmit} className="relative">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isAgentRunning 
              ? "Agent is thinking..." 
              : placeholder
          }
          className="min-h-[70px] max-h-[200px] pr-12 pt-3 pb-2 resize-none"
          disabled={loading || (disabled && !isAgentRunning)}
          rows={1}
        />
        
        {/* File upload button - moved to bottom left */}
        <Button 
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-2 bottom-2 h-6 w-6 rounded-full text-zinc-400 hover:text-zinc-500 hover:bg-transparent opacity-70"
          onClick={handleFileButtonClick}
          disabled={loading || (disabled && !isAgentRunning)}
          aria-label="Upload file"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={loading || (disabled && !isAgentRunning)}
        />
        
        <Button 
          type={isAgentRunning ? 'button' : 'submit'}
          onClick={isAgentRunning ? onStopAgent : undefined}
          variant="ghost"
          size="icon"
          className="absolute right-2 bottom-2 h-8 w-8 rounded-full"
          disabled={(!inputValue.trim() && !isAgentRunning) || loading || (disabled && !isAgentRunning)}
          aria-label={isAgentRunning ? 'Stop agent' : 'Send message'}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAgentRunning ? (
            <Square className="h-4 w-4" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </form>

      {isAgentRunning && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="inline-flex items-center">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Agent is thinking...
            </span>
            <span className="text-muted-foreground/60 border-l pl-1.5">
              Press <kbd className="inline-flex items-center justify-center p-0.5 bg-muted border rounded text-xs"><Square className="h-2.5 w-2.5" /></kbd> to stop
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 