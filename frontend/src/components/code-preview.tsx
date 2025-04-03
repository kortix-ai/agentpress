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
  isSecondaryView?: boolean;
  viewMode?: 'diff' | 'original' | 'modified';
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
  textSize = "xs",
  isSecondaryView = false,
  viewMode
}: CodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const [isPageSticky, setIsPageSticky] = useState(false);
  
  // Use a different default height when in secondary view
  const effectiveMaxHeight = isSecondaryView ? 2000 : maxHeight;
  
  // Check if content overflows and needs a "show more" button
  useEffect(() => {
    if (codeContainerRef.current) {
      // When in secondary view, we still want to check for overflow but against a larger threshold
      setIsOverflowing(codeContainerRef.current.scrollHeight > effectiveMaxHeight);
    }
  }, [content, effectiveMaxHeight]);
  
  // Track when component top or bottom reaches top of viewport
  useEffect(() => {
    const component = componentRef.current;
    if (!component) return;
    
    console.log('🔍 TRACKING INITIALIZED FOR CODE PREVIEW', { fileName });
    
    // State variables to track if positions have been logged
    let topHasHitViewportTop = false;
    let bottomHasHitViewportTop = false;
    
    // Function to run on scroll
    const handleScroll = () => {
      if (!component) return;
      
      const rect = component.getBoundingClientRect();
      const headerHeight = 36; // height of header (h-9 = 36px)
      
      // Debug every few pixels of movement
      if (Math.floor(rect.top) % 50 === 0) {
        console.log(`Component position: top=${Math.floor(rect.top)}, bottom=${Math.floor(rect.bottom)}`);
      }
      
      // Check if top of component hits position below header
      if (rect.top <= 70 && rect.top >= 50 && !topHasHitViewportTop) {
        console.log('🔴 TOP OF CODE PREVIEW HIT POSITION BELOW HEADER', {
          exactTopPosition: rect.top,
          timestamp: new Date().toISOString(),
          fileName
        });
        topHasHitViewportTop = true;
        // Enable page sticky header
        setIsPageSticky(true);
      } else if (rect.top < 30 || rect.top > 90) {
        topHasHitViewportTop = false;
      }
      
      // Check if bottom of component hits position below header
      if (rect.bottom <= 70 && rect.bottom >= 50 && !bottomHasHitViewportTop) {
        console.log('🔵 BOTTOM OF CODE PREVIEW HIT POSITION BELOW HEADER', {
          exactBottomPosition: rect.bottom,
          timestamp: new Date().toISOString(),
          fileName
        });
        bottomHasHitViewportTop = true;
        // Disable page sticky header when bottom crosses
        setIsPageSticky(false);
      } else if (rect.bottom < 30 || rect.bottom > 90) {
        bottomHasHitViewportTop = false;
      }
      
      // Additional dynamic sticky state management
      // Header should be sticky when the component is partially visible
      if (rect.top <= 60 && rect.bottom >= 60 + headerHeight) {
        setIsPageSticky(true);
      } else {
        setIsPageSticky(false);
      }
    };
    
    // Use RAF for smoother tracking
    let rafId: number | null = null;
    
    const smoothScrollHandler = () => {
      handleScroll();
      rafId = window.requestAnimationFrame(smoothScrollHandler);
    };
    
    // Start tracking
    rafId = window.requestAnimationFrame(smoothScrollHandler);
    
    // Also listen to regular scroll events as backup
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', handleScroll);
      console.log('🛑 TRACKING STOPPED FOR CODE PREVIEW', { fileName });
    };
  }, [fileName]);
  
  // Add scroll event listener to handle sticky header behavior
  useEffect(() => {
    const codeContainer = codeContainerRef.current;
    if (!codeContainer) return;
    
    const handleScroll = () => {
      if (codeContainer.scrollTop > 0) {
        setIsHeaderSticky(true);
      } else {
        setIsHeaderSticky(false);
      }
    };
    
    codeContainer.addEventListener('scroll', handleScroll);
    return () => {
      codeContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
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
    <div 
      ref={componentRef} 
      className={`flex flex-col overflow-hidden ${isSecondaryView 
        ? 'border-0 rounded-t-md' 
        : 'border border-neutral-200/40 dark:border-neutral-800/40 rounded-md'}`}
    >
      {/* Code content with syntax highlighting */}
      <div className="overflow-hidden relative">
        <div 
          ref={codeContainerRef} 
          className={`overflow-auto transition-all bg-neutral-50 dark:bg-neutral-900 custom-scrollbar ${isSecondaryView ? 'mt-0 pt-0' : ''}`}
          style={{ 
            maxHeight: expanded ? 'none' : effectiveMaxHeight,
            height: isSecondaryView ? '100%' : 'auto'
          }}
        >
          <div 
            ref={headerRef}
            className={`flex items-center justify-between h-9 px-4 transition-all duration-100 ${
              isHeaderSticky ? 'sticky top-0 z-10 bg-neutral-100/100 dark:bg-neutral-900/100' : 
                               'bg-neutral-100/50 dark:bg-neutral-900/100'
            } ${
              isPageSticky ? 'fixed z-20 bg-neutral-100/100 dark:bg-neutral-900/100 border border-neutral-200/40 dark:border-neutral-800/40 rounded-t-md' : ''
            } ${
              isSecondaryView ? 'border-0 border-b border-neutral-200/40 dark:border-neutral-800/40 mt-0 pt-0 rounded-t-md' : 'border-b border-neutral-200/40 dark:border-neutral-800/40'
            }`}
            style={isPageSticky ? {
              top: '55px',
              left: componentRef.current?.getBoundingClientRect().left + 'px',
              width: componentRef.current?.offsetWidth + 'px'
            } : {}}
          >
            <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
              {fileName && getFileIcon(fileName)}
              {fileName && <span className="font-normal text-xs">{fileName}</span>}
              {status && (
                <span className={`inline-block h-1 w-1 rounded-full ${status === 'processing' ? 'bg-amber-400' : 'bg-green-500'}`}></span>
              )}
              {viewMode && (
                <span className="text-xs ml-2 px-2 py-0.5 bg-neutral-200/50 dark:bg-neutral-800/50 rounded">
                  {viewMode === 'diff' ? 'Diff View' : viewMode === 'original' ? 'Original' : 'Modified'}
                </span>
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
          <div className="absolute bottom-0 left-0 right-0 flex justify-center bg-neutral-100/50 dark:bg-neutral-900/50 py-[0.5px]">
            <Button 
              onClick={() => setExpanded(true)} 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              <ChevronDown className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 