'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Square, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  isAgentRunning?: boolean;
  onStopAgent?: () => void;
  autoFocus?: boolean;
  minHeight?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function ChatInput({
  onSubmit,
  placeholder = "Message the AI...",
  loading = false,
  disabled = false,
  isAgentRunning = false,
  onStopAgent,
  autoFocus = true,
  minHeight = "min-h-[50px] md:min-h-[60px]",
  value,
  onChange
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const [isStopping, setIsStopping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Allow controlled or uncontrolled usage
  const isControlled = value !== undefined && onChange !== undefined;
  
  // Update local state if controlled and value changes
  useEffect(() => {
    if (isControlled && value !== inputValue) {
      setInputValue(value);
    }
  }, [value, isControlled, inputValue]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading || (disabled && !isAgentRunning)) return;
    
    if (isAgentRunning && onStopAgent) {
      setIsStopping(true);
      try {
        await onStopAgent();
      } finally {
        setIsStopping(false);
      }
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
        handleSubmit(e as any);
      }
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative w-full">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full ${minHeight} pr-12 py-3 pl-4 resize-none bg-background border-border rounded-xl shadow-sm text-base focus-visible:ring-1 focus-visible:ring-ring`}
            disabled={loading || (disabled && !isAgentRunning)}
            rows={1}
          />
          <Button 
            type="submit"
            disabled={((!inputValue.trim() && !isAgentRunning) || loading || (disabled && !isAgentRunning))}
            className={`absolute right-3 bottom-3 h-9 w-9 p-0 rounded-full transition-all duration-200 ${
              isAgentRunning 
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
                : (!inputValue.trim() && !isAgentRunning) || loading || (disabled && !isAgentRunning)
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary hover:bg-primary/90'
            }`}
            aria-label={isAgentRunning ? 'Stop' : 'Send message'}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isAgentRunning ? (
              isStopping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="mt-2 flex justify-center">
          <div className="flex items-center text-xs text-muted-foreground">
            {isAgentRunning ? (
              <div className="flex items-center gap-1">
                {isStopping ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Stopping AI...
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-0.5">
                      <div className="w-1 h-1 bg-destructive rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-destructive rounded-full animate-pulse delay-150"></div>
                      <div className="w-1 h-1 bg-destructive rounded-full animate-pulse delay-300"></div>
                    </div>
                    AI is responding...
                  </>
                )}
              </div>
            ) : (
              <>
                <span className="inline-flex items-center px-1.5 h-5 bg-muted rounded text-foreground/70 text-[10px] font-medium mr-1.5">Enter</span>
                <span>to send</span>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
} 