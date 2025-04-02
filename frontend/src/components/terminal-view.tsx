import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, ChevronDown, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TerminalViewProps {
  command: string;
  output?: string;
  maxHeight?: number;
  status?: 'processing' | 'complete';
  showHeader?: boolean;
  fileName?: string;
}

export function TerminalView({ command, output, maxHeight = 300, status, showHeader = true, fileName }: TerminalViewProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  
  // Check if content overflows and needs a "show more" button
  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > maxHeight);
    }
  }, [command, output, maxHeight]);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(command + (output ? '\n\n' + output : ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden">
      {/* Terminal header - only show if requested */}
      {showHeader && (
        <div className="flex items-center justify-between h-9 px-4 bg-neutral-900 dark:bg-black">
          <div className="flex items-center gap-2 text-neutral-300">
            <Terminal className="h-4 w-4" />
            <span className="font-mono text-xs">
              {fileName || "Terminal"}
            </span>
            {status && (
              <span className={`inline-block h-2 w-2 rounded-full ${status === 'processing' ? 'bg-amber-400' : 'bg-emerald-500'}`}></span>
            )}
          </div>
          <button 
            onClick={handleCopy}
            className="text-neutral-500 hover:text-neutral-400 focus:outline-none"
            aria-label="Copy command"
          >
            {copied ? 
              <Check className="h-4 w-4 text-green-500" /> : 
              <Copy className="h-4 w-4" />
            }
          </button>
        </div>
      )}
      
      {/* Copy button without header */}
      {!showHeader && (
        <div className="flex justify-end h-9 px-4 bg-neutral-900 dark:bg-black">
          <button 
            onClick={handleCopy}
            className="text-neutral-500 hover:text-neutral-400 focus:outline-none"
            aria-label="Copy command"
          >
            {copied ? 
              <Check className="h-4 w-4 text-green-500" /> : 
              <Copy className="h-4 w-4" />
            }
          </button>
        </div>
      )}
      
      {/* Command and output */}
      <div className="overflow-hidden relative">
        <div 
          ref={contentRef}
          className="overflow-auto transition-all bg-neutral-900 dark:bg-black" 
          style={{ maxHeight: expanded ? 'none' : maxHeight }}
        >
          <div className="p-4 text-white font-mono text-sm">
            <div className="flex">
              <span className="text-green-400 mr-2">$</span>
              <span>{command}</span>
            </div>
            
            {/* Command output if available */}
            {output && (
              <div className="mt-2 text-neutral-300 whitespace-pre-wrap text-xs leading-relaxed overflow-x-auto">
                {output}
              </div>
            )}
          </div>
        </div>
        
        {isOverflowing && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center bg-neutral-800/50 dark:bg-black/50 py-1 backdrop-blur-sm">
            <Button 
              onClick={() => setExpanded(true)} 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              <ChevronDown className="h-3 w-3 text-white" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 