'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Square, Loader2, Brain } from "lucide-react";

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
  onChange
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
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

  return (
    <div className="w-full">
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
          className="min-h-[50px] max-h-[200px] pr-12 resize-none"
          disabled={loading || (disabled && !isAgentRunning)}
          rows={1}
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
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {isAgentRunning && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="text-xs flex items-center gap-1.5">
            <span className="inline-flex items-center">
              <div className="relative animate-brain-gradient">
                <Brain className="h-4 w-4 mr-1.5 text-transparent" style={{stroke: 'url(#brainGradientInput)'}} />
                <svg width="0" height="0">
                  <linearGradient id="brainGradientInput" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d1d5db" />
                    <stop offset="50%" stopColor="#f9fafb" />
                    <stop offset="100%" stopColor="#d1d5db" />
                  </linearGradient>
                </svg>
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-300 via-zinc-100 to-gray-300 animate-shimmer font-medium">Thinking</span>
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