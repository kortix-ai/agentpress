import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import '@/styles/markdown.css';
import { renderToString } from 'react-dom/server';

// Instead of importing 'diff', let's create a simple custom diff function
// This avoids the need for an external dependency

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

// Simple implementation of diff
function simpleDiff(oldStr: string, newStr: string): DiffPart[] {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const result: DiffPart[] = [];
  
  // Find added and removed lines (very basic implementation)
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  
  // Find removed lines
  oldLines.forEach(line => {
    if (!newSet.has(line)) {
      result.push({ value: line + '\n', removed: true });
    } else {
      result.push({ value: line + '\n' });
    }
  });
  
  // Find added lines
  newLines.forEach(line => {
    if (!oldSet.has(line) && !result.some(part => part.value.trim() === line)) {
      result.push({ value: line + '\n', added: true });
    }
  });
  
  return result.sort((a, b) => {
    if (a.removed && !b.removed) return -1;
    if (!a.removed && b.removed) return 1;
    if (a.added && !b.added) return 1;
    if (!a.added && b.added) return -1;
    return 0;
  });
}

interface MarkdownViewProps {
  title?: string;
  originalContent?: string;
  modifiedContent?: string;
  showDiff?: boolean;
}

// Mock content for preview purposes
const MOCK_ORIGINAL = `# Original Document

This is the original version of the document.

## Introduction

This project aims to solve a specific problem by implementing a solution.

## Implementation

\`\`\`javascript
function originalFunction() {
  console.log("This is the original implementation");
}
\`\`\`
`;

const MOCK_MODIFIED = `# Modified Document

This is the modified version of the document.

## Introduction

This project aims to solve a specific problem by implementing an optimized solution.

## Implementation

\`\`\`javascript
function improvedFunction() {
  console.log("This is the improved implementation");
  return true;
}
\`\`\`

## Additional Section

This section was added to provide more context.
`;

// Simple diff formatting component
function DiffView({ original, modified }: { original: string, modified: string }) {
  const [diffContent, setDiffContent] = useState<string>('');
  
  useEffect(() => {
    // Generate diff
    const diff = simpleDiff(original, modified);
    
    // Format diff as markdown with added/removed content highlighted
    const formattedDiff = diff.map(part => {
      // Render markdown to HTML string using server-side rendering function
      const htmlContent = renderToString(<ReactMarkdown>{part.value}</ReactMarkdown>);
      
      // Wrap with the appropriate styling
      if (part.added) {
        return `<div class="bg-green-400/20 border-l-4 border-green-500 pl-2 my-1 prose prose-invert prose-sm max-w-none novel-prose">${htmlContent}</div>`;
      }
      if (part.removed) {
        return `<div class="bg-red-400/20 border-l-4 border-red-500 pl-2 my-1 prose prose-invert prose-sm max-w-none novel-prose">${htmlContent}</div>`;
      }
      return `<div class="text-zinc-400 prose prose-invert prose-sm max-w-none novel-prose">${htmlContent}</div>`;
    }).join('');
    
    setDiffContent(formattedDiff);
  }, [original, modified]);
  
  return (
    <div 
      className="prose prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: diffContent }}
    />
  );
}

// Markdown viewer component using ReactMarkdown
function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none novel-prose">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function MarkdownView({ 
  title, 
  originalContent = MOCK_ORIGINAL,
  modifiedContent = MOCK_MODIFIED,
  showDiff = false 
}: MarkdownViewProps) {
  const [viewMode, setViewMode] = useState<'original' | 'modified' | 'diff'>('original');
  
  // Set initial view mode to diff if showDiff is true
  useEffect(() => {
    if (showDiff) {
      setViewMode('diff');
    }
  }, [showDiff]);
  
  // Determine which content to display based on view mode
  const displayContent = viewMode === 'original' 
    ? originalContent 
    : viewMode === 'modified' 
      ? modifiedContent 
      : originalContent;

  return (
    <div className="h-full flex flex-col bg-zinc-50 text-white">
      {/* Header section */}
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center">
        <div className="text-zinc-400 text-sm font-medium">
          {title || 'Markdown View'}
        </div>
      </div>
      
      {/* Tab navigation with blurred background */}
      <div className="px-4 py-2 backdrop-blur-sm bg-zinc-50 border-b border-zinc-800/50 sticky top-0 z-10">
        <div className="flex justify-end space-x-2">
          <button 
            onClick={() => setViewMode('original')}
            className={`px-3 py-1 text-xs rounded-full ${viewMode === 'original' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            Original
          </button>
          <button 
            onClick={() => setViewMode('modified')}
            className={`px-3 py-1 text-xs rounded-full ${viewMode === 'modified' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            Modified
          </button>
          <button 
            onClick={() => setViewMode('diff')}
            className={`px-3 py-1 text-xs rounded-full ${viewMode === 'diff' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            Diff
          </button>
        </div>
      </div>
      
      {/* Content area */}
      <div className="flex-1 p-4 overflow-auto">
        {viewMode === 'diff' ? (
          <DiffView original={originalContent} modified={modifiedContent} />
        ) : (
          <MarkdownViewer content={displayContent} />
        )}
      </div>
    </div>
  );
} 