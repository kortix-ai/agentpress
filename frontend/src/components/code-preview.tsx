import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, ChevronDown, File, FileCode, FileText, Terminal, FileJson, Package, Image, FileArchive } from 'lucide-react';
import { Highlight, themes, Language, type PrismTheme } from 'prism-react-renderer';
import { Button } from '@/components/ui/button';

interface CodePreviewProps {
  content: string;
  fileName?: string;
  language?: string;
  maxHeight?: number;
  status?: 'processing' | 'complete';
  theme?: PrismTheme;
  lineNumbersClassName?: string;
  lineNumbersBg?: string;
  textSize?: 'xs' | 'sm' | 'base';
}

type SupportedLanguage = Language | 'plaintext';

// Get file icon based on file extension
const getFileIcon = (fileName?: string) => {
  if (!fileName) return <File className="h-4 w-4" />;
  
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx') || fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
    return <FileCode className="h-4 w-4" />;
  }
  if (fileName.endsWith('.json')) {
    return <FileJson className="h-4 w-4" />;
  }
  if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
    return <FileText className="h-4 w-4" />;
  }
  if (fileName.endsWith('.sh')) {
    return <Terminal className="h-4 w-4" />;
  }
  if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.gif')) {
    return <Image className="h-4 w-4" />;
  }
  if (fileName.endsWith('.zip') || fileName.endsWith('.tar') || fileName.endsWith('.gz')) {
    return <FileArchive className="h-4 w-4" />;
  }
  if (fileName.endsWith('.py')) {
    return <Package className="h-4 w-4" />;
  }
  if (fileName.endsWith('.html')) {
    return <FileCode className="h-4 w-4" />;
  }
  
  return <File className="h-4 w-4" />;
};

export function CodePreview({ 
  content, 
  fileName, 
  language, 
  maxHeight = 300, 
  status,
  theme = themes.nightOwl,
  lineNumbersClassName = "text-neutral-500 opacity-50",
  lineNumbersBg = "",
  textSize = "xs"
}: CodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  
  // Check if content overflows and needs a "show more" button
  useEffect(() => {
    if (codeContainerRef.current) {
      setIsOverflowing(codeContainerRef.current.scrollHeight > maxHeight);
    }
  }, [content, maxHeight]);
  
  // Determine language from filename if not provided
  const getLanguageFromFileName = (filename?: string): SupportedLanguage => {
    if (!filename) return 'plaintext';
    
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'jsx';
    if (filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.tsx')) return 'tsx';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.sh')) return 'bash';
    
    return 'plaintext';
  };
  
  const displayLanguage = language ? (language as SupportedLanguage) : getLanguageFromFileName(fileName);
  const languageForHighlight: Language = displayLanguage === 'plaintext' ? 'markup' : displayLanguage as Language;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden">
      {/* Code content with syntax highlighting */}
      <div className="overflow-hidden relative">
        <div 
          ref={codeContainerRef} 
          className="overflow-auto transition-all bg-neutral-50 dark:bg-neutral-900" 
          style={{ maxHeight: expanded ? 'none' : maxHeight }}
        >
          <div className="flex items-center justify-between h-9 px-4 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
              {fileName && getFileIcon(fileName)}
              {fileName && <span className="font-normal text-xs">{fileName}</span>}
              {status && (
                <span className={`inline-block h-1 w-1 rounded-full ${status === 'processing' ? 'bg-amber-400' : 'bg-green-500'}`}></span>
              )}
            </div>
            <button 
              onClick={handleCopy}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 focus:outline-none"
              aria-label="Copy code"
            >
              {copied ? 
                <Check className="h-4 w-4 text-green-500" /> : 
                <Copy className="h-4 w-4" />
              }
            </button>
          </div>
          <Highlight
            theme={theme}
            code={content}
            language={languageForHighlight}
          >
            {({ tokens, getLineProps, getTokenProps }) => (
              <pre className={`p-4 m-0 text-${textSize}`}>
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    <span className={`inline-block w-8 mr-2 text-right select-none text-xs ${lineNumbersClassName}`} style={lineNumbersBg ? { backgroundColor: lineNumbersBg } : {}}>
                      {i + 1}
                    </span>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>
        
        {isOverflowing && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center bg-neutral-100/50 dark:bg-neutral-800/50 py-[0.5px] backdrop-blur-sm">
            <Button 
              onClick={() => setExpanded(true)} 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 